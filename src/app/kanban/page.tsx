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
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
    } else if (currentProject) {
      // 파라미터가 없는 경우 현재 컨텍스트의 프로젝트 사용
      setSelectedProjectId(currentProject.id);
    }
  }, [projectIdParam, currentProject]);

  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
    // 프로젝트 변경 시 URL 업데이트
    if (projectId) {
      router.push(`/kanban?projectId=${projectId}`);
    } else {
      router.push('/kanban');
    }
  };

  const currentProjectName = selectedProjectId 
    ? projects.find(p => p.id === selectedProjectId)?.name || "프로젝트" 
    : "모든 프로젝트";

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* 상단 네비게이션 바 */}
      <div className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
              <HomeIcon className="w-5 h-5" />
            </Link>
            <span className="text-gray-500">/</span>
            <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
              워크스페이스
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900 font-medium">{currentProjectName} 칸반보드</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/')}
              className="flex items-center space-x-1"
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
          <Trello className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold">칸반보드</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <ProjectSelector 
            selectedProjectId={selectedProjectId}
            onSelectProject={handleSelectProject}
          />
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <KanbanBoard projectId={selectedProjectId} />
        </div>
      </div>
    </div>
  );
} 