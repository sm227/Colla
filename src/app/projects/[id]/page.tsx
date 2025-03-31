"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboardIcon,
  Trello,
  FileTextIcon,
  ArrowLeftIcon,
  SaveIcon,
  Loader2Icon,
  PencilIcon
} from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import { useProject, Project } from "@/app/contexts/ProjectContext";

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { projects, currentProject, setCurrentProject, loading: projectLoading, refreshProjects } = useProject();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 편집 관련 상태
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 프로젝트 ID로 프로젝트 찾기
  useEffect(() => {
    if (!authLoading && !projectLoading && projects.length > 0) {
      const foundProject = projects.find(p => p.id === params.id);
      
      if (foundProject) {
        setProject(foundProject);
        setCurrentProject(foundProject);
        setName(foundProject.name);
        setDescription(foundProject.description || "");
      } else {
        // 프로젝트를 찾지 못했을 경우 홈으로 리디렉션
        router.push('/');
      }
      
      setIsLoading(false);
    }
  }, [authLoading, projectLoading, projects, params.id, router, setCurrentProject]);

  // 프로젝트 저장 함수
  const saveProject = async () => {
    if (!name.trim()) {
      setSaveError("프로젝트 이름을 입력해주세요.");
      return;
    }
    
    try {
      setIsSaving(true);
      setSaveError("");
      
      const response = await fetch(`/api/projects/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name, 
          description: description.trim() || null 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "프로젝트 수정 중 오류가 발생했습니다.");
      }
      
      // 업데이트된 프로젝트 정보로 상태 업데이트
      setProject(data);
      setCurrentProject(data);
      
      // 모든 프로젝트 리스트 새로고침
      refreshProjects();
      
      // 성공 메시지 표시
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      // 편집 모드 종료
      setIsEditing(false);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 로딩 중이거나 인증되지 않은 경우
  if (authLoading || projectLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자가 없거나 프로젝트를 찾지 못한 경우
  if (!user || !project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center text-gray-500 hover:text-gray-700">
              <ArrowLeftIcon className="w-5 h-5 mr-1" />
              <span>대시보드로 돌아가기</span>
            </Link>
          </div>
          
          {/* 저장 버튼 */}
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setName(project.name);
                    setDescription(project.description || "");
                    setSaveError("");
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                  disabled={isSaving}
                >
                  취소
                </button>
                <button
                  onClick={saveProject}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2Icon className="animate-spin w-4 h-4 mr-2" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="w-4 h-4 mr-2" />
                      저장
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <PencilIcon className="w-4 h-4 mr-2" />
                편집
              </button>
            )}
          </div>
        </div>
        
        {/* 알림 메시지 */}
        {saveError && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">
            <p>{saveError}</p>
          </div>
        )}
        
        {saveSuccess && (
          <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 text-green-700">
            <p>프로젝트가 성공적으로 저장되었습니다.</p>
          </div>
        )}
        
        {/* 프로젝트 제목 */}
        <div className="mb-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  프로젝트 이름 *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-3xl font-bold border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="프로젝트 이름을 입력하세요"
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  설명 (선택사항)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
                />
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="mt-2 text-gray-600">{project.description}</p>
              )}
            </>
          )}
        </div>
        
        {/* 프로젝트 기능 메뉴 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer">
            <Trello className="w-12 h-12 text-purple-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">칸반보드</h2>
            <p className="mt-2 text-gray-600">
              프로젝트 작업을 관리하고 진행 상황을 추적하세요
            </p>
            <Link 
              href={`/kanban?projectId=${project.id}`}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              보드 열기
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer">
            <FileTextIcon className="w-12 h-12 text-green-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">문서</h2>
            <p className="mt-2 text-gray-600">
              프로젝트 문서와 정보를 관리하세요
            </p>
            <Link 
              href={`/documents?projectId=${project.id}`}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              onClick={(e) => {
                e.preventDefault(); // 기본 동작 방지
                console.log("문서 보기 링크 클릭, 프로젝트 ID:", project.id);
                // router.push를 사용하여 프로그래밍 방식으로 이동
                router.push(`/documents?projectId=${project.id}`);
              }}
            >
              문서 보기
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer">
            <LayoutDashboardIcon className="w-12 h-12 text-blue-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">대시보드</h2>
            <p className="mt-2 text-gray-600">
              프로젝트 상태와 데이터를 한눈에 확인하세요
            </p>
            <Link 
              href={`/dashboard?projectId=${project.id}`}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              대시보드 보기
            </Link>
          </div>
        </div>

        {/* 문서 생성 버튼 추가 */}
        <div className="mt-6 flex justify-center">
          <Link
            href={`/documents/new?projectId=${project.id}`}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
            onClick={(e) => {
              e.preventDefault();
              console.log("새 문서 작성 버튼 클릭, 프로젝트 ID:", project.id);
              router.push(`/documents/new?projectId=${project.id}`);
            }}
          >
            <FileTextIcon className="w-5 h-5" />
            <span>새 문서 작성</span>
          </Link>
        </div>
      </div>
    </div>
  );
} 