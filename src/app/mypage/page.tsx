"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  UserIcon, 
  FolderIcon, 
  ClipboardListIcon, 
  LockIcon, 
  CheckIcon,
  ArrowLeftIcon,
  Trello
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../contexts/AuthContext";
import { useProject } from "../contexts/ProjectContext";
import { useTasks } from "@/hooks/useTasks";

// 작업 타입 정의
interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: string;
  dueDate?: string;
  project?: {
    id: string;
    name: string;
  };
}

// 그룹화된 작업 타입
interface GroupedTasks {
  [projectId: string]: {
    projectName: string;
    tasks: Task[];
  };
}

export default function MyPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, updatePassword } = useAuth();
  const { projects, loading: projectLoading, currentProject, setCurrentProject } = useProject();
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [activeTab, setActiveTab] = useState("projects"); // 'projects' 또는 'account'
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState("");
  const [profileUpdateError, setProfileUpdateError] = useState("");

  // 인증 상태 확인 및 리디렉션
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    }
  }, [authLoading, user, router]);

  // 사용자 작업 데이터 가져오기
  useEffect(() => {
    if (user) {
      const fetchMyTasks = async () => {
        try {
          setIsLoadingTasks(true);
          // 로깅 추가
          console.log("사용자 작업 요청 시작:", user.id);
          
          // 프로젝트별 필터링을 제거하고 모든 프로젝트의 작업 표시
          // 현재 프로젝트 ID 가져오기 (null로 설정하여 전체 프로젝트 표시)
          const projectIdParam = "";
          console.log("모든 프로젝트의 작업 표시");
          
          // 토큰 가져오기 (쿠키에서 직접 가져옴)
          const cookies = document.cookie.split(';');
          let token = null;
          for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'token') {
              token = value;
              break;
            }
          }
          
          console.log("쿠키에서 가져온 토큰:", token ? "토큰 있음" : "토큰 없음");
          
          const headers: HeadersInit = {
            'Content-Type': 'application/json'
          };
          
          // 토큰이 있으면 Authorization 헤더 추가
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          // 인증 없이 테스트 목적으로 데이터 가져오기
          const response = await fetch(`/api/tasks/user/${user.id}${projectIdParam}`, {
            method: 'GET',
            headers: headers,
            cache: 'no-store',
            credentials: 'include' // 쿠키 포함
          });
          
          console.log("API 응답 상태:", response.status);
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error("API 오류 응답:", errorData);
            throw new Error(errorData.error || "작업을 불러오는 데 실패했습니다");
          }
          
          const data = await response.json();
          console.log("가져온 작업 수:", data.length);
          setMyTasks(data);
        } catch (error) {
          console.error("작업 로딩 오류:", error);
          // 오류가 발생해도 빈 배열 설정
          setMyTasks([]);
        } finally {
          setIsLoadingTasks(false);
        }
      };

      fetchMyTasks();
    }
  }, [user]);

  // 작업 목록을 프로젝트별로 그룹화하는 함수
  const getGroupedTasks = (): GroupedTasks => {
    const grouped: GroupedTasks = {};
    
    // 프로젝트가 없는 작업용 그룹
    grouped['no-project'] = {
      projectName: '프로젝트 없음',
      tasks: []
    };
    
    // 각 작업을 프로젝트 ID별로 그룹화
    myTasks.forEach(task => {
      if (task.project) {
        // 프로젝트가 있는 경우
        const projectId = task.project.id;
        
        if (!grouped[projectId]) {
          grouped[projectId] = {
            projectName: task.project.name,
            tasks: []
          };
        }
        
        grouped[projectId].tasks.push(task);
      } else {
        // 프로젝트가 없는 작업
        grouped['no-project'].tasks.push(task);
      }
    });
    
    // 빈 그룹 제거
    Object.keys(grouped).forEach(key => {
      if (grouped[key].tasks.length === 0) {
        delete grouped[key];
      }
    });
    
    return grouped;
  };
  
  // 그룹화된 작업 목록 구하기
  const groupedTasks = getGroupedTasks();

  // 내 작업 섹션 렌더링
  const renderTasksSection = () => {
    if (isLoadingTasks) {
      return (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">작업 불러오는 중...</p>
        </div>
      );
    }

    if (myTasks.length === 0) {
      return (
        <div className="text-center py-6">
          <p className="text-gray-500">할당된 작업이 없습니다.</p>
          <Link 
            href="/kanban"
            className="mt-2 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            모든 작업 보기
          </Link>
        </div>
      );
    }

    // 프로젝트별로 그룹화된 작업 목록 표시
    return (
      <div className="space-y-6">
        {Object.keys(groupedTasks).map(projectId => (
          <div key={projectId} className="mb-6">
            <h3 className="text-md font-medium text-gray-800 mb-3 pb-2 border-b">
              {groupedTasks[projectId].projectName}
              <span className="ml-2 text-xs text-gray-500">
                ({groupedTasks[projectId].tasks.length}개)
              </span>
            </h3>
            
            <div className="space-y-3">
              {groupedTasks[projectId].tasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <Link href={`/kanban?task=${task.id}`} className="block">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="mr-3 p-2 bg-gray-100 rounded-full">
                          <Trello className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{task.title}</h3>
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                            {task.description || "설명 없음"}
                          </p>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            {renderStatusBadge(task.status)}
                            {renderPriorityBadge(task.priority)}
                            
                            {task.dueDate && (
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                마감: {new Date(task.dueDate).toLocaleDateString('ko-KR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 비밀번호 변경 처리
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    if (newPassword !== confirmPassword) {
      setError("새 비밀번호가 일치하지 않습니다");
      return;
    }

    if (newPassword.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다");
      return;
    }

    try {
      // 인증 실패시를 대비해 user.id도 함께 전송
      await updatePassword(password, newPassword, user?.id);
      setSuccess("비밀번호가 성공적으로 변경되었습니다");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError("");
    } catch (error: any) {
      setError(error.message || "비밀번호 변경 중 오류가 발생했습니다");
      setSuccess("");
    }
  };

  // 사용자 프로필 업데이트 함수
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 간단한 유효성 검사
    if (!name.trim() || !email.trim()) {
      setProfileUpdateError("이름과 이메일은 필수 입력 항목입니다.");
      return;
    }
    
    // 여기에 사용자 정보 업데이트 API 호출을 구현하세요
    // 실제 구현 시에는 API 엔드포인트를 만들고 호출해야 합니다
    try {
      // 예시 코드: API 호출
      // const response = await fetch('/api/user/profile', {
      //   method: 'PUT',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ name, email }),
      // });
      
      // 성공 메시지 설정 (실제 구현 시에는 API 응답에 따라 처리)
      setProfileUpdateSuccess("프로필이 성공적으로 업데이트되었습니다.");
      setProfileUpdateError("");
    } catch (error) {
      setProfileUpdateError("프로필 업데이트 중 오류가 발생했습니다.");
      setProfileUpdateSuccess("");
    }
  };

  // 로딩 중 표시
  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자가 없으면 로그인 페이지로 이동 (useEffect에서 처리)
  if (!user) {
    return null;
  }

  // 상태 배지 렌더링 함수
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "todo":
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">할 일</span>;
      case "in-progress":
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">진행 중</span>;
      case "done":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">완료</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{status}</span>;
    }
  };

  // 우선순위 배지 렌더링 함수
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">높음</span>;
      case "medium":
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">중간</span>;
      case "low":
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">낮음</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">{priority}</span>;
    }
  };

  // 탭 전환 함수
  const switchTab = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto pt-8 px-4 sm:px-6 lg:px-8">
        {/* 뒤로가기 버튼 */}
        <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          대시보드로 돌아가기
        </Link>

        {/* 사용자 프로필 카드 */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex flex-col space-y-8">
          {/* 프로젝트 및 작업 통합 섹션 */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <ul className="flex border-b">
                <li className="-mb-px mr-1">
                  <a 
                    href="#projects" 
                    onClick={(e) => { e.preventDefault(); switchTab("projects"); }}
                    className={`inline-block py-2 px-4 font-medium rounded-t ${
                      activeTab === "projects" 
                        ? "bg-white text-blue-600 border-l border-t border-r border-gray-200" 
                        : "bg-gray-100 text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    프로젝트 및 작업
                  </a>
                </li>
                <li className="mr-1">
                  <a 
                    href="#account" 
                    onClick={(e) => { e.preventDefault(); switchTab("account"); }}
                    className={`inline-block py-2 px-4 font-medium rounded-t ${
                      activeTab === "account" 
                        ? "bg-white text-blue-600 border-l border-t border-r border-gray-200" 
                        : "bg-gray-100 text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    계정 관리
                  </a>
                </li>
              </ul>
            </div>
            
            <div className="p-4">
              {/* 프로젝트 및 작업 탭 */}
              <div id="projects" className={activeTab === "projects" ? "block" : "hidden"}>
                {/* 내 프로젝트 섹션 */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">내 프로젝트</h2>
                    <Link 
                      href="/projects/new"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      새 프로젝트
                    </Link>
                  </div>
                  
                  {projects.length > 0 ? (
                    <div className="space-y-4">
                      {projects.map((project) => (
                        <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <Link href={`/?projectId=${project.id}`} className="block">
                            <div className="flex items-center">
                              <div className="mr-3 p-2 bg-gray-100 rounded-full">
                                <FolderIcon className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{project.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  {project.description || "프로젝트 설명이 없습니다."}
                                </p>
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-500">아직 프로젝트가 없습니다.</p>
                      <Link 
                        href="/projects/new"
                        className="mt-2 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        새 프로젝트 생성
                      </Link>
                    </div>
                  )}
                </div>

                {/* 내 작업 섹션 - 프로젝트 탭 안에 통합 */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium">
                      내 작업
                    </h2>
                    <Link 
                      href="/kanban"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      모든 작업 보기
                    </Link>
                  </div>
                  
                  {renderTasksSection()}
                </div>
              </div>

              {/* 계정 관리 탭 */}
              <div id="account" className={activeTab === "account" ? "block" : "hidden"}>
                {/* 프로필 정보 섹션 */}
                <div className="mb-8">
                  <h3 className="text-md font-medium mb-4">프로필 정보</h3>
                  <div className="space-y-4">
                    {/* 이름 표시 */}
                    <div className="mb-4">
                      <p className="block text-sm font-medium text-gray-700 mb-1">
                        이름
                      </p>
                      <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-800">
                        {user?.name}
                      </div>
                    </div>
                    
                    {/* 이메일 표시 */}
                    <div className="mb-4">
                      <p className="block text-sm font-medium text-gray-700 mb-1">
                        이메일
                      </p>
                      <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-800">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 비밀번호 변경 섹션 */}
                <div>
                  <h3 className="text-md font-medium mb-4">비밀번호 변경</h3>
                  <form onSubmit={handlePasswordChange}>
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
                        {error}
                      </div>
                    )}
                    
                    {success && (
                      <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
                        <CheckIcon className="w-5 h-5 mr-2" />
                        {success}
                      </div>
                    )}
                    
                    <div className="mb-4">
                      <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                        현재 비밀번호
                      </label>
                      <input
                        type="password"
                        id="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                        새 비밀번호
                      </label>
                      <input
                        type="password"
                        id="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        minLength={6}
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                        새 비밀번호 확인
                      </label>
                      <input
                        type="password"
                        id="confirm-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        minLength={6}
                        required
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      비밀번호 변경
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 