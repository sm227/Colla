"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useProject } from "@/app/contexts/ProjectContext";
import { useAuth } from "@/app/contexts/AuthContext";
import Link from "next/link";
import { 
  HomeIcon, 
  ArrowLeftIcon, 
  Trello, 
  PlusIcon, 
  FolderIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  ClockIcon,
  SearchIcon,
  LayoutDashboardIcon,
  BellIcon,
  SettingsIcon,
  CalendarIcon,
  FileTextIcon,
  UsersIcon,
  VideoIcon,
  BarChart3Icon,
  StarIcon,
  XIcon,
  UserIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
  MenuIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useNotifications } from "@/app/contexts/NotificationContext";

// 통합 사이드바 컴포넌트 임포트
import Sidebar from "@/components/Sidebar";

// SidebarLink 컴포넌트는 통합 사이드바에서 처리됨

// useSearchParams를 사용하는 컴포넌트를 별도로 분리
function KanbanPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { user, loading: authLoading, logout } = useAuth();
  const { 
    projects, 
    currentProject, 
    setCurrentProject,
    loading: projectLoading,
    hasProjects
  } = useProject();
  const { showNotificationPanel, setShowNotificationPanel, hasNewNotifications } = useNotifications();
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isKanbanSubmenuOpen, setIsKanbanSubmenuOpen] = useState(true); // 칸반 하위 메뉴 상태
  const [mounted, setMounted] = useState(false);
  
  // 테마 관련 코드 수정 (next-themes 사용)
  const { theme: currentTheme, setTheme } = useTheme();
  
  // theme 값 계산
  const theme = (currentTheme || 'dark') as 'light' | 'dark';

  // next-themes hydration 처리를 위한 mounted 상태 추가
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth/login");
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

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

  // hydration mismatch 방지
  if (!mounted) {
    return null;
  }

  // 로딩 중일 때
  if (authLoading || projectLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-background text-foreground`}>
        <div className="text-center flex flex-col items-center">
          <div className={`relative w-24 h-24 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-16 h-16 border-4 border-current border-solid rounded-full opacity-20 ${theme === 'dark' ? 'border-blue-500' : 'border-blue-600'}`}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-16 h-16 border-4 border-current border-solid rounded-full border-t-transparent animate-spin`}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>C</span>
            </div>
          </div>
          <p className={`mt-6 text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>칸반보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자 정보가 없거나 프로젝트 정보 로딩 중일 때 리디렉션
  if (!authLoading && !user) {
    router.push("/auth/login?callbackUrl=/kanban");
    return null;
  }

  if (!authLoading && !projectLoading && user && !hasProjects) {
    router.push("/projects/new");
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* 통합 사이드바 */}
      <Sidebar
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        currentPage="kanban"
      />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 모바일 헤더 */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-background">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MenuIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-black dark:bg-blue-600 rounded-lg flex items-center justify-center mr-2">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">Colla</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              className={`relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                hasNewNotifications ? 'notification-bounce' : ''
              }`}
              title="알림"
            >
              <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              {hasNewNotifications && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <UserIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <main className="flex flex-col flex-1 p-6 lg:p-8 overflow-y-auto bg-background">
          {/* 페이지 헤더 */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 flex items-center">
              <Trello className="w-8 h-8 text-gray-600 dark:text-gray-400 mr-3" />
              칸반보드
            </h2>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {currentProjectName}의 작업을 시각적으로 관리하세요
            </p>
          </div>

          {/* 칸반보드 위젯 */}
          <div className="rounded-xl shadow-sm bg-white dark:bg-[#2a2a2c] p-6 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {currentProjectName} 칸반보드
                </h3>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <KanbanBoard projectId={selectedProjectId} theme={theme} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Suspense로 감싼 메인 컴포넌트
export default function KanbanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center flex flex-col items-center">
          <div className="relative w-24 h-24 text-blue-500">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-current border-solid rounded-full opacity-20"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-current border-solid rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-blue-500">C</span>
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-gray-300">칸반보드 로딩 중...</p>
        </div>
      </div>
    }>
      <KanbanPageContent />
    </Suspense>
  );
}