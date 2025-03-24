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

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const editorRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // 샘플 폴더 및 문서 데이터
  const folders = [
    { id: "1", name: "프로젝트 문서", count: 8 },
    { id: "2", name: "회의록", count: 12 },
    { id: "3", name: "가이드라인", count: 5 },
    { id: "4", name: "아이디어", count: 3 },
    { id: "5", name: "리서치", count: 7 }
  ];
  
  const documents = [
    { 
      id: "1", 
      title: "제품 로드맵 2024", 
      folder: "프로젝트 문서", 
      updatedAt: "2023-06-10T14:30:00", 
      createdBy: "김지민",
      starred: true,
      tags: ["로드맵", "전략"],
      emoji: "🚀"
    },
    { 
      id: "2", 
      title: "디자인 시스템 가이드", 
      folder: "가이드라인", 
      updatedAt: "2023-06-08T09:15:00", 
      createdBy: "박소연",
      starred: false,
      tags: ["디자인", "UI"],
      emoji: "🎨"
    },
    { 
      id: "3", 
      title: "주간 팀 미팅 회의록", 
      folder: "회의록", 
      updatedAt: "2023-06-05T11:00:00", 
      createdBy: "이승우",
      starred: true,
      tags: ["회의", "주간"],
      emoji: "📝"
    },
    { 
      id: "4", 
      title: "사용자 인터뷰 결과", 
      folder: "리서치", 
      updatedAt: "2023-06-03T16:45:00", 
      createdBy: "최준호",
      starred: false,
      tags: ["사용자", "인터뷰"],
      emoji: "🔍"
    },
    { 
      id: "5", 
      title: "마케팅 전략 2024", 
      folder: "프로젝트 문서", 
      updatedAt: "2023-06-01T13:20:00", 
      createdBy: "한민수",
      starred: false,
      tags: ["마케팅", "전략"],
      emoji: "📊"
    },
    { 
      id: "6", 
      title: "신규 기능 아이디어", 
      folder: "아이디어", 
      updatedAt: "2023-05-28T10:30:00", 
      createdBy: "정다은",
      starred: false,
      tags: ["아이디어", "기능"],
      emoji: "💡"
    },
    { 
      id: "7", 
      title: "경쟁사 분석 보고서", 
      folder: "리서치", 
      updatedAt: "2023-05-25T15:10:00", 
      createdBy: "김지민",
      starred: true,
      tags: ["경쟁사", "분석"],
      emoji: "📈"
    },
    { 
      id: "8", 
      title: "개발 환경 설정 가이드", 
      folder: "가이드라인", 
      updatedAt: "2023-05-20T09:45:00", 
      createdBy: "최준호",
      starred: false,
      tags: ["개발", "환경설정"],
      emoji: "⚙️"
    }
  ];
  
  // URL 쿼리 파라미터로부터 프로젝트 ID를 가져옴
  useEffect(() => {
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
    }
  }, [projectIdParam]);
  
  // 필터링된 문서 목록
  const filteredDocuments = documents.filter(doc => {
    // 검색어 필터링
    const matchesSearch = searchQuery === "" || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 폴더 필터링
    const matchesFolder = selectedFolder === null || doc.folder === selectedFolder;
    
    return matchesSearch && matchesFolder;
  });
  
  const createNewDocument = () => {
    router.push("/documents/new");
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 페이지 헤더 */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">문서</h1>
          <p className="text-sm text-gray-600">팀의 지식을 체계적으로 관리하고 공유하세요</p>
        </div>
        <div className="mt-4 md:mt-0">
          <button
            onClick={createNewDocument}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            새 문서 작성
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
                  {documents.filter(doc => doc.starred).length}
                </span>
              </button>
            </li>
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
          
          {filteredDocuments.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <FileTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">문서가 없습니다</h3>
              <p className="text-gray-600 mb-4">검색 조건에 맞는 문서가 없거나 아직 문서를 작성하지 않았습니다.</p>
              <button
                onClick={createNewDocument}
                className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                새 문서 작성
              </button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map(doc => (
                <Link key={doc.id} href={`/documents/${doc.id}`}>
                  <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow h-full flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-3xl">{doc.emoji}</div>
                      {doc.starred && <StarIcon className="w-5 h-5 text-yellow-400" />}
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2">{doc.title}</h3>
                    <div className="flex items-center text-xs text-gray-500 mb-2">
                      <FolderIcon className="w-3 h-3 mr-1" />
                      <span>{doc.folder}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2 mb-3">
                      {doc.tags.map((tag, index) => (
                        <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-auto pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                      <span>{formatDate(doc.updatedAt)}</span>
                      <span>{doc.createdBy}</span>
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작성자</th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/documents/${doc.id}`} className="flex items-center">
                          <span className="text-xl mr-3">{doc.emoji}</span>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-900">{doc.title}</span>
                            {doc.starred && <StarIcon className="w-4 h-4 text-yellow-400 ml-2" />}
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500">
                          <FolderIcon className="w-4 h-4 mr-1" />
                          <span>{doc.folder}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.map((tag, index) => (
                            <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {doc.createdBy}
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