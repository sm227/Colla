"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useProject } from "@/app/contexts/ProjectContext";
import Link from "next/link";
import { 
  HomeIcon, 
  ArrowLeftIcon, 
  ClockIcon, 
  PlusIcon, 
  FolderIcon, 
  ChevronDownIcon, 
  Trello,
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
import { Timeline } from "@/components/timeline/Timeline";
import { useTheme } from "next-themes";
import { useNotifications } from "@/app/contexts/NotificationContext";

// 통합 사이드바 컴포넌트 임포트
import Sidebar from "@/components/Sidebar";

// SidebarLink 컴포넌트는 통합 사이드바에서 처리됨

function TimelinePageContent() {
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

  // 설정 모달 관련 상태 추가
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState({
    theme: theme,
    language: 'ko',
    notifications: {
      email: true,
      push: true,
      desktop: true,
    },
    privacy: {
      profileVisible: true,
      activityVisible: true,
    }
  });

  // next-themes hydration 처리를 위한 mounted 상태 추가
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // 설정 저장 함수 추가
  const handleSaveSettings = () => {
    // 테마 변경
    if (tempSettings.theme !== theme) {
      setTheme(tempSettings.theme);
    }
    
    // 다른 설정들도 여기서 저장 처리
    // localStorage나 API를 통해 저장할 수 있음
    localStorage.setItem('userSettings', JSON.stringify(tempSettings));
    
    setShowSettingsModal(false);
  };
  
  // 설정 모달 열기 함수 추가
  const openSettingsModal = () => {
    setTempSettings({
      theme: theme,
      language: 'ko',
      notifications: {
        email: true,
        push: true,
        desktop: true,
      },
      privacy: {
        profileVisible: true,
        activityVisible: true,
      }
    });
    setShowSettingsModal(true);
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
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
      // 현재 URL의 프로젝트 ID를 로컬 스토리지에 저장
      localStorage.setItem('lastSelectedTimelineProjectId', projectIdParam);
    } else {
      // 프로젝트 ID 파라미터가 없는 경우 모든 작업 표시
      setSelectedProjectId(null);
      localStorage.removeItem('lastSelectedTimelineProjectId');
    }
  }, [projectIdParam]);

  const handleSelectProject = (projectId: string | null) => {    
    // 프로젝트 ID 변경 시 상태를 즉시 업데이트
    setSelectedProjectId(projectId);
    setShowProjectDropdown(false);
    
    // 선택한 프로젝트 ID를 로컬 스토리지에 저장
    if (projectId) {
      localStorage.setItem('lastSelectedTimelineProjectId', projectId);
      router.replace(`/timeline?projectId=${projectId}`);
    } else {
      // 모든 작업을 선택한 경우 로컬 스토리지에서 삭제하고 쿼리 파라미터 없이 이동
      localStorage.removeItem('lastSelectedTimelineProjectId');
      router.replace('/timeline');
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
          <p className={`mt-6 text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>타임라인 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자 정보가 없거나 프로젝트 정보 로딩 중일 때 리디렉션
  if (!authLoading && !user) {
    router.push("/auth/login?callbackUrl=/timeline");
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
        currentPage="timeline"
        onSettingsClick={openSettingsModal}
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
              <ClockIcon className="w-8 h-8 text-gray-600 dark:text-gray-400 mr-3" />
              타임라인
            </h2>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {currentProjectName}의 작업 일정을 시간순으로 확인하세요
            </p>
          </div>

          {/* 타임라인 위젯 */}
          <div className="rounded-xl shadow-sm bg-white dark:bg-[#2a2a2c] p-6 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-5">
              <div className="flex items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {currentProjectName} 타임라인
                </h3>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              <Timeline projectId={selectedProjectId} theme={theme} />
            </div>
          </div>
        </main>
      </div>

      {/* 설정 모달 */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="rounded-lg shadow-xl bg-card text-card-foreground">
              {/* 헤더 */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                    <SettingsIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">설정</h3>
                    <p className="text-sm text-muted-foreground">앱 설정을 관리하세요</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <XIcon className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              
              {/* 본문 */}
              <div className="p-6 space-y-6">
                {/* 외관 설정 */}
                <div>
                  <h4 className="text-base font-medium text-foreground mb-4 flex items-center">
                    <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-2">
                      {theme === 'dark' ? <MoonIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" /> : <SunIcon className="w-3 h-3 text-blue-600" />}
                    </div>
                    외관
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">테마</label>
                        <p className="text-xs text-muted-foreground">다크 모드와 라이트 모드를 선택하세요</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setTempSettings({...tempSettings, theme: 'light'})}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            tempSettings.theme === 'light' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          <SunIcon className="w-4 h-4 mr-1 inline" />
                          라이트
                        </button>
                        <button
                          onClick={() => setTempSettings({...tempSettings, theme: 'dark'})}
                          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                            tempSettings.theme === 'dark' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          <MoonIcon className="w-4 h-4 mr-1 inline" />
                          다크
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 알림 설정 */}
                <div>
                  <h4 className="text-base font-medium text-foreground mb-4 flex items-center">
                    <div className="w-5 h-5 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-2">
                      <BellIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    알림
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">이메일 알림</label>
                        <p className="text-xs text-muted-foreground">중요한 업데이트를 이메일로 받기</p>
                      </div>
                      <button
                        onClick={() => setTempSettings({
                          ...tempSettings,
                          notifications: {...tempSettings.notifications, email: !tempSettings.notifications.email}
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempSettings.notifications.email ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          tempSettings.notifications.email ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">푸시 알림</label>
                        <p className="text-xs text-muted-foreground">브라우저 푸시 알림 받기</p>
                      </div>
                      <button
                        onClick={() => setTempSettings({
                          ...tempSettings,
                          notifications: {...tempSettings.notifications, push: !tempSettings.notifications.push}
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempSettings.notifications.push ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          tempSettings.notifications.push ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">데스크톱 알림</label>
                        <p className="text-xs text-muted-foreground">데스크톱 알림 표시</p>
                      </div>
                      <button
                        onClick={() => setTempSettings({
                          ...tempSettings,
                          notifications: {...tempSettings.notifications, desktop: !tempSettings.notifications.desktop}
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempSettings.notifications.desktop ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          tempSettings.notifications.desktop ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* 개인정보 설정 */}
                <div>
                  <h4 className="text-base font-medium text-foreground mb-4 flex items-center">
                    <div className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mr-2">
                      <UserIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    개인정보
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">프로필 공개</label>
                        <p className="text-xs text-muted-foreground">다른 사용자에게 프로필 정보 공개</p>
                      </div>
                      <button
                        onClick={() => setTempSettings({
                          ...tempSettings,
                          privacy: {...tempSettings.privacy, profileVisible: !tempSettings.privacy.profileVisible}
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempSettings.privacy.profileVisible ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          tempSettings.privacy.profileVisible ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-foreground">활동 내역 공개</label>
                        <p className="text-xs text-muted-foreground">프로젝트 활동 내역 공개</p>
                      </div>
                      <button
                        onClick={() => setTempSettings({
                          ...tempSettings,
                          privacy: {...tempSettings.privacy, activityVisible: !tempSettings.privacy.activityVisible}
                        })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tempSettings.privacy.activityVisible ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          tempSettings.privacy.activityVisible ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 푸터 */}
              <div className="flex justify-end gap-3 p-6 border-t border-border">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                  onClick={() => setShowSettingsModal(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors"
                  onClick={handleSaveSettings}
                >
                  설정 저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// TimelinePageContent 컴포넌트를 Suspense로 감싸는 기본 export
export default function TimelinePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center flex flex-col items-center">
          <div className="relative w-24 h-24 text-blue-500">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-current border-solid rounded-full opacity-20 border-blue-500"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-current border-solid rounded-full animate-spin border-t-transparent"></div>
            </div>
          </div>
          <p className="text-lg font-medium mt-4">타임라인 로딩 중...</p>
          <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
        </div>
      </div>
    }>
      <TimelinePageContent />
    </Suspense>
  );
} 