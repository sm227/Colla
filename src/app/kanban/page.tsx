"use client";

import { useState, useEffect, useRef } from "react";
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

// shadcn/ui DropdownMenu 컴포넌트 임포트
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// SidebarLink 컴포넌트 (다른 페이지와 동일)
function SidebarLink({
  icon,
  text,
  href,
  active = false,
  small = false,
  onClick,
  theme = "dark", 
  badgeCount,
  isProject = false 
}: {
  icon: React.ReactNode;
  text: string;
  href: string;
  active?: boolean;
  small?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  theme?: "light" | "dark";
  badgeCount?: string | number;
  isProject?: boolean;
}) {
  const activeProjectBg = theme === 'dark' 
    ? 'bg-blue-900 bg-opacity-30' 
    : 'bg-blue-100 bg-opacity-50'; 
    
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-between px-2 py-1.5 ${small ? "text-sm" : "text-[15px]"} rounded-md transition-colors duration-150 ${
        theme === 'dark'
          ? active && isProject
            ? `${activeProjectBg} text-gray-300 hover:bg-gray-700 hover:text-gray-100` 
            : "text-gray-300 hover:bg-gray-700 hover:text-gray-100"
          : active && isProject
            ? `${activeProjectBg} text-gray-600 hover:bg-gray-200 hover:text-gray-900`
            : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
      }`}
    >
      <div className="flex items-center">
        <div className={`mr-2.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{icon}</div>
        <span>{text}</span>
      </div>
      {badgeCount && (
        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${badgeCount === 'new' ? (theme === 'dark' ? 'bg-red-500 text-white' : 'bg-red-500 text-white') : (theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700')}`}>
          {badgeCount === 'new' ? '' : badgeCount}
        </span>
      )}
    </Link>
  );
}

export default function KanbanPage() {
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
      {/* 사이드바 */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64  border-r border-gray-200 bg-background dark:border-gray-700 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:flex-shrink-0 flex flex-col`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-black dark:bg-blue-600 rounded-lg flex items-center justify-center mr-2">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">Colla</span>
          </div>
          <button
            className="md:hidden"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          >
            <XIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <nav className="flex-grow px-4 py-4 space-y-2 overflow-y-auto">
          <SidebarLink
            icon={<SearchIcon className="w-5 h-5" />}
            text="검색"
            href="#" 
            theme={theme}
            onClick={(e) => { e.preventDefault(); alert('검색 기능 구현 예정'); }}
          />
          <SidebarLink
            icon={<LayoutDashboardIcon className="w-5 h-5" />}
            text="대시보드"
            href="/"
            active={pathname === "/"}
            theme={theme}
          />
          
          <div className="pt-4">
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              프로젝트
            </h3>
            <nav className="mt-2 space-y-1">
              {projects.map((project) => (
                <SidebarLink
                  key={project.id}
                  icon={<FolderIcon className="w-5 h-5" />}
                  text={project.name}
                  href={`/kanban?projectId=${project.id}`}
                  small
                  active={currentProject?.id === project.id && pathname === "/kanban"}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentProject(project);
                    router.push(`/kanban?projectId=${project.id}`);
                  }}
                  theme={theme}
                  isProject={true}
                />
              ))}
              <SidebarLink
                icon={<PlusIcon className="w-5 h-5" />}
                text="새 프로젝트"
                href="/projects/new"
                active={pathname === "/projects/new"}
                theme={theme}
                small
                onClick={() => router.push("/projects/new")}
              />
            </nav>
          </div>

          <div className="pt-4">
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              내 작업 공간
            </h3>
            <div className="mt-2 space-y-1">
              <SidebarLink
                icon={<Trello className="w-5 h-5" />}
                text="칸반보드"
                href={currentProject ? `/kanban?projectId=${currentProject.id}` : "/kanban"}
                active={pathname?.startsWith("/kanban") || pathname?.startsWith("/timeline") || isKanbanSubmenuOpen}
                theme={theme}
                small
                onClick={(e) => {
                  e.preventDefault();
                  setIsKanbanSubmenuOpen(!isKanbanSubmenuOpen);
                  if (currentProject?.id && pathname && !pathname.includes(currentProject.id)) {
                    router.push(`/kanban?projectId=${currentProject.id}`);
                  } else if (!currentProject?.id && pathname && pathname !== "/kanban") {
                    router.push("/kanban");
                  }
                }}
              />
              
              {/* 칸반 하위 메뉴 */}
              {isKanbanSubmenuOpen && (
                <div className={`pl-4 pt-1 space-y-1 ml-2.5 transition-all duration-300 ease-in-out ${
                  isKanbanSubmenuOpen ? 'max-h-[20rem] opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="transform transition-all duration-300 ease-in-out" 
                       style={{ 
                         opacity: isKanbanSubmenuOpen ? 1 : 0, 
                         transform: isKanbanSubmenuOpen ? 'translateY(0)' : 'translateY(-10px)',
                         transition: 'opacity 300ms ease-in-out, transform 300ms ease-in-out'
                       }}>
                    <SidebarLink
                      icon={<Trello className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      text="칸반보드"
                      href={currentProject ? `/kanban?projectId=${currentProject.id}` : "/kanban"}
                      active={pathname?.startsWith("/kanban") && !pathname?.includes("/timeline")}
                      theme={theme}
                      small
                    />
                  </div>
                  
                  <div className="transform transition-all duration-300 ease-in-out" 
                       style={{ 
                         opacity: isKanbanSubmenuOpen ? 1 : 0, 
                         transform: isKanbanSubmenuOpen ? 'translateY(0)' : 'translateY(-10px)',
                         transition: 'opacity 300ms ease-in-out 100ms, transform 300ms ease-in-out 100ms'
                       }}>
                    <SidebarLink
                      icon={<ClockIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      text="타임라인"
                      href={currentProject ? `/timeline?projectId=${currentProject.id}` : "/timeline"}
                      active={pathname?.startsWith("/timeline")}
                      theme={theme}
                      small
                    />
                  </div>
                </div>
              )}
              
              <SidebarLink
                icon={<CalendarIcon className="w-5 h-5" />}
                text="캘린더"
                href={currentProject ? `/calendar?projectId=${currentProject.id}` : "/calendar"}
                active={pathname?.startsWith("/calendar")}
                theme={theme}
                small
              />
              <SidebarLink
                icon={<FileTextIcon className="w-5 h-5" />}
                text="문서"
                href={currentProject?.id ? `/documents?projectId=${currentProject.id}` : "/documents"}
                active={pathname?.startsWith("/documents")}
                theme={theme}
                small
              />
              <SidebarLink 
                icon={<UsersIcon className="w-5 h-5"/>} 
                text="팀원 관리" 
                href={currentProject ? `/projects/${currentProject.id}/members` : "/projects"}
                active={pathname?.includes("/projects") && pathname?.includes("/members")}
                theme={theme}
                small 
              />
              <SidebarLink
                icon={<VideoIcon className="w-5 h-5" />}
                text="화상 회의"
                href="/meeting"
                active={pathname?.startsWith("/meeting")}
                theme={theme}
                small
              />
              <SidebarLink
                icon={<BarChart3Icon className="w-5 h-5" />}
                text="보고서"
                href="/reports"
                active={pathname?.startsWith("/reports")}
                theme={theme}
                small
              />
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
                <UserIcon className="w-6 h-6 mr-3 rounded-full bg-gray-200 dark:bg-gray-600 p-0.5 text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{user?.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" sideOffset={5}>
              <DropdownMenuLabel className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/mypage')} className="cursor-pointer">
                <UserIcon className="w-4 h-4 mr-2" />
                <span>정보 수정</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert('알림 기능은 대시보드에서 확인해주세요.')} className="cursor-pointer">
                <BellIcon className="w-4 h-4 mr-2" />
                <span>알림</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                <SettingsIcon className="w-4 h-4 mr-2" />
                <span>설정</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                {theme === 'dark' ? <SunIcon className="w-4 h-4 mr-2" /> : <MoonIcon className="w-4 h-4 mr-2" />}
                <span>{theme === 'dark' ? "라이트 모드" : "다크 모드"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/50 focus:text-red-600 dark:focus:text-red-400">
                <LogOutIcon className="w-4 h-4 mr-2" />
                <span>로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 모바일 헤더 */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 bg-background">
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
          <div className="w-10"></div> {/* 균형을 위한 빈 공간 */}
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