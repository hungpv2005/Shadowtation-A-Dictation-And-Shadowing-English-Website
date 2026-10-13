import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shadowtation - Dictation & Shadowing English',
  description: 'Nền tảng học tiếng Anh bằng Dictation và Shadowing',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
