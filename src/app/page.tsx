// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  VideoIcon,
  UsersIcon,
  Share2Icon,
  Trello,
  FileTextIcon,
  CalendarIcon,
  MessageSquareIcon,
  LayoutDashboardIcon,
  ClipboardListIcon,
  SearchIcon,
  BellIcon,
  UserIcon,
  SettingsIcon,
  HomeIcon,
  FolderIcon,
  PlusIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  BarChart3Icon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./contexts/AuthContext";
import { useProject } from "./contexts/ProjectContext";
import { Task, TaskStatus } from "@/components/kanban/KanbanBoard";
import { useTasks } from "@/hooks/useTasks";

// 알림 타입 정의
type Notification = {
  id: string;
  type: "invitation" | "document_update" | "task_assigned" | "generic";
  title: string;
  message: string;
  link: string;
  createdAt: string; // ISO 문자열 또는 Date 객체
  isRead?: boolean;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
};

// Invitation 타입을 page.tsx 내에 정의 (또는  import)
type Invitation = {
  id: string;
  projectId: string;
  // userId: string; // Notification에서는 직접 사용 안 함
  // role: string; // Notification에서는 직접 사용 안 함
  // inviteStatus: string; // Notification에서는 직접 사용 안 함 (pending 상태의 초대만 가져올 것이므로)
  createdAt: string;
  // updatedAt: string; // Notification에서는 직접 사용 안 함
  project: {
    id: string;
    name: string;
    // description?: string; // Notification에서는 직접 사용 안 함
    user?: { // 초대자 정보
      // id: string;
      name: string;
      // email: string;
    };
  };
};

// 실제 프로젝트 초대 알림을 가져오는 함수
const fetchProjectInvitationsAsNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await fetch("/api/projects/invitations", {
      headers: {
        "Cache-Control": "no-cache", // 최신 데이터를 가져오도록 설정
      },
    });

    if (!response.ok) {
      // API 에러 응답을 좀 더 자세히 로깅하거나 사용자에게 알릴 수 있습니다.
      console.error("Failed to fetch invitations:", response.status, await response.text());
      // 빈 배열을 반환하거나, 에러를 throw하여 호출부에서 처리하게 할 수 있습니다.
      // 여기서는 빈 배열을 반환하여 알림창에 '에러 발생' 대신 '알림 없음'으로 표시되도록 합니다.
      return [];
    }

    const invitations: Invitation[] = await response.json();

    // Invitation[]을 Notification[]으로 변환
    // API 응답에서 inviteStatus가 'pending'인 것만 필터링해야 할 수 있습니다.
    // 현재는 API가 pending 상태의 초대만 반환한다고 가정합니다.
    return invitations.map((invitation) => ({
      id: invitation.id, // 각 알림의 고유 ID로 사용
      type: "invitation",
      title: `'${invitation.project.name}' 프로젝트 초대`,
      message: `초대자: ${invitation.project.user?.name || '정보 없음'}`,
      link: "/projects/invitations", // 초대 확인 페이지로 링크
      createdAt: invitation.createdAt,
      icon: <UsersIcon className="w-5 h-5" />,
      iconBgColor: "bg-blue-50",
      iconColor: "text-blue-500",
      isRead: false, // 기본적으로 읽지 않음 상태
    }));
  } catch (error) {
    console.error("Error fetching or processing project invitations:", error);
    return []; // 에러 발생 시 빈 배열 반환
  }
};

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, loading: authLoading, logout } = useAuth();
  const {
    projects,
    hasProjects,
    loading: projectLoading,
    currentProject,
    setCurrentProject,
  } = useProject();
  const { tasks = [], loading: tasksLoading } = useTasks(
    currentProject?.id || null
  );

  // 알림 상태 관리
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  // Handle redirects with useEffect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    } else if (!authLoading && !projectLoading && user && !hasProjects) {
      // 프로젝트가 없는 경우에만 프로젝트 생성 페이지로 리디렉션
      router.push("/projects/new");
    }
    // 프로젝트가 있는 경우 현재 대시보드 페이지에 머무름
  }, [authLoading, projectLoading, user, hasProjects, router]);

  // 현재 프로젝트가 선택되지 않았으면 첫 번째 프로젝트 선택
  useEffect(() => {
    if (hasProjects && !currentProject && projects.length > 0) {
      setCurrentProject(projects[0]);
    }
  }, [hasProjects, currentProject, projects, setCurrentProject]);

  // 날짜 포맷팅 함수 (기존 함수 재사용 또는 개선)
  const formatDateForNotification = (dateStr: string | Date | null) => {
    if (!dateStr) return "날짜 없음";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    if (diffHour < 24) return `${diffHour}시간 전`;
    if (diffDay === 1) return `어제`;
    if (diffDay < 7) return `${diffDay}일 전`;
    return date.toLocaleDateString("ko-KR");
  };
  
  // 알림 데이터 가져오기
  useEffect(() => {
    if (showNotifications) { // 알림창이 열릴 때마다 데이터를 새로고침하도록 변경 (선택사항)
    // 또는 notifications.length === 0 조건 유지하여 최초 한 번만 로드
    // if (showNotifications && notifications.length === 0) {
      const loadNotifications = async () => {
        setNotificationLoading(true);
        setNotificationError(null);
        try {
          // 실제 프로젝트 초대 알림 가져오기
          const invitationNotifications = await fetchProjectInvitationsAsNotifications();
          
          // TODO: 다른 유형의 알림 (예: 문서, 작업 등)을 가져오는 로직 추가
          // const otherNotifications = await fetchOtherNotificationTypes();
          // setNotifications([...invitationNotifications, ...otherNotifications].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

          // 현재는 초대 알림만 표시
          setNotifications(invitationNotifications.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

        } catch (err: any) {
          setNotificationError(err.message || "알림 로딩 중 오류 발생");
          setNotifications([]);
        } finally {
          setNotificationLoading(false);
        }
      };
      loadNotifications();
    }
  // }, [showNotifications, notifications.length]); // 최초 한 번 로드 조건
  }, [showNotifications]); // 알림창 열릴 때마다 새로고침 조건

  // 로딩 중이면 로딩 표시
  if (authLoading || projectLoading || tasksLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 사용자가 없거나 프로젝트가 없으면 빈 화면 렌더링 (useEffect에서 리디렉션 처리)
  if (!user || !hasProjects) {
    return null;
  }

  const createNewMeeting = () => {
    const newRoomId = uuidv4().substring(0, 8);
    router.push(`/meeting/${newRoomId}`);
  };

  const joinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/meeting/${roomId}`);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 바 */}
      <nav className="bg-white border-b border-gray-200 fixed w-full z-30">
        <div className="px-4 py-3 flex justify-between items-center">
          <div className="flex items-center">
            <button
              className="md:hidden mr-2"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
              {mobileSidebarOpen ? (
                <XIcon className="w-6 h-6" />
              ) : (
                <MenuIcon className="w-6 h-6" />
              )}
            </button>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center mr-2">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">Colla</span>
            </div>
          </div>

          <div className="flex-1 mx-10 hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="검색..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <SearchIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
              >
                <BellIcon className="w-5 h-5 text-gray-600" />
                {/* 알림 배지 개선 - 알림이 있을 때만 표시 */}
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full shadow-sm animate-pulse">
                    {/* 실제 읽지 않은 알림 수 또는 전체 알림 수 표시 */}
                    {notifications.filter(n => !n.isRead).length > 0 ? notifications.filter(n => !n.isRead).length : notifications.length}
                  </span>
                )}
              </button>
              {/* 알림창 UI 시작 */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-medium text-gray-900">알림</h3>
                      <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600">
                        <XIcon className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {notificationLoading && (
                      <div className="flex justify-center items-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    )}

                    {notificationError && (
                      <div className="text-center py-10 text-red-500">
                        <p>{notificationError}</p>
                      </div>
                    )}

                    {!notificationLoading && !notificationError && notifications.length === 0 && (
                      <div className="text-center py-10 text-gray-500">
                        <BellIcon className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                        <p>새로운 알림이 없습니다.</p>
                      </div>
                    )}

                    {!notificationLoading && !notificationError && notifications.length > 0 && (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={`p-3 rounded-md flex items-start ${notification.iconBgColor || 'bg-gray-50'}`}
                            onClick={() => {
                              // TODO: 알림 읽음 처리 API 호출 등
                              router.push(notification.link);
                              setShowNotifications(false);
                            }}
                          >
                            <div className={`flex-shrink-0 p-1.5 rounded-full ${notification.iconBgColor ? notification.iconBgColor.replace('bg-', 'bg-opacity-20 ') : 'bg-gray-100'} mr-3`}>
                              {notification.icon || <BellIcon className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${notification.iconColor || 'text-gray-900'}`}>{notification.title}</p>
                              <p className="text-xs text-gray-600 mt-0.5 truncate">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatDateForNotification(notification.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-4 text-center border-t pt-3">
                      <Link 
                        href="/notifications" // TODO: 모든 알림 보기 페이지 경로로 수정
                        onClick={() => setShowNotifications(false)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800"
                      >
                        모든 알림 보기
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              {/* 알림창 UI 끝 */}
            </div>
            <div className="relative">
              <Link href="/mypage" className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-gray-600" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 사이드바 및 메인 콘텐츠 */}
      <div className="flex pt-16">
        {/* 사이드바 - 모바일에서는 오버레이로 표시 */}
        <aside
          className={`fixed inset-y-0 left-0 z-20 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:relative md:w-64 md:flex-shrink-0`}
        >
          <div className="h-full overflow-y-auto">
            <div className="px-4 py-5">
              <nav className="space-y-1">
                <SidebarLink
                  icon={<HomeIcon className="w-5 h-5" />}
                  text="홈"
                  href="/"
                  active={true}
                />
                <SidebarLink
                  icon={<VideoIcon className="w-5 h-5" />}
                  text="화상 회의"
                  href="/meeting"
                />
                <SidebarLink
                  icon={<Trello className="w-5 h-5" />}
                  text="칸반보드"
                  href={
                    currentProject
                      ? `/kanban?projectId=${currentProject.id}`
                      : "/kanban"
                  }
                />
                <SidebarLink
                  icon={<FileTextIcon className="w-5 h-5" />}
                  text="문서"
                  href={
                    currentProject?.id
                      ? `/documents?projectId=${currentProject.id}`
                      : "/documents"
                  }
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (currentProject?.id) {
                      e.preventDefault();
                      console.log(
                        "사이드바에서 문서 클릭, 프로젝트 ID:",
                        currentProject.id
                      );

                      // 유효한 프로젝트 ID인지 확인 후 이동
                      fetch(`/api/projects/${currentProject.id}`)
                        .then((response) => {
                          if (response.ok) {
                            router.push(
                              `/documents?projectId=${currentProject.id}`
                            );
                          } else {
                            console.error(
                              "유효하지 않은 프로젝트 ID:",
                              currentProject.id
                            );
                            alert(
                              "선택된 프로젝트에 접근할 수 없습니다. 일반 문서 목록으로 이동합니다."
                            );
                            router.push("/documents");
                          }
                        })
                        .catch((error) => {
                          console.error("프로젝트 확인 중 오류:", error);
                          router.push("/documents");
                        });
                    }
                  }}
                />
                <SidebarLink
                  icon={<CalendarIcon className="w-5 h-5" />}
                  text="일정"
                  href="/calendar"
                />
                <SidebarLink
                  icon={<MessageSquareIcon className="w-5 h-5" />}
                  text="메시지"
                  href="/messages"
                />
                <SidebarLink
                  icon={<BarChart3Icon className="w-5 h-5" />}
                  text="보고서"
                  href="/reports"
                />
                <SidebarLink
                  icon={<UsersIcon className="w-5 h-5" />}
                  text="팀원 관리"
                  href={
                    currentProject
                      ? `/projects/${currentProject.id}/members`
                      : "/projects"
                  }
                />
                <SidebarLink
                  icon={<BellIcon className="w-5 h-5" />}
                  text="초대 확인"
                  href="/projects/invitations"
                />
              </nav>

              <div className="mt-8">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  프로젝트
                </h3>
                <nav className="mt-2 space-y-1">
                  {projects.map((project) => (
                    <SidebarLink
                      key={project.id}
                      icon={<FolderIcon className="w-5 h-5" />}
                      text={project.name}
                      href="/"
                      small
                      active={currentProject?.id === project.id}
                      onClick={() => {
                        setCurrentProject(project);
                        router.push("/");
                      }}
                    />
                  ))}
                </nav>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => router.push("/projects/new")}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 w-full"
                >
                  <PlusIcon className="w-5 h-5 mr-2" />새 프로젝트
                </button>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
                <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 w-full">
                  <SettingsIcon className="w-5 h-5 mr-2" />
                  설정
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 w-full mt-2"
                >
                  <LogOutIcon className="w-5 h-5 mr-2" />
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 p-6 overflow-y-auto">
          {/* 대시보드 헤더 */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
              <p className="text-sm text-gray-600">
                안녕하세요, {user.name}님! {currentProject?.name || "프로젝트"}
                의 업무를 확인하세요
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={createNewMeeting}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <VideoIcon className="w-4 h-4" />새 회의
              </button>
              <Link
                href="/kanban/new"
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Trello className="w-4 h-4" />새 보드
              </Link>
              <Link
                href={
                  currentProject?.id
                    ? `/documents/new?projectId=${currentProject.id}`
                    : "/documents/new"
                }
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  if (currentProject?.id) {
                    e.preventDefault();

                    // 프로젝트 ID가 유효한지 먼저 확인
                    console.log(
                      "대시보드에서 새 문서 버튼 클릭, 프로젝트 ID:",
                      currentProject.id
                    );

                    // 유효한 프로젝트 ID인지 확인 후 이동
                    fetch(`/api/projects/${currentProject.id}`)
                      .then((response) => {
                        if (response.ok) {
                          router.push(
                            `/documents/new?projectId=${currentProject.id}`
                          );
                        } else {
                          console.error(
                            "유효하지 않은 프로젝트 ID:",
                            currentProject.id
                          );
                          alert(
                            "현재 선택된 프로젝트에 접근할 수 없습니다. 다른 프로젝트를 선택하세요."
                          );
                          router.push("/documents/new");
                        }
                      })
                      .catch((error) => {
                        console.error("프로젝트 확인 중 오류:", error);
                        router.push("/documents/new");
                      });
                  }
                }}
              >
                <FileTextIcon className="w-4 h-4" />새 문서
              </Link>
              <Link
                href={
                  currentProject
                    ? `/projects/${currentProject.id}/members`
                    : "/projects"
                }
                className="flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <UsersIcon className="w-4 h-4" />
                팀원 관리
              </Link>
            </div>
          </div>

          {/* 새로운 섹션: 프로젝트 팀 */}
          {currentProject && (
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  프로젝트 팀
                </h2>
                <Link
                  href={`/projects/${currentProject.id}/members`}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <UsersIcon className="w-4 h-4 mr-1" />
                  팀원 관리
                </Link>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {/* 프로젝트 소유자 아바타 */}
                  {currentProject.user && (
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white border-2 border-white z-10">
                      {currentProject.user.name.charAt(0)}
                    </div>
                  )}

                  {/* 팀원 아바타 (최대 3명) */}
                  {currentProject.members &&
                    currentProject.members
                      .filter((member) => member.inviteStatus === "accepted")
                      .slice(0, 3)
                      .map((member, index) => (
                        <div
                          key={member.id}
                          className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white border-2 border-white"
                          style={{ zIndex: 10 - index }}
                        >
                          {member.user?.name.charAt(0)}
                        </div>
                      ))}

                  {/* 추가 팀원 수 표시 */}
                  {currentProject.members &&
                    currentProject.members.filter(
                      (m) => m.inviteStatus === "accepted"
                    ).length > 3 && (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 border-2 border-white">
                        +
                        {currentProject.members.filter(
                          (m) => m.inviteStatus === "accepted"
                        ).length - 3}
                      </div>
                    )}
                </div>

                <Link
                  href={`/projects/${currentProject.id}/members`}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <UserPlusIcon className="w-5 h-5 mr-1" />
                  팀원 초대
                </Link>
              </div>
            </div>
          )}

          {/* 빠른 액세스 - 회의 참여 */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">
              빠른 회의 참여
            </h2>
            <form onSubmit={joinMeeting} className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="회의 코드 입력"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                참여하기
              </button>
            </form>
          </div>

          {/* 대시보드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 간략한 칸반 보드 */}
            <div className="bg-white rounded-lg shadow-sm p-4 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">칸반 보드</h2>
                <Link
                  href="/kanban"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  전체 보기
                </Link>
              </div>
              <SimplifiedKanbanBoard />
            </div>

            {/* 예정된 일정 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  예정된 일정
                </h2>
                <Link
                  href="/calendar"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  캘린더
                </Link>
              </div>
              {/* <div className="space-y-3">
                <ScheduleItem
                  title="디자인 팀 회의"
                  time="오늘, 14:00"
                  type="회의"
                  icon={<VideoIcon className="w-4 h-4 text-blue-600" />}
                />

                <ScheduleItem
                  title="프로젝트 마감일"
                  time="내일, 18:00"
                  type="마감일"
                  icon={<ClipboardListIcon className="w-4 h-4 text-red-600" />}
                />

                <ScheduleItem
                  title="클라이언트 미팅"
                  time="수요일, 11:00"
                  type="회의"
                  icon={<VideoIcon className="w-4 h-4 text-blue-600" />}
                />

                <ScheduleItem
                  title="주간 팀 회의"
                  time="금요일, 10:00"
                  type="회의"
                  icon={<VideoIcon className="w-4 h-4 text-blue-600" />}
                />
              </div> */}
            </div>

            {/* 최근 문서 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">최근 문서</h2>
                <Link
                  href={
                    currentProject
                      ? `/documents?projectId=${currentProject.id}`
                      : "/documents"
                  }
                  className="text-sm text-blue-600 hover:text-blue-800"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (currentProject) {
                      e.preventDefault();
                      console.log(
                        "최근 문서 모두 보기 클릭, 프로젝트 ID:",
                        currentProject.id
                      );
                      router.push(`/documents?projectId=${currentProject.id}`);
                    }
                  }}
                >
                  모두 보기
                </Link>
              </div>
              <RecentDocuments projectId={currentProject?.id} />
            </div>

            {/* 활성 칸반보드 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  활성 칸반보드
                </h2>
                <Link
                  href="/kanban"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  모두 보기
                </Link>
              </div>
              <div className="space-y-3">
                <KanbanItem
                  title="마케팅 캠페인"
                  tasks={{ total: 12, completed: 9 }}
                  icon={<Trello className="w-4 h-4 text-purple-600" />}
                />

                <KanbanItem
                  title="웹사이트 리디자인"
                  tasks={{ total: 8, completed: 3 }}
                  icon={<Trello className="w-4 h-4 text-purple-600" />}
                />

                <KanbanItem
                  title="모바일 앱 개발"
                  tasks={{ total: 15, completed: 7 }}
                  icon={<Trello className="w-4 h-4 text-purple-600" />}
                />

                <KanbanItem
                  title="고객 피드백 처리"
                  tasks={{ total: 5, completed: 2 }}
                  icon={<Trello className="w-4 h-4 text-purple-600" />}
                />
              </div>
            </div>

            {/* 최근 회의 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">최근 회의</h2>
                <Link
                  href="/meeting"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  모두 보기
                </Link>
              </div>
              <RecentMeetings />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarLink({
  icon,
  text,
  href,
  active = false,
  small = false,
  onClick,
}: {
  icon: React.ReactNode;
  text: string;
  href: string;
  active?: boolean;
  small?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center px-3 py-2 ${
        small ? "text-sm" : "text-base"
      } font-medium rounded-md ${
        active ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      <div className={`${small ? "mr-2" : "mr-3"}`}>{icon}</div>
      {text}
    </Link>
  );
}

function ProjectCard({
  title,
  description,
  progress,
  type,
  icon,
  link,
  upcoming = false,
}: {
  title: string;
  description: string;
  progress: number;
  type: string;
  icon: React.ReactNode;
  link: string;
  upcoming?: boolean;
}) {
  return (
    <Link href={link} className="block">
      <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center">
            <div className="mr-2">{icon}</div>
            <span className="text-xs font-medium text-gray-500">{type}</span>
          </div>
          {upcoming && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              예정됨
            </span>
          )}
        </div>
        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        {progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
      </div>
    </Link>
  );
}

function ScheduleItem({
  title,
  time,
  type,
  icon,
}: {
  title: string;
  time: string;
  type: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
      <div className="flex items-center">
        <div className="mr-3 p-2 bg-gray-100 rounded-full">{icon}</div>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500">{time}</p>
        </div>
      </div>
      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
        {type}
      </span>
    </div>
  );
}

function DocumentItem({
  title,
  updatedAt,
  icon,
}: {
  title: string;
  updatedAt: string;
  icon: React.ReactNode;
}) {
  // 현재 프로젝트 ID 가져오기
  const { currentProject } = useProject();
  const router = useRouter();

  return (
    <div
      onClick={() => {
        const url = `/documents/${title.toLowerCase().replace(/\s+/g, "-")}${
          currentProject ? `?projectId=${currentProject.id}` : ""
        }`;
        console.log("문서 아이템 클릭:", {
          title,
          url,
          projectId: currentProject?.id,
        });
        router.push(url);
      }}
      className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
    >
      <div className="mr-3 p-2 bg-gray-100 rounded-full">{icon}</div>
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">수정됨: {updatedAt}</p>
      </div>
    </div>
  );
}

function KanbanItem({
  title,
  tasks,
  icon,
}: {
  title: string;
  tasks: { total: number; completed: number };
  icon: React.ReactNode;
}) {
  const percentage = Math.round((tasks.completed / tasks.total) * 100);

  return (
    <Link
      href={`/kanban/${title.toLowerCase().replace(/\s+/g, "-")}`}
      className="block"
    >
      <div className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
        <div className="mr-3 p-2 bg-gray-100 rounded-full">{icon}</div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {tasks.completed}/{tasks.total} 작업 완료
            </p>
            <span className="text-xs font-medium text-gray-700">
              {percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div
              className="bg-purple-600 h-1.5 rounded-full"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// 최근 회의 컴포넌트
function RecentMeetings() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/meetings');
        
        if (!response.ok) {
          throw new Error('회의 목록을 불러오는데 실패했습니다');
        }
        
        const result = await response.json();
        // 최근 4개의 회의만 표시
        setMeetings(result.data.slice(0, 4));
        setError(null);
      } catch (err) {
        console.error("최근 회의 로딩 오류:", err);
        setError('회의 목록을 불러오는데 실패했습니다');
        setMeetings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const getParticipantCount = (participants: any) => {
    if (!participants) return 0;
    try {
      // JSON string이라면 파싱
      const parsedParticipants = typeof participants === 'string' 
        ? JSON.parse(participants) 
        : participants;
      
      return Array.isArray(parsedParticipants) ? parsedParticipants.length : 0;
    } catch (error) {
      console.error("참가자 정보 파싱 오류:", error);
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <p className="mb-4">아직 회의 기록이 없습니다</p>
        <button
          onClick={() => {
            const newRoomId = uuidv4().substring(0, 8);
            router.push(`/meeting/${newRoomId}`);
          }}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <VideoIcon className="w-4 h-4 mr-2" />
          새 회의 시작하기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          onClick={() => router.push(`/meeting/records/${meeting.id}`)}
          className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          <div className="mr-3 p-2 bg-gray-100 rounded-full">
            <VideoIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{meeting.title || "제목 없는 회의"}</h4>
            <div className="flex items-center text-sm text-gray-500">
              <span className="mr-3">{formatDate(meeting.startTime)}</span>
              <div className="flex items-center">
                <UsersIcon className="w-3 h-3 mr-1" />
                <span>{getParticipantCount(meeting.participants)}명</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimplifiedKanbanBoard() {
  // 현재 선택된 프로젝트의 태스크 가져오기
  const { currentProject } = useProject();
  const { tasks = [], loading } = useTasks(currentProject?.id || null);

  // 상태별로 태스크 필터링
  const todoTasks = tasks.filter((task) => task.status === "todo").slice(0, 2);
  const inProgressTasks = tasks
    .filter((task) => task.status === "in-progress")
    .slice(0, 2);
  const doneTasks = tasks.filter((task) => task.status === "done").slice(0, 2);

  // 로딩 중이면 로딩 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // 태스크가 없으면 빈 상태 표시
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-gray-500">
        <p className="text-center mb-4">현재 프로젝트에 작업이 없습니다</p>
        <Link
          href="/kanban/new"
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusIcon className="w-4 h-4" />새 작업 추가
        </Link>
      </div>
    );
  }

  // 간략화된 칸반 컬럼 컴포넌트
  const SimplifiedColumn = ({
    title,
    status,
    statusColor,
    tasks,
  }: {
    title: string;
    status: string;
    statusColor: string;
    tasks: Task[];
  }) => (
    <div className="bg-gray-50 rounded-lg p-3">
      <h3 className="font-medium text-gray-700 mb-2 flex items-center">
        <span
          className={`inline-block w-3 h-3 ${statusColor} rounded-full mr-2`}
        ></span>
        {title}
      </h3>
      <div className="space-y-2">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className="bg-white p-2 rounded shadow-sm border border-gray-200"
            >
              <p className="text-sm font-medium">{task.title}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {task.priority === "high"
                    ? "우선순위 높음"
                    : task.priority === "medium"
                    ? "중간 우선순위"
                    : "낮은 우선순위"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white p-2 rounded shadow-sm border border-gray-200 text-center">
            <p className="text-xs text-gray-400">작업 없음</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      <SimplifiedColumn
        title="할 일"
        status="todo"
        statusColor="bg-gray-400"
        tasks={todoTasks}
      />
      <SimplifiedColumn
        title="진행 중"
        status="in-progress"
        statusColor="bg-blue-400"
        tasks={inProgressTasks}
      />
      <SimplifiedColumn
        title="완료"
        status="done"
        statusColor="bg-green-400"
        tasks={doneTasks}
      />
    </div>
  );
}

// 최근 문서 컴포넌트
function RecentDocuments({ projectId }: { projectId?: string }) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        // 프로젝트 ID가 있을 때와 없을 때 요청 URL 분기
        const url = projectId 
          ? `/api/documents?projectId=${projectId}&limit=4` 
          : '/api/documents?limit=4';
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('문서를 불러오는 중 문제가 발생했습니다');
        }
        
        const data = await response.json();
        setDocuments(data);
        setError(null);
      } catch (err) {
        console.error("최근 문서 로딩 오류:", err);
        setError('문서를 불러오는 중 오류가 발생했습니다');
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [projectId]);

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "날짜 없음";
    
    // 날짜 객체로 변환
    const date = new Date(dateStr);
    const now = new Date();
    
    // 시간 차이 계산 (밀리초)
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffMonth / 12);
    
    // 상대적 시간 문자열 반환
    if (diffSec < 60) {
      return "방금 전";
    } else if (diffMin < 60) {
      return `${diffMin}분 전`;
    } else if (diffHour < 24) {
      return `${diffHour}시간 전`;
    } else if (diffDay < 30) {
      return `${diffDay}일 전`;
    } else if (diffMonth < 12) {
      return `${diffMonth}개월 전`;
    } else {
      return `${diffYear}년 전`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="mb-4">아직 문서가 없습니다</p>
        <Link
          href={projectId ? `/documents/new?projectId=${projectId}` : "/documents/new"}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          새 문서 만들기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => router.push(`/documents/${doc.id}${projectId ? `?projectId=${projectId}` : ''}`)}
          className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          <div className="mr-3 p-2 bg-gray-100 rounded-full">
            {doc.emoji ? (
              <span className="text-xl">{doc.emoji}</span>
            ) : (
              <FileTextIcon className="w-4 h-4 text-green-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{doc.title || "무제 문서"}</h4>
            <p className="text-sm text-gray-500">
              수정됨: {formatDate(doc.updatedAt || doc.createdAt)}
            </p>
          </div>
          {doc.isStarred && (
            <span className="ml-2 text-yellow-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
              </svg>
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
