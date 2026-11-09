import type {Metadata} from 'next';
import './globals.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import { FirebaseClientProvider } from '@/firebase';
import { ClientGuard } from '@/components/system/client-guard';
import { ThemeProvider } from '@/components/admin/theme-provider';
import { ThemeScript } from '@/components/admin/theme-script';
import { COMPANY, PRODUCT } from '@/lib/company';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Shule Altra — school management, built by Altraware Technology',
    template: '%s · Shule Altra',
  },
  description:
    'One register for learners, fees, attendance, results and the documents a school signs. Role-scoped access, printable reports, Kiswahili and English. Built in Dar es Salaam by Altraware Technology.',
  applicationName: PRODUCT.name,
  authors: [{ name: COMPANY.name, url: COMPANY.website }],
  creator: COMPANY.name,
  publisher: COMPANY.name,
  keywords: [
    'school management system',
    'school fees management',
    'secondary school software',
    'NECTA results',
    'Tanzania',
    'East Africa',
    'mfumo wa shule',
    'Altraware Technology',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: PRODUCT.name,
    title: 'Shule Altra — one register for the whole school',
    description:
      'Learners, fees, attendance, results and signed documents in one place. Role-scoped access and printable reports. Built by Altraware Technology, Dar es Salaam.',
    url: '/',
    locale: 'en_TZ',
    alternateLocale: ['sw_TZ', 'en_GB', 'en_US'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shule Altra — one register for the whole school',
    description:
      'Learners, fees, attendance, results and signed documents in one place. Built by Altraware Technology.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  category: 'technology',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <ClientGuard />
        <FirebaseClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
