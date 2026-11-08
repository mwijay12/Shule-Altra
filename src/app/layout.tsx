import type {Metadata} from 'next';
import './globals.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import { FirebaseClientProvider } from '@/firebase';
import { ClientGuard } from '@/components/system/client-guard';

export const metadata: Metadata = {
  title: 'Shule Altra — school management for Tanzanian secondary schools',
  description: 'One register for learners, fees, NECTA results, attendance and the documents a school signs. Built for O-level secondary schools in Tanzania.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">

      <body className="font-body antialiased bg-background text-foreground">
        <ClientGuard />
        <FirebaseClientProvider>
          {children}
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
