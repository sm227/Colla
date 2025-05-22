"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { LayoutDashboardIcon, UserIcon, LockIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";

export default function LoginPage() {
  const searchParams = useSearchParams();
  // 콜백 URL이 복잡한 경우 기본값으로 홈 페이지 사용
  const callbackUrl = '/';
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const { login, error: authError } = useAuth();

  // 회원가입 성공 메시지 표시
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccess('회원가입이 완료되었습니다. 로그인해주세요.');
    }
  }, [searchParams]);

  // 인증 컨텍스트 오류 처리
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("이메일과 비밀번호를 모두 입력해주세요.");
      return;
    }
    
    try {
      setIsLoading(true);
      setError("");
      
      // 인증 컨텍스트의 로그인 함수 사용
      await login(email, password, callbackUrl);
      
      // 로그인 성공 메시지 표시
      setSuccess("로그인 성공! 대시보드로 이동합니다...");
    } catch (err) { // 명시적인 타입 에러로 변경
      if (err instanceof Error) {
        setError(err.message || "로그인 중 오류가 발생했습니다.");
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-primary flex items-center">
            <LayoutDashboardIcon className="w-8 h-8 mr-2" />
            워크스페이스
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900 dark:text-foreground">
          계정에 로그인하세요
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-muted-foreground">
          또는{" "}
          <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-primary dark:hover:text-primary-foreground">
            새 계정 만들기
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-destructive border-l-4 border-red-500 dark:border-destructive p-4 text-red-700 dark:text-destructive-foreground">
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 bg-green-50 dark:bg-secondary border-l-4 border-green-500 dark:border-secondary p-4 text-green-700 dark:text-secondary-foreground">
              <p>{success}</p>
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-muted-foreground">
                이메일
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserIcon className="h-5 w-5 text-gray-400 dark:text-muted-foreground" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-input rounded-md shadow-sm placeholder-gray-400 dark:placeholder-muted-foreground dark:bg-input dark:text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-primary dark:focus:border-primary"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-muted-foreground">
                비밀번호
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <LockIcon className="h-5 w-5 text-gray-400 dark:text-muted-foreground" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-input rounded-md shadow-sm placeholder-gray-400 dark:placeholder-muted-foreground dark:bg-input dark:text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-primary dark:focus:border-primary"
                  placeholder="••••••••"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500 dark:text-muted-foreground dark:hover:text-foreground focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 dark:text-primary focus:ring-blue-500 dark:focus:ring-primary border-gray-300 dark:border-input rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-muted-foreground">
                  로그인 상태 유지
                </label>
              </div>

              <div className="text-sm">
                <Link href="/auth/forgot-password" className="font-medium text-blue-600 hover:text-blue-500 dark:text-primary dark:hover:text-primary-foreground">
                  비밀번호를 잊으셨나요?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white dark:text-primary-foreground bg-blue-600 hover:bg-blue-700 dark:bg-primary dark:hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-background dark:focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "로그인 중..." : "로그인"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-card text-gray-500 dark:text-muted-foreground">또는 다음으로 계속</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-input rounded-md shadow-sm bg-white dark:bg-card text-sm font-medium text-gray-500 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary"
              >
                <span className="sr-only">Google로 로그인</span>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  {/* SVG path for Google icon */}
                  <path
                    d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.798-1.677-4.198-2.701-6.735-2.701-5.539 0-10.032 4.493-10.032 10.032s4.493 10.032 10.032 10.032c8.445 0 10.452-7.888 9.628-11.732h-9.628z"
                  />
                </svg>
              </button>

              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-input rounded-md shadow-sm bg-white dark:bg-card text-sm font-medium text-gray-500 dark:text-muted-foreground hover:bg-gray-50 dark:hover:bg-secondary"
              >
                <span className="sr-only">GitHub로 로그인</span>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  {/* SVG path for GitHub icon */}
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 