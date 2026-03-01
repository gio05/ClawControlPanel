import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import ThemeRegistry from '@/theme/ThemeRegistry';
import DemoBanner from '@/components/DemoBanner';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Mission Control',
  description: 'AI Agent Orchestration Dashboard',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={jetbrainsMono.className} style={{ minHeight: '100vh' }}>
        <ThemeRegistry>
          <DemoBanner />
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
