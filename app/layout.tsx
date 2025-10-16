import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Flappy Bird - Next.js',
  description: 'A simple Flappy Bird clone built with Next.js and canvas',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
