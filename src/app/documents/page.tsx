"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { 
  FileTextIcon, 
  FolderIcon, 
  PlusIcon, 
  SearchIcon, 
  StarIcon,
  MoreHorizontalIcon,
  GridIcon,
  ListIcon,
  SortAscIcon,
  FilterIcon,
  ChevronRightIcon,
  ClockIcon,
  UsersIcon,
  TagIcon,
  BookmarkIcon,
  Trash2Icon,
  XIcon,
  AlertCircleIcon,
  HomeIcon,
  ArrowLeftIcon,
  LayoutDashboardIcon,
  BellIcon,
  SettingsIcon,
  LogOutIcon,
  MenuIcon,
  VideoIcon,
  CalendarIcon,
  Trello,
  SunIcon,
  MoonIcon,
  UserIcon,
  BarChart3Icon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useProject } from "@/app/contexts/ProjectContext";
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

// SidebarLink 컴포넌트 (page.tsx에서 가져옴)
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

// 문서 인터페이스 정의
interface Document {
  id: string;
  title: string;
  content: string;
  emoji: string | null;
  isStarred: boolean;
  folder: string | null;
  folderId?: string | null; // DB 컬럼명과 일치
  tags: string | null; // JSON 문자열
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
}

// 폴더 인터페이스 추가
interface Folder {
  id: string;
  name: string;
  count: number;
}

// 스크롤바 스타일 컴포넌트 추가
const ModernScrollbarStyles = () => (
  <style jsx global>{`
    /* Firefox */
    .dark-mode ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .light-mode ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    /* Webkit (Chrome, Safari, Edge) - Track */
    .dark-mode ::-webkit-scrollbar-track {
      background: #1f2937; /* gray-800 */
      border-radius: 4px;
    }
    .light-mode ::-webkit-scrollbar-track {
      background: #f3f4f6; /* gray-100 */
      border-radius: 4px;
    }

    /* Webkit (Chrome, Safari, Edge) - Thumb */
    .dark-mode ::-webkit-scrollbar-thumb {
      background-color: #4b5563; /* gray-600 */
      border-radius: 4px;
      border: 2px solid #1f2937; /* gray-800, creates padding */
    }
    .light-mode ::-webkit-scrollbar-thumb {
      background-color: #d1d5db; /* gray-300 */
      border-radius: 4px;
      border: 2px solid #f3f4f6; /* gray-100, creates padding */
    }

    /* Webkit (Chrome, Safari, Edge) - Thumb on hover */
    .dark-mode ::-webkit-scrollbar-thumb:hover {
      background-color: #6b7280; /* gray-500 */
    }
    .light-mode ::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af; /* gray-400 */
    }

    /* Firefox - General */
    .dark-mode * {
      scrollbar-width: thin;
      scrollbar-color: #4b5563 #1f2937; /* thumb track */
    }
    .light-mode * {
      scrollbar-width: thin;
      scrollbar-color: #d1d5db #f3f4f6; /* thumb track */
    }

    /* Custom scrollbar for recent documents (horizontal) */
    .dark-mode .recent-documents-scrollbar::-webkit-scrollbar {
      height: 8px;
    }
    .light-mode .recent-documents-scrollbar::-webkit-scrollbar {
      height: 8px;
    }
    .dark-mode .recent-documents-scrollbar::-webkit-scrollbar-track {
      background: #1f2937; /* gray-800 */
      border-radius: 4px;
    }
    .light-mode .recent-documents-scrollbar::-webkit-scrollbar-track {
      background: #f3f4f6; /* gray-100 */
      border-radius: 4px;
    }
    .dark-mode .recent-documents-scrollbar::-webkit-scrollbar-thumb {
      background-color: #4b5563; /* gray-600 */
      border-radius: 4px;
      border: 2px solid #1f2937; /* gray-800, creates padding */
    }
    .light-mode .recent-documents-scrollbar::-webkit-scrollbar-thumb {
      background-color: #d1d5db; /* gray-300 */
      border-radius: 4px;
      border: 2px solid #f3f4f6; /* gray-100, creates padding */
    }
    .dark-mode .recent-documents-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #6b7280; /* gray-500 */
    }
    .light-mode .recent-documents-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af; /* gray-400 */
    }
    .dark-mode .recent-documents-scrollbar {
      scrollbar-color: #4b5563 #1f2937; /* thumb track for Firefox */
    }
    .light-mode .recent-documents-scrollbar {
      scrollbar-color: #d1d5db #f3f4f6; /* thumb track for Firefox */
    }
    
    /* 할당된 작업 스크롤바 스타일 */
    .dark-mode .assigned-tasks-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .light-mode .assigned-tasks-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .dark-mode .assigned-tasks-scrollbar::-webkit-scrollbar-track {
      background: #1f2937; /* gray-800 */
      border-radius: 3px;
    }
    .light-mode .assigned-tasks-scrollbar::-webkit-scrollbar-track {
      background: #f3f4f6; /* gray-100 */
      border-radius: 3px;
    }
    .dark-mode .assigned-tasks-scrollbar::-webkit-scrollbar-thumb {
      background-color: #4b5563; /* gray-600 */
      border-radius: 3px;
      border: 1px solid #1f2937; /* gray-800, creates padding */
    }
    .light-mode .assigned-tasks-scrollbar::-webkit-scrollbar-thumb {
      background-color: #d1d5db; /* gray-300 */
      border-radius: 3px;
      border: 1px solid #f3f4f6; /* gray-100, creates padding */
    }
    .dark-mode .assigned-tasks-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #6b7280; /* gray-500 */
    }
    .light-mode .assigned-tasks-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af; /* gray-400 */
    }
    .dark-mode .assigned-tasks-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #4b5563 #1f2937; /* thumb track for Firefox */
    }
    .light-mode .assigned-tasks-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #d1d5db #f3f4f6; /* thumb track for Firefox */
    }
  `}</style>
);

function DocumentsPageContent() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false); // 모바일 사이드바 상태
  const [isDocumentsSubmenuOpen, setIsDocumentsSubmenuOpen] = useState(true); // 문서 하위 메뉴 상태 추가
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { 
    projects, 
    currentProject, 
    setCurrentProject,
    loading: projectLoading,
    hasProjects
  } = useProject();
  
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
  
  // URL에서 projectId 가져오기
  const getProjectIdFromUrl = () => {
    if (typeof window !== 'undefined') {
      // 클라이언트 사이드에서만 실행
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('projectId');
    }
    return null;
  };
  
  // Next.js의 useSearchParams와 직접 URL에서 가져온 값 중 하나를 사용
  const projectIdParam = searchParams?.get('projectId') || getProjectIdFromUrl();
  
  const editorRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
  // URL 파라미터에서 초기값 설정 (window 객체가 있을 때만)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    if (projectIdParam) return projectIdParam;
    
    // URL에서 직접 확인 (window 객체가 있을 때만)
    if (typeof window !== 'undefined') {
      const urlProjectId = new URLSearchParams(window.location.search).get('projectId');
      return urlProjectId;
    }
    
    return null;
  });
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  
  // 문서 삭제 관련 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // 폴더 관련 상태
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isFolderCreating, setIsFolderCreating] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [folderIdToDelete, setFolderIdToDelete] = useState<string | null>(null);
  const [isDeletingFolder, setIsDeletingFolder] = useState(false);
  const [deleteFolderError, setDeleteFolderError] = useState<string | null>(null);
  
  // 고유한 폴더 목록 가져오기
  const [folders, setFolders] = useState<Folder[]>([]);
  
  // 프로젝트 ID로 프로젝트 정보 가져오기
  useEffect(() => {
    if (selectedProjectId) {
      const fetchProjectName = async () => {
        try {
          const response = await fetch(`/api/projects/${selectedProjectId}`);
          if (response.ok) {
            const project = await response.json();
            setProjectName(project.name);
          }
        } catch (err) {
          console.error('프로젝트 정보를 가져오는 중 오류:', err);
        }
      };
      
      fetchProjectName();
      // 폴더 목록도 가져오기
      fetchFolders();
    } else {
      // 선택된 프로젝트가 없으면 사용자의 첫 번째 프로젝트를 가져오거나 새 프로젝트 생성
      const getDefaultProject = async () => {
        try {
          // 사용자의 프로젝트 목록 가져오기
          const projectsResponse = await fetch('/api/projects');
          
          if (!projectsResponse.ok) {
            throw new Error('프로젝트 목록을 가져오는데 실패했습니다.');
          }
          
          const projects = await projectsResponse.json();
          
          // 프로젝트가 있으면 첫 번째 프로젝트 사용
          if (projects && projects.length > 0) {
            const firstProject = projects[0];
            setSelectedProjectId(firstProject.id);
            
            // URL 업데이트 (페이지 새로고침 없이)
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.set('projectId', firstProject.id);
              window.history.pushState({}, '', url.toString());
            }
            
            return;
          }
          
          // 프로젝트가 없으면 새 프로젝트 생성
          const createResponse = await fetch('/api/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: "내 프로젝트",
              description: "자동으로 생성된 프로젝트입니다."
            })
          });
          
          if (!createResponse.ok) {
            throw new Error('새 프로젝트를 생성하는데 실패했습니다.');
          }
          
          const newProject = await createResponse.json();
          setSelectedProjectId(newProject.id);
          
          // URL 업데이트 (페이지 새로고침 없이)
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('projectId', newProject.id);
            window.history.pushState({}, '', url.toString());
          }
        } catch (error) {
          console.error("기본 프로젝트 설정 실패:", error);
        }
      };
      
      // 인증된 사용자가 있을 때만 실행
      if (user && !authLoading) {
        getDefaultProject();
      }
    }
  }, [selectedProjectId, user, authLoading]);
  
  // 폴더 목록 가져오기
  const fetchFolders = async () => {
    try {
      // 프로젝트 ID가 있을 경우 해당 프로젝트의 폴더만 가져옴
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
  
  // 문서 데이터 가져오는 함수 (외부로 분리)
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // 프로젝트 ID가 있고 모든 문서 보기가 아닐 때만 프로젝트 필터링
      const url = (selectedProjectId && !showAllDocuments)
        ? `/api/documents?projectId=${selectedProjectId}`
        : '/api/documents';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('문서를 불러오는 중 문제가 발생했습니다');
      }
      
      const data = await response.json();
      setDocuments(data);
      setError(null);
    } catch (err) {
      setError('문서를 불러오는 중 오류가 발생했습니다');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };
  
  // URL 파라미터에서 폴더 정보 읽기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const folderId = urlParams.get('folderId');
      
      if (folderId && folders.length > 0) {
        const folder = folders.find(f => f.id === folderId);
        if (folder) {
          setSelectedFolder(folder.name);
        }
      }
    }
  }, [folders]);
  
  // 문서 데이터 불러오기
  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/auth/login?callbackUrl=/documents');
      return;
    }
    
    if (user && !authLoading) {
      fetchDocuments();
    }
  }, [user, authLoading, router, selectedProjectId, showAllDocuments]);
  
  // 폴더별 문서 필터링
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];
    
    if (selectedFolder === "즐겨찾기") {
      filtered = filtered.filter(doc => doc.isStarred);
    } else if (selectedFolder) {
      // 선택된 폴더 이름으로 필터링
      const selectedFolderId = folders.find(f => f.name === selectedFolder)?.id;
      filtered = filtered.filter(doc => doc.folderId === selectedFolderId);
    }
    
    // 검색어로 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.title.toLowerCase().includes(query) ||
        (doc.tags && JSON.parse(doc.tags).some((tag: string) => 
          tag.toLowerCase().includes(query)
        ))
      );
    }
    
    return filtered;
  }, [documents, selectedFolder, searchQuery, folders]);
  
  const createNewDocument = () => {
    setIsNavigating(true);
    
    // 프로젝트 ID가 있고 빈 문자열이 아닐 때만 쿼리스트링 추가
    const searchParams = new URLSearchParams();
    if (selectedProjectId && selectedProjectId !== '') {
      searchParams.append('projectId', selectedProjectId);
    }
    
    // 선택된 폴더가 있으면 쿼리스트링에 추가
    if (selectedFolder && selectedFolder !== '즐겨찾기' && selectedFolder !== '모든 문서') {
      // 선택한 폴더의 ID 찾기
      const selectedFolderId = folders.find(f => f.name === selectedFolder)?.id;
      if (selectedFolderId) {
        searchParams.append('folderId', selectedFolderId);
        searchParams.append('folderName', selectedFolder);
      }
    }
    
    const finalUrl = `/documents/new${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    router.push(finalUrl);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // 태그 파싱 함수
  const parseTags = (tagsJson: string | null): string[] => {
    if (!tagsJson) return [];
    
    try {
      const parsed = JSON.parse(tagsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };
  
  // 문서 삭제 처리 함수
  const handleDeleteDocument = async () => {
    if (!documentToDelete) return;
    
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      const response = await fetch(`/api/documents/${documentToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('문서 삭제 중 오류가 발생했습니다.');
      }
      
      // 삭제 성공 시 문서 목록에서 제거
      setDocuments(documents.filter(doc => doc.id !== documentToDelete.id));
      
      // 폴더 목록도 다시 가져와서 문서 수를 업데이트
      await fetchFolders();
      
      setShowDeleteModal(false);
      setDocumentToDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '문서 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // 삭제 모달 열기
  const openDeleteModal = (e: React.MouseEvent, document: Document) => {
    e.preventDefault();
    e.stopPropagation();
    setDocumentToDelete(document);
    setShowDeleteModal(true);
  };
  
  // 폴더 생성 함수
  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setFolderError("폴더 이름을 입력해주세요.");
      return;
    }
    
    if (!selectedProjectId) {
      // URL에서 다시 한번 확인
      const urlProjectId = new URLSearchParams(window.location.search).get('projectId');
      
      if (urlProjectId) {
        setSelectedProjectId(urlProjectId);
        // 프로젝트 ID가 설정되었으므로 함수를 다시 호출
        setTimeout(() => createFolder(), 100);
        return;
      }
      
      // 프로젝트 ID가 없으면 기본 프로젝트 생성
      try {
        setIsFolderCreating(true);
        setFolderError("기본 프로젝트 생성 중...");
        
        // 기본 프로젝트 생성 API 호출
        const createProjectResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: "내 프로젝트",
            description: "자동으로 생성된 프로젝트입니다."
          })
        });
        
        if (!createProjectResponse.ok) {
          throw new Error("기본 프로젝트 생성 실패");
        }
        
        const newProject = await createProjectResponse.json();
        
        // 새 프로젝트 ID 설정
        setSelectedProjectId(newProject.id);
        
        // URL 업데이트 (페이지 새로고침 없이)
        const url = new URL(window.location.href);
        url.searchParams.set('projectId', newProject.id);
        window.history.pushState({}, '', url.toString());
        
        // 폴더 생성 함수 다시 호출
        setTimeout(() => createFolder(), 100);
        return;
      } catch (error) {
        console.error("기본 프로젝트 생성 실패:", error);
        setFolderError("프로젝트 생성에 실패했습니다. 프로젝트를 선택해주세요.");
        setIsFolderCreating(false);
        return;
      }
    }
    
    try {
      setIsFolderCreating(true);
      setFolderError(null);
      
      // 새 폴더 API 호출로 생성
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
      
      // 새 폴더 생성 성공 시 폴더 다시 가져오기
      await fetchFolders();
      
      // 폴더 생성 완료 후 상태 초기화
      setShowFolderModal(false);
      setNewFolderName("");
      
      // 새로 생성한 폴더 선택
      setSelectedFolder(newFolderName);
      
    } catch (error) {
      setFolderError(error instanceof Error ? error.message : '폴더 생성 중 오류가 발생했습니다.');
    } finally {
      setIsFolderCreating(false);
    }
  };
  
  // 폴더 삭제 모달 열기
  const openDeleteFolderModal = (folderId: string, folderName: string) => {
    setFolderIdToDelete(folderId);
    setFolderToDelete(folderName);
    setDeleteFolderError(null);
    setShowDeleteFolderModal(true);
  };
  
  // 폴더 삭제 함수
  const deleteFolder = async () => {
    if (!folderIdToDelete || !selectedProjectId || !folderToDelete) return;
    
    try {
      setIsDeletingFolder(true);
      setDeleteFolderError(null);
      
      // 해당 폴더에 있는 모든 문서의 폴더를 "기본 폴더"로 변경
      // API 호출
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
      
      // 폴더 목록 및 문서 목록 새로고침
      await Promise.all([
        fetchFolders(),
        fetchDocuments()
      ]);
      
      // 현재 선택된 폴더가 삭제된 폴더면 선택 해제
      if (selectedFolder === folderToDelete) {
        setSelectedFolder(null);
      }
      
      // 모달 닫기
      setShowDeleteFolderModal(false);
      setFolderToDelete(null);
      setFolderIdToDelete(null);
      
    } catch (error) {
      setDeleteFolderError(error instanceof Error ? error.message : '폴더 삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingFolder(false);
    }
  };
  
  // 로그아웃 함수 (page.tsx에서 가져옴)
  const handleLogout = async () => {
    try {
      await logout();
      router.push("/auth/login"); // 로그아웃 후 로그인 페이지로 이동
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };
  
  // hydration mismatch 방지
  if (!mounted) {
    return null;
  }

  // 로딩 중일 때 (네비게이션 로딩 포함)
  if (loading || authLoading || projectLoading || isNavigating) {
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
          <p className={`mt-6 text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            {isNavigating ? '새 문서로 이동 중...' : '문서를 불러오는 중...'}
          </p>
        </div>
      </div>
    );
  }

  // 사용자 정보가 없거나 프로젝트 정보 로딩 중일 때 리디렉션 (page.tsx 로직 참고)
  if (!authLoading && !user) {
    router.push("/auth/login?callbackUrl=/documents");
    return null;
  }

  if (!authLoading && !projectLoading && user && !hasProjects) {
    router.push("/projects/new");
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* 스크롤바 스타일 적용 */}
      <ModernScrollbarStyles />
      
      {/* 사이드바 (page.tsx에서 가져옴) */}
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
                  href={`/documents?projectId=${project.id}`}
                  small
                  active={selectedProjectId === project.id}
                  onClick={(e) => {
                    e.preventDefault();
                    const newUrl = `/documents?projectId=${project.id}`;
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
              <SidebarLink
                icon={<Trello className="w-5 h-5" />}
                text="칸반보드"
                href={currentProject ? `/kanban?projectId=${currentProject.id}` : "/kanban"}
                active={pathname?.startsWith("/kanban")}
                theme={theme}
                small
              />
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
                  onClick={() => setIsDocumentsSubmenuOpen(!isDocumentsSubmenuOpen)}
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
                  <ChevronRightIcon 
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isDocumentsSubmenuOpen ? 'transform rotate-90' : ''
                    } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                  />
                </button>
                
                {isDocumentsSubmenuOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <SidebarLink
                      icon={<FileTextIcon className="w-4 h-4" />}
                      text="모든 문서"
                      href={currentProject?.id ? `/documents?projectId=${currentProject.id}` : "/documents"}
                      active={pathname === "/documents" && !selectedFolder}
                      theme={theme}
                      small
                    />
                    
                    {/* 폴더 목록 */}
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          setSelectedFolder(folder.name);
                          const url = selectedProjectId 
                            ? `/documents?projectId=${selectedProjectId}&folderId=${folder.id}`
                            : `/documents?folderId=${folder.id}`;
                          router.push(url);
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
                              openDeleteFolderModal(folder.id, folder.name);
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

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none outline-none">
                <UserIcon className="w-6 h-6 mr-3 rounded-full bg-gray-200 dark:bg-gray-600 p-0.5 text-gray-700 dark:text-gray-300" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{user?.name || user?.email || '사용자'}</span>
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
      {/* 폴더 생성 모달 */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4">
            <div className="rounded-lg shadow-xl bg-card text-card-foreground p-6">
              {/* 헤더 */}
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
              
              {/* 본문 */}
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
              
              {/* 푸터 */}
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
      
      {/* 문서 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4">
            <div className="rounded-lg shadow-xl bg-card text-card-foreground p-6">
              {/* 헤더 */}
              <div className="mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mr-4">
                    <AlertCircleIcon className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">문서 삭제</h3>
                  </div>
                </div>
              </div>
              
              {/* 본문 */}
              <div className="mb-6">
                <div className="space-y-4">
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold text-destructive">"{documentToDelete?.title}"</span> 문서를 삭제하시겠습니까?
                    </p>
                    <p className="text-sm text-destructive mt-2">
                      이 작업은 되돌릴 수 없습니다.
                    </p>
                  </div>
                  {deleteError && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive">{deleteError}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 푸터 */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors outline-none focus:outline-none"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDocumentToDelete(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                >
                  취소
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors outline-none focus:outline-none ${isDeleting ? 'opacity-75 cursor-not-allowed' : ''}`}
                  onClick={handleDeleteDocument}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      삭제 중...
                    </span>
                  ) : (
                    '삭제'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 폴더 삭제 모달 */}
      {showDeleteFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4">
            <div className="rounded-lg shadow-xl bg-card text-card-foreground p-6">
              {/* 헤더 */}
              <div className="mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mr-4">
                    <AlertCircleIcon className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">폴더 삭제</h3>
                  </div>
                </div>
              </div>
              
              {/* 본문 */}
              <div className="mb-6">
                <div className="space-y-4">
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold text-destructive">"{folderToDelete}"</span> 폴더를 삭제하시겠습니까?
                    </p>
                    <p className="text-sm text-destructive mt-2">
                      폴더의 모든 문서는 '기본 폴더'로 이동되며, 이 작업은 되돌릴 수 없습니다.
                    </p>
                  </div>
                  {deleteFolderError && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive">{deleteFolderError}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 푸터 */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors outline-none focus:outline-none"
                  onClick={() => {
                    setShowDeleteFolderModal(false);
                    setFolderToDelete(null);
                    setDeleteFolderError(null);
                  }}
                  disabled={isDeletingFolder}
                >
                  취소
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-medium bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg transition-colors outline-none focus:outline-none ${isDeletingFolder ? 'opacity-75 cursor-not-allowed' : ''}`}
                  onClick={deleteFolder}
                  disabled={isDeletingFolder}
                >
                  {isDeletingFolder ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      삭제 중...
                    </span>
                  ) : (
                    '삭제'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
              {/* 메인 콘텐츠 */}
        <main className="flex flex-col flex-1 p-6 lg:p-8 overflow-y-auto bg-background">
        {/* 페이지 헤더 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileTextIcon className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">문서</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            {selectedFolder ? `'${selectedFolder}' 폴더의 문서를 관리하세요` : (selectedProjectId ? '프로젝트 문서를 관리하고 공유하세요' : '팀의 지식을 체계적으로 관리하고 공유하세요')}
          </p>
        </div>
        
        {/* 검색 및 필터 위젯 */}
        <div className="bg-card text-card-foreground rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
                              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문서 검색..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-background text-foreground placeholder:text-muted-foreground border border-border outline-none focus:outline-none transition-colors"
              />
              <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button 
                  className={`p-2 rounded-md transition-colors outline-none focus:outline-none ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <GridIcon className="w-4 h-4" />
                </button>
                <button 
                  className={`p-2 rounded-md transition-colors outline-none focus:outline-none ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon className="w-4 h-4" />
                </button>
              </div>
              
              <div className="h-6 w-px bg-border"></div>
              
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors outline-none focus:outline-none">
                <SortAscIcon className="w-4 h-4" />
                <span>정렬</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors outline-none focus:outline-none">
                <FilterIcon className="w-4 h-4" />
                <span>필터</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* 문서 목록 위젯 */}
        <div className="bg-card text-card-foreground rounded-lg p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <h3 className="text-xl font-semibold text-foreground">
                {selectedFolder ? selectedFolder : "모든 문서"}
                <span className="text-base font-normal text-muted-foreground ml-2">({filteredDocuments.length})</span>
              </h3>
            </div>
            <Button
              size="sm"
              onClick={createNewDocument}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground outline-none focus:outline-none"
            >
              <PlusIcon className="w-4 h-4" />
              <span>새 문서</span>
            </Button>
          </div>
            
          <div className="flex-1">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex">
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}
            
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileTextIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">문서가 없습니다</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  {selectedProjectId 
                    ? `${selectedFolder ? `'${selectedFolder}' 폴더에` : ''} 문서가 없거나 검색 조건에 맞는 문서가 없습니다.` 
                    : '검색 조건에 맞는 문서가 없거나 아직 문서를 작성하지 않았습니다.'}
                </p>
                <Button 
                  onClick={createNewDocument}
                  className="flex items-center gap-2 mx-auto bg-primary hover:bg-primary/90 text-primary-foreground outline-none focus:outline-none"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>새 문서</span>
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDocuments.map(doc => (
                  <Link key={doc.id} href={`/documents/${doc.id}${doc.projectId ? `?projectId=${doc.projectId}` : ''}`}>
                    <div className="bg-muted/30 hover:bg-muted/50 rounded-lg p-4 transition-colors h-full flex flex-col relative group">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-2xl">{doc.emoji || "📄"}</div>
                        <div className="flex items-center space-x-1">
                          {doc.isStarred && <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />}
                        </div>
                      </div>
                      <h3 className="font-medium text-foreground mb-2 line-clamp-2 text-sm">{doc.title}</h3>
                      <div className="flex items-center text-xs text-muted-foreground mb-2">
                        <FolderIcon className="w-3 h-3 mr-1" />
                        <span>{doc.folder || "기본 폴더"}</span>
                      </div>
                      {parseTags(doc.tags).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {parseTags(doc.tags).slice(0, 2).map((tag, index) => (
                            <span key={index} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          {parseTags(doc.tags).length > 2 && (
                            <span className="text-xs text-muted-foreground">+{parseTags(doc.tags).length - 2}</span>
                          )}
                        </div>
                      )}
                      <div className="mt-auto pt-2 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                        <span>{formatDate(doc.updatedAt)}</span>
                      </div>
                      
                      {/* 삭제 버튼 */}
                      <button 
                        onClick={(e) => openDeleteModal(e, doc)}
                        className="absolute top-3 right-3 p-1.5 rounded-md bg-background/80 hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 outline-none focus:outline-none"
                      >
                        <Trash2Icon className="w-3 h-3" />
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-muted/30 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-muted">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">문서</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">폴더</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">태그</th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">수정일</th>
                      <th scope="col" className="relative px-6 py-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-background/50 divide-y divide-border">
                    {filteredDocuments.map(doc => (
                      <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/documents/${doc.id}${doc.projectId ? `?projectId=${doc.projectId}` : ''}`} className="flex items-center">
                            <span className="text-xl mr-3">{doc.emoji || "📄"}</span>
                            <div className="flex items-center">
                              <span className="font-medium text-foreground">{doc.title}</span>
                              {doc.isStarred && <StarIcon className="w-4 h-4 text-yellow-500 ml-2 fill-current" />}
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <FolderIcon className="w-4 h-4 mr-2" />
                            <span>{doc.folder || "기본 폴더"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {parseTags(doc.tags).slice(0, 2).map((tag, index) => (
                              <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                                {tag}
                              </span>
                            ))}
                            {parseTags(doc.tags).length > 2 && (
                              <span className="text-xs text-muted-foreground">+{parseTags(doc.tags).length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {formatDate(doc.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={(e) => openDeleteModal(e, doc)}
                              className="text-muted-foreground hover:text-destructive transition-colors outline-none focus:outline-none"
                            >
                              <Trash2Icon className="w-4 h-4" />
                            </button>
                            <button className="text-muted-foreground hover:text-foreground transition-colors outline-none focus:outline-none">
                              <MoreHorizontalIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}

// DocumentsPageContent 컴포넌트를 Suspense로 감싸는 기본 export
export default function DocumentsPage() {
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
          <p className="text-lg font-medium mt-4">문서 페이지 로딩 중...</p>
          <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
        </div>
      </div>
    }>
      <DocumentsPageContent />
    </Suspense>
  );
} 