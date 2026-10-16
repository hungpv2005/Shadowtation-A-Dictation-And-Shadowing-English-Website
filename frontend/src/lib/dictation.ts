export type DiffKind = 'correct' | 'substitution' | 'omission' | 'insertion';

export interface DiffToken {
  reference: string;
  submitted: string;
  kind: DiffKind;
}

export interface DictationScore {
  wer: number;
  accuracy: number;
  tokens: DiffToken[];
}

export function tokenize(value: string): string[] {
  return value
    .normalize('NFC')
    .toLocaleLowerCase('en-US')
    .replace(/[.,!?;:()[\]{}“”"…]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function compareDictation(referenceText: string, submittedText: string): DictationScore {
  const reference = tokenize(referenceText);
  const submitted = tokenize(submittedText);
  const rows = reference.length + 1;
  const cols = submitted.length + 1;
  const cost = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  const back = Array.from({ length: rows }, () => Array<'match' | 'substitution' | 'omission' | 'insertion'>(cols).fill('match'));

  for (let i = 1; i < rows; i++) { cost[i][0] = i; back[i][0] = 'omission'; }
  for (let j = 1; j < cols; j++) { cost[0][j] = j; back[0][j] = 'insertion'; }
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (reference[i - 1] === submitted[j - 1]) {
        cost[i][j] = cost[i - 1][j - 1];
        back[i][j] = 'match';
      } else {
        const choices = [
          { value: cost[i - 1][j - 1] + 1, op: 'substitution' as const },
          { value: cost[i - 1][j] + 1, op: 'omission' as const },
          { value: cost[i][j - 1] + 1, op: 'insertion' as const },
        ];
        const best = choices.reduce((a, b) => b.value < a.value ? b : a);
        cost[i][j] = best.value;
        back[i][j] = best.op;
      }
    }
  }

  const aligned: DiffToken[] = [];
  let i = reference.length;
  let j = submitted.length;
  while (i || j) {
    const op = back[i][j];
    if (i && j && (op === 'match' || op === 'substitution')) {
      aligned.push({ reference: reference[i - 1], submitted: submitted[j - 1], kind: op === 'match' ? 'correct' : 'substitution' });
      i--; j--;
    } else if (i && (!j || op === 'omission')) {
      aligned.push({ reference: reference[i - 1], submitted: '', kind: 'omission' });
      i--;
    } else {
      aligned.push({ reference: '', submitted: submitted[j - 1], kind: 'insertion' });
      j--;
    }
  }
  aligned.reverse();

  const errors = cost[reference.length][submitted.length];
  const wer = reference.length ? errors / reference.length : (submitted.length ? 1 : 0);
  return { wer, accuracy: Math.max(0, Math.round((1 - wer) * 100)), tokens: aligned };
}

export function hintPenalty(level: number, penalties: number[] = [0, 5, 10, 20]): number {
  return penalties[Math.min(Math.max(level, 0), 3)] ?? [0, 5, 10, 20][Math.min(Math.max(level, 0), 3)];
}

export function maskedHint(reference: string, level: number): string {
  const words = reference.split(/\s+/);
  if (level === 1) return words.map((word) => word.replace(/[A-Za-z]/, (letter) => `${letter}…`)).join(' ');
  if (level === 2) return words.map((word, index) => index < 2 ? word : word.replace(/[A-Za-z]/, (letter) => `${letter}…`)).join(' ');
  return words.map((word, index) => index < 3 ? word : '＿'.repeat(Math.min(word.length, 12))).join(' ');
}
