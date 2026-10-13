import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface WordScoreDetail {
  word: string;
  accuracy_score: number;
  error_type: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion';
}

export interface AssessmentResult {
  overall_score: number;
  accuracy_score: number;
  fluency_score: number;
  completeness_score: number;
  words_score_detail: WordScoreDetail[];
}

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Chuyển đổi file audio bất kỳ (webm, ogg, mp3, v.v.) sang WAV 16kHz Mono 16-bit PCM
   * Đây là định dạng tối ưu nhất theo khuyến nghị của Azure Speech SDK.
   */
  async convertToWav(inputBuffer: Buffer): Promise<Buffer> {
    const tempDir = os.tmpdir();
    const tempInput = path.join(tempDir, `input_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    const tempOutput = `${tempInput}.wav`;

    await fs.promises.writeFile(tempInput, inputBuffer);

    return new Promise((resolve, reject) => {
      ffmpeg(tempInput)
        .toFormat('wav')
        .audioFrequency(16000)
        .audioChannels(1)
        .audioCodec('pcm_s16le')
        .on('end', async () => {
          try {
            const wavBuffer = await fs.promises.readFile(tempOutput);
            await Promise.all([
              fs.promises.unlink(tempInput).catch(() => {}),
              fs.promises.unlink(tempOutput).catch(() => {}),
            ]);
            resolve(wavBuffer);
          } catch (err) {
            reject(err);
          }
        })
        .on('error', async (err) => {
          await Promise.all([
            fs.promises.unlink(tempInput).catch(() => {}),
            fs.promises.unlink(tempOutput).catch(() => {}),
          ]);
          this.logger.error(`FFmpeg convert error: ${err.message}`);
          reject(new BadRequestException('Không thể xử lý định dạng file âm thanh'));
        })
        .save(tempOutput);
    });
  }

  /**
   * Đánh giá phát âm bằng Azure Speech Pronunciation Assessment
   */
  async assessPronunciation(audioBuffer: Buffer, referenceText: string): Promise<AssessmentResult> {
    const key = this.configService.get<string>('AZURE_SPEECH_KEY');
    const region = this.configService.get<string>('AZURE_SPEECH_REGION');

    if (!key || !region) {
      throw new InternalServerErrorException('Azure Speech API chưa được cấu hình (thiếu AZURE_SPEECH_KEY hoặc AZURE_SPEECH_REGION)');
    }

    // 1. Chuẩn hóa audio sang WAV 16kHz Mono
    const wavBuffer = await this.convertToWav(audioBuffer);

    // 2. Cấu hình Azure Speech
    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechRecognitionLanguage = 'en-US';

    const audioConfig = sdk.AudioConfig.fromWavFileInput(wavBuffer);
    const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

    // 3. Cấu hình Pronunciation Assessment
    const pronunciationConfig = new sdk.PronunciationAssessmentConfig(
      referenceText,
      sdk.PronunciationAssessmentGradingSystem.HundredMark,
      sdk.PronunciationAssessmentGranularity.Word,
      true, // enable prosody/fluency
    );
    pronunciationConfig.applyTo(recognizer);

    // 4. Thực thi nhận diện và đánh giá
    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          try {
            if (result.reason === sdk.ResultReason.RecognizedSpeech) {
              const assessment = sdk.PronunciationAssessmentResult.fromResult(result);
              const jsonResultStr = result.properties.getProperty(
                sdk.PropertyId.SpeechServiceResponse_JsonResult,
              );
              const parsed = JSON.parse(jsonResultStr);

              const wordsDetail: WordScoreDetail[] = [];
              const nbest = parsed?.NBest?.[0];
              if (nbest?.Words) {
                for (const w of nbest.Words) {
                  const errorTypeStr = w.PronunciationAssessment?.ErrorType ?? 'None';
                  wordsDetail.push({
                    word: w.Word,
                    accuracy_score: Math.round(w.PronunciationAssessment?.AccuracyScore ?? 0),
                    error_type: errorTypeStr as WordScoreDetail['error_type'],
                  });
                }
              }

              resolve({
                overall_score: Math.round(assessment.pronunciationScore),
                accuracy_score: Math.round(assessment.accuracyScore),
                fluency_score: Math.round(assessment.fluencyScore),
                completeness_score: Math.round(assessment.completenessScore),
                words_score_detail: wordsDetail,
              });
            } else if (result.reason === sdk.ResultReason.NoMatch) {
              resolve({
                overall_score: 0,
                accuracy_score: 0,
                fluency_score: 0,
                completeness_score: 0,
                words_score_detail: [],
              });
            } else {
              this.logger.error(`Azure recognition error: ${result.errorDetails}`);
              reject(new BadRequestException(`Không nhận diện được giọng nói: ${result.errorDetails}`));
            }
          } catch (err) {
            this.logger.error(`Error parsing pronunciation result: ${err}`);
            reject(new InternalServerErrorException('Lỗi phân tích kết quả từ Azure Speech Service'));
          } finally {
            recognizer.close();
          }
        },
        (err) => {
          recognizer.close();
          this.logger.error(`Azure recognition promise error: ${err}`);
          reject(new InternalServerErrorException(err));
        },
      );
    });
  }

  /**
   * Kiểm tra cấu hình Azure Speech
   */
  healthCheck() {
    const key = this.configService.get<string>('AZURE_SPEECH_KEY');
    const region = this.configService.get<string>('AZURE_SPEECH_REGION');
    return {
      status: key && region ? 'configured' : 'missing_credentials',
      region: region ?? null,
      azure_configured: Boolean(key && region),
    };
  }
}
