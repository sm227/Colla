"use client";

import { useState, useEffect, memo, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useProject } from "@/app/contexts/ProjectContext";
import { useTheme } from "next-themes";
import {
  SearchIcon,
  LayoutDashboardIcon,
  FolderIcon,
  PlusIcon,
  FileTextIcon,
  ChevronRightIcon,
  UsersIcon,
  VideoIcon,
  CalendarIcon,
  Trello,
  BarChart3Icon,
  ClockIcon,
  XIcon,
  UserIcon,
  BellIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  LogOutIcon,
  Trash2Icon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";

// shadcn/ui 컴포넌트 임포트
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useNotifications } from "@/app/contexts/NotificationContext";

// 알림 패널 커스텀 스크롤바 스타일
const NotificationScrollbarStyles = () => (
  <style jsx global>{`
    /* 알림 패널 스크롤바 스타일 */
    html.dark .notifications-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    html:not(.dark) .notifications-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    html.dark .notifications-scrollbar::-webkit-scrollbar-track {
      background: #1f2937; /* gray-800 */
      border-radius: 3px;
    }
    html:not(.dark) .notifications-scrollbar::-webkit-scrollbar-track {
      background: #f3f4f6; /* gray-100 */
      border-radius: 3px;
    }
    html.dark .notifications-scrollbar::-webkit-scrollbar-thumb {
      background-color: #4b5563; /* gray-600 */
      border-radius: 3px;
      border: 1px solid #1f2937; /* gray-800, creates padding */
    }
    html:not(.dark) .notifications-scrollbar::-webkit-scrollbar-thumb {
      background-color: #d1d5db; /* gray-300 */
      border-radius: 3px;
      border: 1px solid #f3f4f6; /* gray-100, creates padding */
    }
    html.dark .notifications-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #6b7280; /* gray-500 */
    }
    html:not(.dark) .notifications-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af; /* gray-400 */
    }
    html.dark .notifications-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #4b5563 #1f2937; /* thumb track for Firefox */
    }
    html:not(.dark) .notifications-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #d1d5db #f3f4f6; /* thumb track for Firefox */
    }
  `}</style>
);

// 폴더 인터페이스
interface Folder {
  id: string;
  name: string;
  count: number;
}

// 알림 타입 정의 (메인 대시보드와 동일)
type Notification = {
  id: string;
  type: "invitation" | "document_update" | "task_assigned" | "generic" | "task_created" | "task_updated";
  title: string;
  message: string;
  link: string;
  createdAt: string;
  isRead?: boolean;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  projectId?: string;
  taskId?: string;
};

// SidebarLink 컴포넌트
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

interface SidebarProps {
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  onSettingsClick?: () => void;
  currentPage?: string;
  onFolderSelect?: (folderId: string, folderName: string) => void;
  onAllDocumentsSelect?: () => void;
}

const Sidebar = memo(function Sidebar({
  mobileSidebarOpen,
  setMobileSidebarOpen,
  onSettingsClick,
  currentPage,
  onFolderSelect,
  onAllDocumentsSelect
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme: currentTheme, setTheme } = useTheme();
  const theme = (currentTheme || 'dark') as 'light' | 'dark';

  // 전역 알림 컨텍스트 사용
  const {
    notifications,
    showNotificationPanel,
    setShowNotificationPanel,
    hasNewNotifications,
    processingInvitation,
    markAllAsRead,
    markAsRead,
    acceptInvitation,
    rejectInvitation
  } = useNotifications();

  const [mounted, setMounted] = useState(false);
  const [isDocumentsSubmenuOpen, setIsDocumentsSubmenuOpen] = useState(false);
  const [isKanbanSubmenuOpen, setIsKanbanSubmenuOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isFolderCreating, setIsFolderCreating] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [folderIdToDelete, setFolderIdToDelete] = useState<string | null>(null);

  const { user, logout } = useAuth();
  const { 
    projects, 
    currentProject, 
    setCurrentProject,
    hasProjects
  } = useProject();
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // 현재 선택된 프로젝트 ID 가져오기
  const getProjectIdFromUrl = () => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('projectId');
    }
    return null;
  };

  const selectedProjectId = getProjectIdFromUrl();

  // 폴더 목록 가져오기
  const fetchFolders = async () => {
    try {
      const url = selectedProjectId 
        ? `/api/documents/folders?projectId=${selectedProjectId}`
        : '/api/documents/folders';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        return;
      }
      
      const data = await response.json();
      setFolders(data);
    } catch (error) {
      console.error('폴더 목록을 가져오는 중 오류:', error);
    }
  };

  useEffect(() => {
    if (pathname?.startsWith('/documents')) {
      fetchFolders();
    }
  }, [selectedProjectId, pathname]);

  // 페이지별 서브메뉴 상태 설정
  useEffect(() => {
    // 칸반보드/타임라인 페이지에서만 칸반보드 서브메뉴 열기
    if (pathname?.startsWith('/kanban') || pathname?.startsWith('/timeline')) {
      setIsKanbanSubmenuOpen(true);
      setIsDocumentsSubmenuOpen(false);
    }
    // 문서 페이지에서만 문서 서브메뉴 열기
    else if (pathname?.startsWith('/documents')) {
      setIsDocumentsSubmenuOpen(true);
      setIsKanbanSubmenuOpen(false);
    }
    // 다른 페이지에서는 모든 서브메뉴 닫기
    else {
      setIsKanbanSubmenuOpen(false);
      setIsDocumentsSubmenuOpen(false);
    }
  }, [pathname]);

  // 폴더 생성 함수
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setFolderError("폴더 이름을 입력해주세요.");
      return;
    }
    
    try {
      setIsFolderCreating(true);
      setFolderError(null);
      
      const response = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          projectId: selectedProjectId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '폴더 생성 실패');
      }
      
      await fetchFolders();
      setShowFolderModal(false);
      setNewFolderName("");
      setSelectedFolder(newFolderName);
      
    } catch (error) {
      setFolderError(error instanceof Error ? error.message : '폴더 생성 중 오류가 발생했습니다.');
    } finally {
      setIsFolderCreating(false);
    }
  };

  // 폴더 삭제 함수
  const deleteFolder = async () => {
    if (!folderIdToDelete || !selectedProjectId || !folderToDelete) return;
    
    try {
      const response = await fetch(`/api/documents/folders/${folderIdToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          projectId: selectedProjectId 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '폴더 삭제 중 오류가 발생했습니다.');
      }
      
      await fetchFolders();
      
      if (selectedFolder === folderToDelete) {
        setSelectedFolder(null);
      }
      
      setShowDeleteFolderModal(false);
      setFolderToDelete(null);
      setFolderIdToDelete(null);
      
    } catch (error) {
      console.error('폴더 삭제 오류:', error);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth/login");
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  // 알림 클릭 핸들러
  const handleNotificationClick = (notification: Notification) => {
    // 읽지 않은 알림이면 읽음 처리
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    // 링크가 있으면 이동
    if (notification.link) {
      router.push(notification.link);
      setShowNotificationPanel(false);
    }
  };

  // 알림 패널 열기
  const handleNotificationPanelToggle = () => {
    if (setShowNotificationPanel) {
      setShowNotificationPanel(!showNotificationPanel);
    } else {
      alert('알림 기능은 대시보드에서 확인해주세요.');
    }
  };

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* 커스텀 스크롤바 스타일 */}
      <NotificationScrollbarStyles />
      
      {/* 폴더 생성 모달 */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4">
            <div className="rounded-lg shadow-xl bg-card text-card-foreground p-6">
              <div className="mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                    <FolderIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">새 폴더 만들기</h3>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      폴더 이름
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:outline-none transition-colors"
                      placeholder="폴더 이름을 입력하세요"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      autoFocus
                    />
                    {folderError && (
                      <p className="mt-2 text-sm text-destructive">{folderError}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors outline-none focus:outline-none"
                  onClick={() => {
                    setShowFolderModal(false);
                    setNewFolderName("");
                    setFolderError(null);
                  }}
                  disabled={isFolderCreating}
                >
                  취소
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors outline-none focus:outline-none ${isFolderCreating ? 'opacity-75 cursor-not-allowed' : ''}`}
                  onClick={createFolder}
                  disabled={isFolderCreating}
                >
                  {isFolderCreating ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      생성 중...
                    </span>
                  ) : (
                    '폴더 생성'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-gray-200 bg-background dark:border-gray-700 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:flex-shrink-0 flex flex-col`}
      >
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-black dark:bg-blue-600 rounded-lg flex items-center justify-center mr-2">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">Colla</span>
          </div>
          <button
            className="md:hidden outline-none focus:outline-none"
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
                  href={`/?projectId=${project.id}`}
                  small
                  active={selectedProjectId === project.id}
                  onClick={(e) => {
                    e.preventDefault();
                    const newUrl = `/?projectId=${project.id}`;
                    router.push(newUrl);
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
              {/* 칸반보드 섹션 */}
              <div>
                <button
                  onClick={() => {
                    // 대시보드에서는 바로 칸반보드 페이지로 이동
                    if (pathname === '/') {
                      const kanbanUrl = currentProject ? `/kanban?projectId=${currentProject.id}` : "/kanban";
                      router.push(kanbanUrl);
                    }
                    // 칸반보드/타임라인 페이지에서는 하위메뉴 토글
                    else if (pathname?.startsWith('/kanban') || pathname?.startsWith('/timeline')) {
                      setIsKanbanSubmenuOpen(!isKanbanSubmenuOpen);
                    }
                    // 다른 페이지에서는 칸반보드 페이지로 이동
                    else {
                      const kanbanUrl = currentProject ? `/kanban?projectId=${currentProject.id}` : "/kanban";
                      router.push(kanbanUrl);
                    }
                  }}
                  className={`flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors duration-150 outline-none focus:outline-none ${
                    theme === 'dark'
                      ? (pathname?.startsWith("/kanban") || pathname?.startsWith("/timeline"))
                        ? "bg-blue-900 bg-opacity-30 text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                        : "text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                      : (pathname?.startsWith("/kanban") || pathname?.startsWith("/timeline"))
                        ? "bg-blue-100 bg-opacity-50 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`mr-2.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Trello className="w-5 h-5" />
                    </div>
                    <span>칸반보드</span>
                  </div>
                  {/* 칸반보드/타임라인 페이지에서만 화살표 표시 */}
                  {(pathname?.startsWith('/kanban') || pathname?.startsWith('/timeline')) && (
                    <ChevronRightIcon 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isKanbanSubmenuOpen ? 'transform rotate-90' : ''
                      } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                    />
                  )}
                </button>
                
                {isKanbanSubmenuOpen && (pathname?.startsWith('/kanban') || pathname?.startsWith('/timeline')) && (
                  <div className="ml-4 mt-1 space-y-1">
                    <SidebarLink
                      icon={<Trello className="w-4 h-4" />}
                      text="칸반보드"
                      href={currentProject ? `/kanban?projectId=${currentProject.id}` : "/kanban"}
                      active={pathname?.startsWith("/kanban") && !pathname?.includes("/timeline")}
                      theme={theme}
                      small
                    />
                    <SidebarLink
                      icon={<ClockIcon className="w-4 h-4" />}
                      text="타임라인"
                      href={currentProject ? `/timeline?projectId=${currentProject.id}` : "/timeline"}
                      active={pathname?.startsWith("/timeline")}
                      theme={theme}
                      small
                    />
                  </div>
                )}
              </div>

              <SidebarLink
                icon={<CalendarIcon className="w-5 h-5" />}
                text="캘린더"
                href={currentProject ? `/calendar?projectId=${currentProject.id}` : "/calendar"}
                active={pathname?.startsWith("/calendar")}
                theme={theme}
                small
              />
              
              {/* 문서 섹션 */}
              <div>
                <button
                  onClick={() => {
                    // 대시보드에서는 바로 문서 페이지로 이동
                    if (pathname === '/') {
                      const documentsUrl = currentProject ? `/documents?projectId=${currentProject.id}` : "/documents";
                      router.push(documentsUrl);
                    }
                    // 문서 페이지에서는 하위메뉴 토글
                    else if (pathname?.startsWith('/documents')) {
                      setIsDocumentsSubmenuOpen(!isDocumentsSubmenuOpen);
                    }
                    // 다른 페이지에서는 문서 페이지로 이동
                    else {
                      const documentsUrl = currentProject ? `/documents?projectId=${currentProject.id}` : "/documents";
                      router.push(documentsUrl);
                    }
                  }}
                  className={`flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors duration-150 outline-none focus:outline-none ${
                    theme === 'dark'
                      ? pathname?.startsWith("/documents")
                        ? "bg-blue-900 bg-opacity-30 text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                        : "text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                      : pathname?.startsWith("/documents")
                        ? "bg-blue-100 bg-opacity-50 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`mr-2.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <FileTextIcon className="w-5 h-5" />
                    </div>
                    <span>문서</span>
                  </div>
                  {/* 문서 페이지에서만 화살표 표시 */}
                  {pathname?.startsWith('/documents') && (
                    <ChevronRightIcon 
                      className={`w-4 h-4 transition-transform duration-200 ${
                        isDocumentsSubmenuOpen ? 'transform rotate-90' : ''
                      } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                    />
                  )}
                </button>
                
                {isDocumentsSubmenuOpen && pathname?.startsWith('/documents') && (
                  <div className="ml-4 mt-1 space-y-1">
                    <SidebarLink
                      icon={<FileTextIcon className="w-4 h-4" />}
                      text="모든 문서"
                      href={selectedProjectId ? `/documents?projectId=${selectedProjectId}` : "/documents"}
                      active={pathname === "/documents" && !selectedFolder}
                      theme={theme}
                      small
                      onClick={(e) => {
                        e.preventDefault();
                        if (onAllDocumentsSelect) {
                          onAllDocumentsSelect();
                        } else {
                          setSelectedFolder(null);
                          const url = selectedProjectId ? `/documents?projectId=${selectedProjectId}` : "/documents";
                          // URL 변경 (페이지 새로고침 없이)
                          window.history.pushState({}, '', url);
                          // popstate 이벤트 발생시켜 URL 변경 감지
                          window.dispatchEvent(new PopStateEvent('popstate'));
                        }
                      }}
                    />
                    
                    {/* 폴더 목록 */}
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          if (onFolderSelect) {
                            onFolderSelect(folder.id, folder.name);
                          } else {
                            setSelectedFolder(folder.name);
                            const url = selectedProjectId 
                              ? `/documents?projectId=${selectedProjectId}&folderId=${folder.id}`
                              : `/documents?folderId=${folder.id}`;
                            // URL 변경 (페이지 새로고침 없이)
                            window.history.pushState({}, '', url);
                            // popstate 이벤트 발생시켜 URL 변경 감지
                            window.dispatchEvent(new PopStateEvent('popstate'));
                          }
                        }}
                        className={`group flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors duration-150 outline-none focus:outline-none ${
                          selectedFolder === folder.name
                            ? theme === 'dark'
                              ? "bg-blue-900 bg-opacity-30 text-gray-300"
                              : "bg-blue-100 bg-opacity-50 text-gray-600"
                            : theme === 'dark'
                              ? "text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                              : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`mr-2.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            <FolderIcon className="w-4 h-4" />
                          </div>
                          <span className="truncate">{folder.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {folder.count > 0 && (
                            <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                              {folder.count}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setFolderIdToDelete(folder.id);
                              setFolderToDelete(folder.name);
                              setShowDeleteFolderModal(true);
                            }}
                            className={`p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 outline-none focus:outline-none`}
                            title="폴더 삭제"
                          >
                            <Trash2Icon className="w-3 h-3" />
                          </button>
                        </div>
                      </button>
                    ))}
                    
                    {/* 새 폴더 만들기 */}
                    <button
                      onClick={() => setShowFolderModal(true)}
                      className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md transition-colors duration-150 outline-none focus:outline-none ${
                        theme === 'dark'
                          ? "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                          : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                      }`}
                    >
                      <div className={`mr-2.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <PlusIcon className="w-4 h-4" />
                      </div>
                      <span>새 폴더</span>
                    </button>
                  </div>
                )}
              </div>

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

        <div className="p-4">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center flex-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none outline-none">
                  <UserIcon className="w-6 h-6 mr-3 rounded-full bg-gray-200 dark:bg-gray-600 p-0.5 text-gray-700 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{user?.name || user?.email || '사용자'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" sideOffset={5}>
                <DropdownMenuLabel className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/mypage')} className="cursor-pointer">
                  <UserIcon className="w-4 h-4 mr-2" />
                  <span>정보 수정</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  <span>설정</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                  {theme === 'dark' ? <SunIcon className="w-4 h-4 mr-2" /> : <MoonIcon className="w-4 h-4 mr-2" />}
                  <span>{theme === 'dark' ? "라이트 모드" : "다크 모드"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/50 focus:text-red-600 dark:focus:text-red-400">
                  <LogOutIcon className="w-4 h-4 mr-2" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* 알림 버튼 */}
            <button 
              onClick={handleNotificationPanelToggle}
              className="relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none outline-none transition-colors"
              title="알림"
            >
              <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              {hasNewNotifications && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* 알림 패널 */}
      {showNotificationPanel && setShowNotificationPanel && (
        <div className="fixed inset-0 z-50 md:inset-auto md:left-64 md:top-0 md:h-full md:w-80 lg:w-96 bg-white dark:bg-[#1f1f21] shadow-xl border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">알림</h2>
            <div className="flex items-center gap-2">
              {/* 모두 읽기 버튼 */}
              {notifications.length > 0 && hasNewNotifications && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                >
                  모두 읽기
                </button>
              )}
              {/* 닫기 버튼 */}
              <button
                onClick={() => setShowNotificationPanel(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <XIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto h-full pb-16 notifications-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                <BellIcon className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-center">새로운 알림이 없습니다</p>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer hover:shadow-md ${
                      notification.isRead
                        ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.iconBgColor || "bg-blue-100 dark:bg-blue-900"
                      }`}>
                        {notification.icon || (
                          <BellIcon className={`w-4 h-4 ${notification.iconColor || "text-blue-600 dark:text-blue-400"}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          {new Date(notification.createdAt).toLocaleString('ko-KR')}
                        </p>
                        
                        {/* 초대 알림인 경우 수락/거절 버튼 표시 */}
                        {notification.type === "invitation" && notification.projectId && (
                          <div className="flex space-x-2 mt-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => acceptInvitation(notification.id, notification.projectId!, e)}
                              disabled={processingInvitation === notification.id}
                              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {processingInvitation === notification.id ? "처리중..." : "수락"}
                            </button>
                            <button
                              onClick={(e) => rejectInvitation(notification.id, notification.projectId!, e)}
                              disabled={processingInvitation === notification.id}
                              className="px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                            >
                              거절
                            </button>
                          </div>
                        )}
                        
                        {/* 다른 타입의 알림인 경우 링크 표시 */}
                        {notification.type !== "invitation" && notification.link && (
                          <div className="mt-3">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                              자세히 보기 →
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 폴더 삭제 확인 모달 */}
      {showDeleteFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-[#2a2a2c] rounded-lg p-6 w-96 max-w-sm mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">폴더 삭제</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              정말로 &quot;{folderToDelete}&quot; 폴더를 삭제하시겠습니까?<br />
              <span className="text-red-500 text-sm">이 작업은 되돌릴 수 없습니다.</span>
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteFolderModal(false);
                  setFolderToDelete(null);
                  setFolderIdToDelete(null);
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                취소
              </button>
              <button
                onClick={deleteFolder}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default Sidebar;