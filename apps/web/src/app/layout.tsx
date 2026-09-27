import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'SAATRAAI · Earth Intelligence Platform',
  description:
    'Satellite AI for Autonomous Temporal Reasoning and Analysis of Intelligence — evidence-driven Earth observation investigation platform with explicit falsification, missing-evidence detection, and auditable reasoning.',
  keywords: ['satellite', 'earth observation', 'geospatial AI', 'remote sensing', 'Sentinel', 'SIH2026'],
  openGraph: {
    title: 'SAATRAAI · Earth Intelligence Platform',
    description: 'Evidence-driven geospatial investigation powered by satellite AI',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-void text-ink">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
