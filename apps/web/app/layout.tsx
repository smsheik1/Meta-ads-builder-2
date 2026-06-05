import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ConvexClientProvider } from './ConvexClientProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wiggly Create',
  description: 'Make video ads from a website, voice clip, or generated script.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
