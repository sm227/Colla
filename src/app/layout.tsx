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

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'colla - 협업 플랫폼',
  description: '팀 협업을 위한 올인원 플랫폼',
  keywords: ['colla', '콜라', '협업툴', '워크스페이스', '그룹웨어', '콜라 협업', '콜라 사이트', '프로젝트 관리리', '생산성'],
  verification: {
    google: 'DCHtzHquxEDqg642zkpMh2OTvt6xOdW-GlgvsmuCHlI', // content 값만 넣기
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
                  <SpeedInsights/>
                  {children}
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
