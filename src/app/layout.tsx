import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Outfit } from 'next/font/google';
import './globals.css';
import { RealtimeProvider } from '@/components/RealtimeListener';

const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const fontDisplay = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'JuryPortal™ | Real-Time Hackathon Evaluation & Scoring',
  description: 'Executive-grade real-time scoring, live leaderboards, and rubric evaluation platform for premier hackathons.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${fontSans.variable} ${fontDisplay.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-[#04060B] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden">
        {/* Subtle Luxury Ambient Mesh Background */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl opacity-60" />
          <div className="absolute top-1/3 -left-48 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <RealtimeProvider>{children}</RealtimeProvider>
        </div>
      </body>
    </html>
  );
}
