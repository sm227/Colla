"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboardIcon, 
  PlusIcon,
  Loader2Icon
} from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useProject } from "@/app/contexts/ProjectContext";

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useProject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // 사용자 인증 확인 로직
  useEffect(() => {
    // 로그인하지 않은 경우 로그인 페이지로 이동
    if (!user && !projectsLoading) {
      router.push('/auth/login');
      return;
    }
  }, [user, projectsLoading, router]);
  
  // 로그인하지 않은 경우 또는 프로젝트 로딩 중인 경우 로딩 표시
  if (!user || projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-500 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("프로젝트 이름을 입력해주세요.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError("");
      
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "프로젝트 생성 중 오류가 발생했습니다.");
      }
      
      // 강제로 홈페이지로 이동 - window.location 사용
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-500 flex items-center">
              <LayoutDashboardIcon className="w-8 h-8 mr-2" />
              Colla
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">
            새 프로젝트 생성
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            새 프로젝트를 생성하여 작업을 관리하세요
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-950/50 border-l-4 border-red-500 dark:border-red-600 p-4 text-red-700 dark:text-red-300">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                프로젝트 이름 *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                placeholder="프로젝트 이름을 입력하세요"
              />
            </div>

            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
                설명 (선택사항)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-md shadow-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="animate-spin w-4 h-4 mr-2" />
                  생성 중...
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4 mr-2" />
                  프로젝트 생성
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 