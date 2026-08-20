import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { RealtimeProvider } from '@/components/RealtimeListener';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hackathon Jury Portal | Real-Time Evaluation & Scoring',
  description: 'Minimal & premium real-time scoring, leaderboard, and jury evaluation platform for college hackathons.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${fontSans.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-[#070a12] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
        <RealtimeProvider>{children}</RealtimeProvider>
      </body>
    </html>
  );
}
