"use client";

import { useState, useEffect, useRef } from "react";
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
  BookmarkIcon
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
  tags: string | null; // JSON 문자열
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const editorRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [showAllDocuments, setShowAllDocuments] = useState(false);
  
  // 고유한 폴더 목록 가져오기
  const folders = Array.from(new Set(
    documents
      .filter(doc => doc.folder)
      .map(doc => doc.folder)
  )).map(folderName => ({
    id: folderName,
    name: folderName,
    count: documents.filter(doc => doc.folder === folderName).length
  }));
  
  // URL 쿼리 파라미터로부터 프로젝트 ID를 가져옴
  useEffect(() => {
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
      
      // 프로젝트 이름 가져오기
      const fetchProjectName = async () => {
        try {
          const response = await fetch(`/api/projects/${projectIdParam}`);
          if (response.ok) {
            const project = await response.json();
            setProjectName(project.name);
          }
        } catch (error) {
          // 에러 처리는 조용히 진행
        }
      };
      
      fetchProjectName();
    } else {
      setSelectedProjectId(null);
      setProjectName(null);
    }
  }, [projectIdParam]);
  
  // 문서 데이터 불러오기
  useEffect(() => {
    if (!user && !authLoading) {
      router.push('/auth/login');
      return;
    }
    
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
    
    if (user && !authLoading) {
      fetchDocuments();
    }
  }, [user, authLoading, router, selectedProjectId, showAllDocuments]);
  
  // 필터링된 문서 목록 - 서버에서 이미 프로젝트 필터링이 완료된 상태이므로
  // 클라이언트에서는 검색어와 폴더로만 추가 필터링
  const filteredDocuments = documents.filter(doc => {
    // 검색어 필터링
    const matchesSearch = searchQuery === "" || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.tags && JSON.parse(doc.tags).some((tag: string) => 
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    
    // 폴더 필터링
    const matchesFolder = selectedFolder === null || doc.folder === selectedFolder;
    
    // 프로젝트 ID 필터링
    const matchesProject = showAllDocuments || !selectedProjectId || doc.projectId === selectedProjectId;
    
    return matchesSearch && matchesFolder && matchesProject;
  });
  
  const createNewDocument = () => {
    // 프로젝트 ID가 있고 빈 문자열이 아닐 때만 쿼리스트링 추가
    const searchParams = new URLSearchParams();
    if (selectedProjectId && selectedProjectId !== '') {
      searchParams.append('projectId', selectedProjectId);
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
      {/* 페이지 헤더 */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">문서</h1>
          {selectedProjectId ? (
            <div className="flex flex-col">
              <p className="text-sm text-gray-600">
                {projectName ? `'${projectName}' 프로젝트 문서` : '프로젝트 문서를 관리하고 공유하세요'}
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono">
                  프로젝트: {selectedProjectId.substring(0, 8)}
                </span>
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
                  <button
                    key={folder.id}
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
                      {folder.count}
                    </span>
                  </button>
                ))}
              </li>
            )}
            <li className="pt-2 mt-2">
              <button className="w-full flex items-center px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100">
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
                  ? `'${projectName || '선택된 프로젝트'}'에 문서가 없거나 검색 조건에 맞는 문서가 없습니다.` 
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
                  <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow h-full flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-3xl">{doc.emoji || "📄"}</div>
                      <div className="flex items-center space-x-1">
                        {doc.projectId && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            프로젝트
                          </span>
                        )}
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
                        <button className="text-gray-400 hover:text-gray-600">
                          <MoreHorizontalIcon className="w-5 h-5" />
                        </button>
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