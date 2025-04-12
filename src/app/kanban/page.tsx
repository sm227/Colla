"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ProjectSelector } from "@/components/kanban/ProjectSelector";
import { useProject } from "@/app/contexts/ProjectContext";
import Link from "next/link";
import { HomeIcon, ArrowLeftIcon, Trello, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KanbanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { currentProject, projects, loading: projectLoading } = useProject();

  // URL 쿼리 파라미터로부터 프로젝트 ID를 가져옴
  useEffect(() => {
    console.log("URL 쿼리 파라미터 projectIdParam:", projectIdParam);
    
    if (projectIdParam) {
      console.log("프로젝트 ID 파라미터 발견, 특정 프로젝트 선택:", projectIdParam);
      setSelectedProjectId(projectIdParam);
      // 현재 URL의 프로젝트 ID를 로컬 스토리지에 저장
      localStorage.setItem('lastSelectedKanbanProjectId', projectIdParam);
    } else {
      // 프로젝트 ID 파라미터가 없는 경우 모든 작업 표시
      console.log("프로젝트 ID 파라미터 없음: 모든 작업 표시 모드로 설정");
      setSelectedProjectId(null);
      localStorage.removeItem('lastSelectedKanbanProjectId');
    }
  }, [projectIdParam]);

  const handleSelectProject = (projectId: string | null) => {
    console.log("프로젝트 선택 변경:", projectId);
    
    // 프로젝트 ID 변경 시 상태를 즉시 업데이트
    setSelectedProjectId(projectId);
    
    // 선택한 프로젝트 ID를 로컬 스토리지에 저장
    if (projectId) {
      console.log("특정 프로젝트 선택:", projectId);
      localStorage.setItem('lastSelectedKanbanProjectId', projectId);
      router.replace(`/kanban?projectId=${projectId}`);
    } else {
      // 모든 작업을 선택한 경우 로컬 스토리지에서 삭제하고 쿼리 파라미터 없이 이동
      console.log("모든 작업 선택");
      localStorage.removeItem('lastSelectedKanbanProjectId');
      router.replace('/kanban');
    }
  };

  const currentProjectName = selectedProjectId 
    ? projects.find(p => p.id === selectedProjectId)?.name || "프로젝트" 
    : "모든 프로젝트";

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* 상단 네비게이션 바 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <HomeIcon className="w-5 h-5" />
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <Link href="/" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              워크스페이스
            </Link>
            <span className="text-gray-500 dark:text-gray-400">/</span>
            <span className="text-gray-900 dark:text-white font-medium">{currentProjectName} 칸반보드</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/')}
              className="flex items-center space-x-1 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>대시보드로 돌아가기</span>
            </Button>
            
            <Button 
              size="sm" 
              className="flex items-center space-x-1"
              onClick={() => {
                const url = selectedProjectId 
                  ? `/kanban/new?projectId=${selectedProjectId}` 
                  : '/kanban/new';
                router.push(url);
              }}
            >
              <PlusIcon className="w-4 h-4" />
              <span>새 보드</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex items-center space-x-2">
          <Trello className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">칸반보드</h1>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <ProjectSelector 
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
          />
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <KanbanBoard projectId={selectedProjectId} />
        </div>
      </div>
    </div>
  );
} 