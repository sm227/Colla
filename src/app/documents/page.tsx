"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  AlertCircleIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";

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

export default function DocumentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  
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
  
  // 로딩 중일 때
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">문서를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 폴더 생성 모달 */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FolderIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">새 폴더 만들기</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        새 폴더를 만들어 문서를 체계적으로 관리하세요.
                      </p>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        placeholder="폴더 이름"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                      />
                      {folderError && (
                        <p className="mt-2 text-sm text-red-600">{folderError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm ${isFolderCreating ? 'opacity-75 cursor-not-allowed' : ''}`}
                  onClick={createFolder}
                  disabled={isFolderCreating}
                >
                  {isFolderCreating ? '생성 중...' : '폴더 생성'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowFolderModal(false);
                    setNewFolderName("");
                    setFolderError(null);
                  }}
                  disabled={isFolderCreating}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <AlertCircleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">문서 삭제</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        <strong>{documentToDelete?.title}</strong> 문서를 삭제하시겠습니까?
                        <br />삭제된 문서는 복구할 수 없습니다.
                      </p>
                      {deleteError && (
                        <p className="mt-2 text-sm text-red-600">{deleteError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${isDeleting ? 'opacity-75 cursor-not-allowed' : ''}`}
                  onClick={handleDeleteDocument}
                  disabled={isDeleting}
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDocumentToDelete(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 폴더 삭제 모달 */}
      {showDeleteFolderModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">폴더 삭제</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        정말 <strong>"{folderToDelete}"</strong> 폴더를 삭제하시겠습니까?
                        <br />
                        <span className="text-red-500">이 폴더의 모든 문서는 '기본 폴더'로 이동됩니다.</span>
                      </p>
                      {deleteFolderError && (
                        <p className="mt-2 text-sm text-red-600">{deleteFolderError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${isDeletingFolder ? 'opacity-75 cursor-not-allowed' : ''}`}
                  onClick={deleteFolder}
                  disabled={isDeletingFolder}
                >
                  {isDeletingFolder ? '삭제 중...' : '삭제'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowDeleteFolderModal(false);
                    setFolderToDelete(null);
                    setDeleteFolderError(null);
                  }}
                  disabled={isDeletingFolder}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 페이지 헤더 */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">문서</h1>
          {selectedProjectId ? (
            <div className="flex flex-col">
              <p className="text-sm text-gray-600">
                {selectedFolder ? `'${selectedFolder}' 폴더 문서` : '프로젝트 문서를 관리하고 공유하세요'}
              </p>
              <div className="mt-2 flex items-center">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllDocuments}
                    onChange={() => setShowAllDocuments(!showAllDocuments)}
                    className="sr-only peer"
                  />
                  <div className="relative w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                  <span className="ml-2 text-xs text-gray-500">모든 문서 보기</span>
                </label>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">팀의 지식을 체계적으로 관리하고 공유하세요</p>
          )}
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={createNewDocument}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            {selectedProjectId ? "프로젝트 문서 작성" : "새 문서 작성"}
          </button>
        </div>
      </div>
      
      {/* 검색 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="문서 검색..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
            />
            <SearchIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-gray-200' : 'bg-white hover:bg-gray-100'}`}
              onClick={() => setViewMode('grid')}
            >
              <GridIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button 
              className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-200' : 'bg-white hover:bg-gray-100'}`}
              onClick={() => setViewMode('list')}
            >
              <ListIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="h-6 border-l border-gray-300"></div>
            <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
              <SortAscIcon className="w-4 h-4" />
              <span>정렬</span>
            </button>
            <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
              <FilterIcon className="w-4 h-4" />
              <span>필터</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 사이드바 - 폴더 목록 */}
        <div className="lg:w-64 bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-medium text-gray-900 mb-4">폴더</h2>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                  selectedFolder === null ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <FileTextIcon className="w-4 h-4 mr-2" />
                  <span>모든 문서</span>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {documents.length}
                </span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setSelectedFolder("즐겨찾기")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                  selectedFolder === "즐겨찾기" ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <StarIcon className="w-4 h-4 mr-2" />
                  <span>즐겨찾기</span>
                </div>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {documents.filter(doc => doc.isStarred).length}
                </span>
              </button>
            </li>
            {folders.length > 0 && (
              <li className="pt-2 mt-2 border-t border-gray-200">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  내 폴더
                </h3>
                {folders.map(folder => (
                  <div 
                    key={folder.id}
                    className="flex justify-between items-center"
                  >
                    <button
                      onClick={() => setSelectedFolder(folder.name)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                        selectedFolder === folder.name ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center">
                        <FolderIcon className="w-4 h-4 mr-2" />
                        <span>{folder.name}</span>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {documents.filter(doc => doc.folderId === folder.id).length}
                      </span>
                    </button>
                    
                    {/* 폴더 삭제 버튼 */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteFolderModal(folder.id, folder.name);
                      }}
                      className="ml-1 p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2Icon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </li>
            )}
            <li className="pt-2 mt-2">
              <button 
                onClick={() => setShowFolderModal(true)}
                className="w-full flex items-center px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                <span>새 폴더 추가</span>
              </button>
            </li>
          </ul>
        </div>
        
        {/* 메인 콘텐츠 - 문서 목록 */}
        <div className="flex-1">
          <div className="mb-4">
            <h2 className="text-lg font-medium text-gray-900">
              {selectedFolder ? selectedFolder : "모든 문서"}
              <span className="text-sm text-gray-500 ml-2">({filteredDocuments.length})</span>
            </h2>
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}
          
          {filteredDocuments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <FileTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">문서가 없습니다</h3>
              <p className="text-gray-600 mb-4">
                {selectedProjectId 
                  ? `${selectedFolder ? `'${selectedFolder}' 폴더에` : ''} 문서가 없거나 검색 조건에 맞는 문서가 없습니다.` 
                  : '검색 조건에 맞는 문서가 없거나 아직 문서를 작성하지 않았습니다.'}
              </p>
              <button
                onClick={createNewDocument}
                className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                {selectedProjectId ? '프로젝트 문서 작성' : '새 문서 작성'}
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map(doc => (
                <Link key={doc.id} href={`/documents/${doc.id}${doc.projectId ? `?projectId=${doc.projectId}` : ''}`}>
                  <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow h-full flex flex-col relative group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-3xl">{doc.emoji || "📄"}</div>
                      <div className="flex items-center space-x-1">
                        {doc.isStarred && <StarIcon className="w-5 h-5 text-yellow-400" />}
                      </div>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">{doc.title}</h3>
                    <div className="flex items-center text-xs text-gray-500 mb-2">
                      <FolderIcon className="w-3 h-3 mr-1" />
                      <span>{doc.folder || "기본 폴더"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2 mb-3">
                      {parseTags(doc.tags).map((tag, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                      <span>{formatDate(doc.updatedAt)}</span>
                    </div>
                    
                    {/* 삭제 버튼 */}
                    <button 
                      onClick={(e) => openDeleteModal(e, doc)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-white shadow hover:bg-red-50 z-10"
                    >
                      <Trash2Icon className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">문서</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">폴더</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">태그</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수정일</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/documents/${doc.id}${doc.projectId ? `?projectId=${doc.projectId}` : ''}`} className="flex items-center">
                          <span className="text-xl mr-3">{doc.emoji || "📄"}</span>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">{doc.title}</span>
                            {doc.isStarred && <StarIcon className="w-4 h-4 text-yellow-400 ml-2" />}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <FolderIcon className="w-4 h-4 mr-1" />
                          <span>{doc.folder || "기본 폴더"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {parseTags(doc.tags).map((tag, index) => (
                            <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={(e) => openDeleteModal(e, doc)}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2Icon className="w-5 h-5" />
                          </button>
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreHorizontalIcon className="w-5 h-5" />
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
    </div>
  );
} 