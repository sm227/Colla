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
  
  // 사용자 인증 및 프로젝트 확인 로직
  useEffect(() => {
    // 로그인하지 않은 경우 로그인 페이지로 이동
    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    // 자동 리디렉션 로직 제거 - 이제 사용자는 이미 프로젝트가 있어도 
    // 새 프로젝트 페이지에 접근하여 추가 프로젝트를 생성할 수 있음
  }, [user, router]);
  
  // 로그인하지 않은 경우 또는 프로젝트 로딩 중인 경우 로딩 표시
  if (!user || projectsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <div className="text-3xl font-bold text-blue-600 flex items-center">
              <LayoutDashboardIcon className="w-8 h-8 mr-2" />
              워크스페이스
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            새 프로젝트 생성
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            새 프로젝트를 생성하여 작업을 관리하세요
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
              <p>{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                프로젝트 이름 *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="프로젝트 이름을 입력하세요"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                설명 (선택사항)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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