"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

// 사용자 타입 정의
type User = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
} | null;

// 인증 컨텍스트 타입 정의
type AuthContextType = {
  user: User;
  loading: boolean;
  login: (email: string, password: string, callbackUrl?: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string, userId?: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
};

// 기본값으로 컨텍스트 생성
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updatePassword: async () => {},
  error: null,
  clearError: () => {},
});

// 인증 컨텍스트 제공자 컴포넌트
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // 오류 초기화 함수
  const clearError = () => setError(null);

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        // 로그인/회원가입 페이지에서는 사용자 정보를 가져오지 않음
        if (pathname === '/auth/login' || pathname === '/auth/register') {
          setLoading(false);
          return;
        }

        // 타임스탬프를 추가하여 캐시를 방지
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/auth/me?t=${timestamp}`, {
          method: 'GET',
          // 캐시 방지 설정 추가
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        // 응답 상태 코드를 확인하여 404 오류 처리
        if (response.status === 404) {
          console.error('API 엔드포인트를 찾을 수 없습니다: /api/auth/me');
          setUser(null);
          setLoading(false);
          
          // 인증이 필요한 페이지에 있고 로그인되지 않은 경우 로그인 페이지로 리디렉션
          if (pathname !== '/auth/login' && 
              pathname !== '/auth/register' && 
              !pathname.startsWith('/api/')) {
            // 단순한 경로만 callbackUrl로 설정
            router.push(`/auth/login?callbackUrl=${pathname}`);
          }
          return;
        }
        
        const data = await response.json();
        
        if (response.ok && data.authenticated) {
          setUser(data.user);
        } else {
          setUser(null);
          
          // 인증이 필요한 페이지에 있고 로그인되지 않은 경우 로그인 페이지로 리디렉션
          if (pathname !== '/auth/login' && 
              pathname !== '/auth/register' && 
              !pathname.startsWith('/api/')) {
            // 단순한 경로만 callbackUrl로 설정
            router.push(`/auth/login?callbackUrl=${pathname}`);
          }
        }
      } catch (err) {
        console.error('사용자 정보 조회 오류:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [pathname, router]);

  // 로그인 함수
  const login = async (email: string, password: string, callbackUrl = '/', rememberMe = false) => {
    try {
      setLoading(true);
      clearError();
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "로그인 중 오류가 발생했습니다.");
      }
      
      setUser(data.user);
      
      // 토큰을 localStorage에 저장 (API에서 반환한 경우)
      if (data.token && typeof window !== 'undefined') {
        localStorage.setItem('token', data.token);
      }
      
      // 로그인 성공 후 리디렉션
      // 콜백 URL이 auth를 포함하는 경우 홈으로 리디렉션
      const redirectUrl = callbackUrl.includes('auth') ? '/' : callbackUrl;
      
      setTimeout(() => {
        router.push(redirectUrl);
        router.refresh();
      }, 500); // 타임아웃 시간 증가
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 함수
  const register = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      clearError();
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "회원가입 중 오류가 발생했습니다.");
      }
      
      router.push("/auth/login?registered=true");
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃 함수
  const logout = async () => {
    try {
      setLoading(true);
      clearError();
      
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "로그아웃 중 오류가 발생했습니다.");
      }
      
      // localStorage에서 토큰 삭제
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      
      setUser(null);
      router.push("/auth/login");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 비밀번호 변경 함수
  const updatePassword = async (currentPassword: string, newPassword: string, userId?: string) => {
    try {
      setLoading(true);
      clearError();
      
      if (!user && !userId) {
        throw new Error("로그인이 필요합니다.");
      }
      
      // 요청 데이터 생성 - 인증 문제 대비 userId 포함
      const requestData = {
        currentPassword,
        newPassword,
        userId: userId || user?.id  // 인증이 실패해도 ID로 사용자 식별 가능
      };
      
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
        credentials: 'include'  // 쿠키 포함
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "비밀번호 변경 중 오류가 발생했습니다.");
      }
      
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updatePassword,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// 인증 컨텍스트 사용을 위한 훅
export function useAuth() {
  return useContext(AuthContext);
} 