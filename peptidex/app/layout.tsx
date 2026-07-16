import type { Metadata, Viewport } from 'next';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';

export const metadata: Metadata = {
  title: 'PEPTIDEX — Engineered Beyond Perfection',
  description:
    'PEPTIDEX. Science. Precision. Transformation. Research-grade peptides engineered beyond perfection for Fitness, Beauty and Longevity.',
  metadataBase: new URL('https://peptidex.example'),
  openGraph: {
    title: 'PEPTIDEX — Engineered Beyond Perfection',
    description: 'Science. Precision. Transformation.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
