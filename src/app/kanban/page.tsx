"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useProject } from "@/app/contexts/ProjectContext";
import Link from "next/link";
import { HomeIcon, ArrowLeftIcon, Trello, PlusIcon, FolderIcon, ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KanbanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { projects } = useProject();
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  
  // 로컬 스토리지에서 테마 설정 불러와서 초기값으로 사용
  const savedTheme = typeof window !== 'undefined' ? 
    (localStorage.getItem('theme') as 'light' | 'dark') : null;
  const [theme, setTheme] = useState<"light" | "dark">(savedTheme || "dark");
  
  // 테마 설정을 위한 효과
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // document.body의 클래스를 변경하여 전체 스타일 적용 가능
      if (theme === 'dark') {
        document.documentElement.classList.add('dark-mode');
      } else {
        document.documentElement.classList.remove('dark-mode');
      }
    }
  }, [theme]);

  // 드롭다운 메뉴 외부 클릭 시 닫히도록 이벤트 핸들러 등록
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // 드롭다운 메뉴 외부를 클릭한 경우 닫기
      if (!target.closest('.project-dropdown') && showProjectDropdown) {
        setShowProjectDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC 키 눌렀을 때 드롭다운 닫기
      if (event.key === 'Escape' && showProjectDropdown) {
        setShowProjectDropdown(false);
      }
    };

    // 이벤트 리스너 등록 및 정리
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProjectDropdown]);

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
    setShowProjectDropdown(false);
    
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
    <div className={`bg-${theme === 'dark' ? '[#1F1F21]' : 'gray-50'} min-h-screen`}>
      {/* 상단 네비게이션 바 */}
      <div className={`${theme === 'dark' ? 'bg-[#2A2A2C] border-gray-800' : 'bg-white border-gray-200'} border-b py-4 px-6`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className={`${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} transition-colors`}>
              <HomeIcon className="w-5 h-5" />
            </Link>
            <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>/</span>
            <Link href="/" className={`${theme === 'dark' ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} transition-colors`}>
              워크스페이스
            </Link>
            <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>/</span>
            <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-900'} font-medium`}>{currentProjectName} 칸반보드</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 프로젝트 선택 드롭다운 */}
            <div className="relative mr-3 project-dropdown">
              <div 
                className={`flex items-center px-3 py-1.5 text-sm ${theme === 'dark' ? 'bg-[#353538] border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700'} border rounded-md cursor-pointer hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              >
                <FolderIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mr-2`} />
                <span className="mr-1">{currentProjectName}</span>
                <ChevronDownIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>
              
              {/* 드롭다운 메뉴 */}
              {showProjectDropdown && (
                <div className={`absolute right-0 mt-1 w-64 ${theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700' : 'bg-white border-gray-200'} border rounded-md shadow-lg z-50 max-h-72 overflow-y-auto`}>
                  <div 
                    className={`px-3 py-2 hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} cursor-pointer flex items-center ${
                      selectedProjectId === null ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') : ''
                    }`}
                    onClick={() => handleSelectProject(null)}
                  >
                    <div className={`p-1 rounded-full ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'} mr-2`}>
                      <FolderIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                    </div>
                    <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>모든 작업</span>
                  </div>
                  
                  {/* 프로젝트 목록 */}
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={`px-3 py-2 hover:${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} cursor-pointer flex items-center ${
                        selectedProjectId === project.id ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') : ''
                      }`}
                      onClick={() => handleSelectProject(project.id)}
                    >
                      <div className={`p-1 rounded-full ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100'} mr-2`}>
                        <FolderIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`} />
                      </div>
                      <span className={`font-medium truncate ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{project.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 대시보드로 돌아가기 버튼 */}
            {theme === 'dark' ? (
              <button 
                onClick={() => router.push('/')}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-[#2A2A2C] border border-gray-700 text-gray-300 hover:bg-gray-700 rounded-md transition-colors duration-200"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-1" />
                <span>대시보드로 돌아가기</span>
              </button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/')}
                className="flex items-center space-x-1"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>대시보드로 돌아가기</span>
              </Button>
            )}
            
            {/* 새 보드 버튼 */}
            {theme === 'dark' ? (
              <button
                onClick={() => {
                  const url = selectedProjectId 
                    ? `/kanban/new?projectId=${selectedProjectId}` 
                    : '/kanban/new';
                  router.push(url);
                }}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-700 hover:bg-blue-600 text-white rounded-md transition-colors duration-200"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                <span>새 보드</span>
              </button>
            ) : (
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
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4">
        <div className="mb-6 flex items-center space-x-2">
          <Trello className={`w-6 h-6 ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`} />
          <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>칸반보드</h1>
        </div>
        
        <div className={`${theme === 'dark' ? 'bg-[#2A2A2C]' : 'bg-white'} rounded-lg shadow-sm p-6`}>
          <KanbanBoard projectId={selectedProjectId} theme={theme} />
        </div>
      </div>
    </div>
  );
} 