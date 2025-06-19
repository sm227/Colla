"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
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
  Trash2Icon,
  XIcon,
  AlertCircleIcon,
  MenuIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import { useProject } from "@/app/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import Sidebar from "@/components/Sidebar";
import { useNotifications } from "@/app/contexts/NotificationContext";

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
  const [mounted, setMounted] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { 
    projects, 
    currentProject, 
    setCurrentProject,
    loading: projectLoading,
    hasProjects
  } = useProject();
  const { showNotificationPanel, setShowNotificationPanel, hasNewNotifications } = useNotifications();
  
  // 테마 관련 코드 수정 (next-themes 사용)
  const { theme: currentTheme, setTheme } = useTheme();
  
  // theme 값 계산
  const theme = (currentTheme || 'dark') as 'light' | 'dark';

  // next-themes hydration 처리를 위한 mounted 상태 추가
  useEffect(() => {
    setMounted(true);
  }, []);
  
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
  
  // URL 파라미터에서 초기값 설정
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(projectIdParam);
  
  // URL의 projectId 파라미터가 변경될 때 상태 업데이트 (초기 로드시에만)
  useEffect(() => {
    if (searchParams) {
      const urlProjectId = searchParams.get('projectId');
      if (urlProjectId !== selectedProjectId) {
        setSelectedProjectId(urlProjectId);
      }
    }
  }, [searchParams, selectedProjectId]);

  // 브라우저 뒤로가기/앞으로가기 감지는 나중에 folders 선언 후에 정의
  

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
  
  // 설정 모달 관련 상태
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
  
  // 고유한 폴더 목록 가져오기
  const [folders, setFolders] = useState<Folder[]>([]);
  
  // 브라우저 뒤로가기/앞으로가기 감지 (사이드바에서 직접 호출하지 않는 경우용)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const newProjectId = urlParams.get('projectId');
        const newFolderId = urlParams.get('folderId');
        
        if (newProjectId !== selectedProjectId) {
          setSelectedProjectId(newProjectId);
        }
        
        if (folders.length > 0) {
          if (newFolderId) {
            const folder = folders.find(f => f.id === newFolderId);
            if (folder && folder.name !== selectedFolder) {
              setSelectedFolder(folder.name);
            }
          } else if (selectedFolder) {
            setSelectedFolder(null);
          }
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedProjectId, selectedFolder, folders]);
  
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
  
  // 모든 문서 데이터 저장 (필터링 전)
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  
  // 문서 데이터 가져오는 함수 (프로젝트별 모든 문서 한번에 로드)
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // 프로젝트별 모든 문서를 한번에 가져옴 (폴더 필터링 없이)
      const urlParams = new URLSearchParams();
      if (selectedProjectId && !showAllDocuments) {
        urlParams.append('projectId', selectedProjectId);
      }
      
      const url = `/api/documents${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('문서를 불러오는 중 문제가 발생했습니다');
      }
      
      const data = await response.json();
      setAllDocuments(data); // 모든 문서 저장
      setError(null);
    } catch (err) {
      setError('문서를 불러오는 중 오류가 발생했습니다');
      setAllDocuments([]);
    } finally {
      setLoading(false);
    }
  };
  
  // 클라이언트 사이드 필터링으로 표시할 문서 계산
  const documents = useMemo(() => {
    let filtered = [...allDocuments];
    
    // 폴더별 필터링
    if (selectedFolder && selectedFolder !== "즐겨찾기") {
      const selectedFolderId = folders.find(f => f.name === selectedFolder)?.id;
      filtered = filtered.filter(doc => doc.folderId === selectedFolderId);
    }
    
    return filtered;
  }, [allDocuments, selectedFolder, folders]);
  
  // URL 파라미터에서 폴더 정보 읽기 및 상태 업데이트 (초기 로드시에만)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const folderId = urlParams.get('folderId');
      
      if (folderId && folders.length > 0) {
        const folder = folders.find(f => f.id === folderId);
        if (folder) {
          setSelectedFolder(folder.name);
        }
      } else {
        // folderId가 없으면 모든 문서 표시
        setSelectedFolder(null);
      }
    }
  }, [folders]);
  
  // 문서 데이터 불러오기 (폴더 변경 시에는 다시 불러오지 않음)
  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/auth/login?callbackUrl=/documents');
      return;
    }
    
    if (user && !authLoading) {
      fetchDocuments();
    }
  }, [user, authLoading, router, selectedProjectId, showAllDocuments]);
  
  // 최종 문서 필터링 (폴더 + 즐겨찾기 + 검색어)
  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];
    
    // 즐겨찾기 필터링
    if (selectedFolder === "즐겨찾기") {
      filtered = filtered.filter(doc => doc.isStarred);
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
  }, [documents, selectedFolder, searchQuery]);

  // 폴더 선택 핸들러 (useCallback으로 최적화)
  const handleFolderSelect = useCallback((folderId: string, folderName: string) => {
    // URL 업데이트 (페이지 새로고침 없이)
    const url = selectedProjectId 
      ? `/documents?projectId=${selectedProjectId}&folderId=${folderId}`
      : `/documents?folderId=${folderId}`;
    window.history.pushState({}, '', url);
    
    // 상태 직접 업데이트 (즉시 필터링됨)
    setSelectedFolder(folderName);
  }, [selectedProjectId]);

  // 모든 문서 선택 핸들러 (useCallback으로 최적화)
  const handleAllDocumentsSelect = useCallback(() => {
    // URL 업데이트 (페이지 새로고침 없이)
    const url = selectedProjectId ? `/documents?projectId=${selectedProjectId}` : "/documents";
    window.history.pushState({}, '', url);
    
    // 상태 직접 업데이트 (즉시 필터링됨)
    setSelectedFolder(null);
  }, [selectedProjectId]);
  
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
      setAllDocuments(allDocuments.filter(doc => doc.id !== documentToDelete.id));
      
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
  
  // 설정 저장 함수
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
  
  // 설정 모달 열기
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
      
      {/* 사이드바 */}
      <Sidebar
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        onSettingsClick={openSettingsModal}
        currentPage="documents"
        onFolderSelect={handleFolderSelect}
        onAllDocumentsSelect={handleAllDocumentsSelect}
      />

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
      
              {/* 모바일 헤더 */}
        <div className="md:hidden bg-background border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <MenuIcon className="w-6 h-6" />
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
        <div className="bg-background rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
                              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="문서 검색..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-muted/30 text-foreground placeholder:text-muted-foreground border border-border outline-none focus:outline-none transition-colors"
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
        <div className="bg-background rounded-lg p-6 flex flex-col">
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