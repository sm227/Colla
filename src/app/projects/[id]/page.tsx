"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboardIcon,
  Trello,
  FileTextIcon,
  ArrowLeftIcon
} from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useProject, Project } from "@/app/contexts/ProjectContext";

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { projects, currentProject, setCurrentProject, loading: projectLoading } = useProject();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 프로젝트 ID로 프로젝트 찾기
  useEffect(() => {
    if (!authLoading && !projectLoading && projects.length > 0) {
      const foundProject = projects.find(p => p.id === params.id);
      
      if (foundProject) {
        setProject(foundProject);
        setCurrentProject(foundProject);
      } else {
        // 프로젝트를 찾지 못했을 경우 홈으로 리디렉션
        router.push('/');
      }
      
      setIsLoading(false);
    }
  }, [authLoading, projectLoading, projects, params.id, router, setCurrentProject]);

  // 로딩 중이거나 인증되지 않은 경우
  if (authLoading || projectLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자가 없거나 프로젝트를 찾지 못한 경우
  if (!user || !project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center text-gray-500 hover:text-gray-700">
              <ArrowLeftIcon className="w-5 h-5 mr-1" />
              <span>대시보드로 돌아가기</span>
            </Link>
          </div>
        </div>
        
        {/* 프로젝트 제목 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
          {project.description && (
            <p className="mt-2 text-gray-600">{project.description}</p>
          )}
        </div>
        
        {/* 프로젝트 기능 메뉴 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer">
            <Trello className="w-12 h-12 text-purple-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">칸반보드</h2>
            <p className="mt-2 text-gray-600">
              프로젝트 작업을 관리하고 진행 상황을 추적하세요
            </p>
            <Link 
              href={`/kanban?projectId=${project.id}`}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              보드 열기
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer">
            <FileTextIcon className="w-12 h-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">문서</h2>
            <p className="mt-2 text-gray-600">
              프로젝트 문서와 정보를 관리하세요
            </p>
            <Link 
              href={`/documents?projectId=${project.id}`}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              문서 열기
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer">
            <LayoutDashboardIcon className="w-12 h-12 text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">대시보드</h2>
            <p className="mt-2 text-gray-600">
              프로젝트 현황과 통계를 확인하세요
            </p>
            <Link 
              href={`/dashboard?projectId=${project.id}`}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              대시보드 열기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 