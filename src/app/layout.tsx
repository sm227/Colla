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

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '워크스페이스 - 협업 플랫폼',
  description: '팀 협업을 위한 올인원 워크스페이스 플랫폼',
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
