// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { UserProvider } from './contexts/UserContext';
import { ChatButton } from '@/components/ChatButton';
import { ThemeProvider } from 'next-themes';
import { NotificationProvider } from './contexts/NotificationContext';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'Colla - 팀 협업 플랫폼',
    template: '%s | Colla'
  },
  description: 'Colla는 팀 협업을 위한 올인원 플랫폼입니다. 프로젝트 관리, 칸반보드, 문서 협업, 화상회의, 캘린더를 한 곳에서 사용하세요.',
  keywords: ['colla', '콜라', '협업툴', '워크스페이스', '그룹웨어', '콜라 협업', '콜라 사이트', '프로젝트 관리', '생산성', '팀협업', '업무관리'],
  authors: [{ name: 'Colla Team' }],
  creator: 'Colla',
  publisher: 'Colla',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://colla-peach.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Colla - 팀 협업 플랫폼',
    description: 'Colla는 팀 협업을 위한 올인원 플랫폼입니다. 프로젝트 관리, 칸반보드, 문서 협업, 화상회의, 캘린더를 한 곳에서 사용하세요.',
    url: 'https://colla-peach.vercel.app',
    siteName: 'Colla',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Colla - 팀 협업 플랫폼',
    description: 'Colla는 팀 협업을 위한 올인원 플랫폼입니다. 프로젝트 관리, 칸반보드, 문서 협업, 화상회의, 캘린더를 한 곳에서 사용하세요.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'DCHtzHquxEDqg642zkpMh2OTvt6xOdW-GlgvsmuCHlI',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ProjectProvider>
            <UserProvider>
              <ThemeProvider 
                attribute="class" 
                defaultTheme="dark" 
                enableSystem
              >
                <NotificationProvider>
                  {children}
                  <SpeedInsights/>
                  <Analytics />
                </NotificationProvider>
              </ThemeProvider>
              <ChatButton />
            </UserProvider>
          </ProjectProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
