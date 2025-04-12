// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { UserProvider } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';

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
    <html lang="ko">
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        <ThemeProvider>
          <AuthProvider>
            <ProjectProvider>
              <UserProvider>
                {children}
              </UserProvider>
            </ProjectProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
