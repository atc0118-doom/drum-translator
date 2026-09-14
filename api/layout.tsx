import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DRUM Translator",
  description: "Voice translation terminal inspired by a fictional field translator."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
