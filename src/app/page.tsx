// app/page.tsx
"use client";

import { useState } from "react";
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
  XIcon
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
              {mobileSidebarOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
            <div className="text-xl font-bold text-blue-600 flex items-center">
              <LayoutDashboardIcon className="w-6 h-6 mr-2" />
              워크스페이스
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
            <button className="p-2 rounded-full hover:bg-gray-100">
              <BellIcon className="w-5 h-5 text-gray-600" />
            </button>
            <div className="relative">
              <button className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-gray-600" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* 사이드바 및 메인 콘텐츠 */}
      <div className="flex pt-16">
        {/* 사이드바 - 모바일에서는 오버레이로 표시 */}
        <aside className={`fixed inset-y-0 left-0 z-20 w-64 bg-white border-r border-gray-200 pt-16 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:w-64 md:flex-shrink-0`}>
          <div className="h-full overflow-y-auto">
            <div className="px-4 py-5">
              <nav className="space-y-1">
                <SidebarLink icon={<HomeIcon className="w-5 h-5" />} text="홈" href="/" active={true} />
                <SidebarLink icon={<VideoIcon className="w-5 h-5" />} text="화상 회의" href="/meetings" />
                <SidebarLink icon={<Trello className="w-5 h-5" />} text="칸반보드" href="/kanban" />
                <SidebarLink icon={<FileTextIcon className="w-5 h-5" />} text="문서" href="/documents" />
                <SidebarLink icon={<CalendarIcon className="w-5 h-5" />} text="일정" href="/calendar" />
                <SidebarLink icon={<MessageSquareIcon className="w-5 h-5" />} text="메시지" href="/messages" />
              </nav>
              
              <div className="mt-8">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  최근 프로젝트
                </h3>
                <nav className="mt-2 space-y-1">
                  <SidebarLink icon={<FolderIcon className="w-5 h-5" />} text="마케팅 캠페인" href="/projects/marketing" small />
                  <SidebarLink icon={<FolderIcon className="w-5 h-5" />} text="제품 개발" href="/projects/product" small />
                  <SidebarLink icon={<FolderIcon className="w-5 h-5" />} text="디자인 시스템" href="/projects/design" small />
                </nav>
              </div>
              
              <div className="mt-8">
                <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 w-full">
                  <PlusIcon className="w-5 h-5 mr-2" />
                  새 프로젝트
                </button>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
                <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 w-full">
                  <SettingsIcon className="w-5 h-5 mr-2" />
                  설정
                </button>
                <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 w-full mt-2">
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
              <p className="text-sm text-gray-600">오늘의 업무와 프로젝트를 확인하세요</p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button
                onClick={createNewMeeting}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <VideoIcon className="w-4 h-4" />
                새 회의
              </button>
              <Link
                href="/kanban/new"
                className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Trello className="w-4 h-4" />
                새 보드
              </Link>
              <Link
                href="/documents/new"
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <FileTextIcon className="w-4 h-4" />
                새 문서
              </Link>
            </div>
          </div>
          
          {/* 빠른 액세스 - 회의 참여 */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">빠른 회의 참여</h2>
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
            {/* 최근 프로젝트 */}
            <div className="bg-white rounded-lg shadow-sm p-4 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">최근 프로젝트</h2>
                <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-800">
                  모두 보기
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProjectCard 
                  title="마케팅 캠페인 기획"
                  description="2024년 2분기 마케팅 전략 및 실행 계획"
                  progress={75}
                  type="칸반보드"
                  icon={<Trello className="w-5 h-5 text-purple-600" />}
                  link="/kanban/marketing"
                />
                
                <ProjectCard 
                  title="제품 개발 로드맵"
                  description="신규 기능 개발 및 출시 일정 관리"
                  progress={40}
                  type="문서"
                  icon={<FileTextIcon className="w-5 h-5 text-green-600" />}
                  link="/documents/roadmap"
                />
                
                <ProjectCard 
                  title="주간 팀 미팅"
                  description="매주 월요일 10:00 정기 회의"
                  progress={0}
                  type="회의"
                  icon={<VideoIcon className="w-5 h-5 text-blue-600" />}
                  link="/meeting/weekly"
                  upcoming={true}
                />
                
                <ProjectCard 
                  title="사용자 피드백 분석"
                  description="최근 수집된 사용자 의견 및 개선점"
                  progress={20}
                  type="문서"
                  icon={<FileTextIcon className="w-5 h-5 text-green-600" />}
                  link="/documents/feedback"
                />
              </div>
            </div>
            
            {/* 예정된 일정 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">예정된 일정</h2>
                <Link href="/calendar" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-1" />
                  캘린더
                </Link>
              </div>
              <div className="space-y-3">
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
              </div>
            </div>
            
            {/* 최근 문서 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">최근 문서</h2>
                <Link href="/documents" className="text-sm text-blue-600 hover:text-blue-800">
                  모두 보기
                </Link>
              </div>
              <div className="space-y-3">
                <DocumentItem 
                  title="제품 로드맵 2024"
                  updatedAt="1시간 전"
                  icon={<FileTextIcon className="w-4 h-4 text-green-600" />}
                />
                
                <DocumentItem 
                  title="마케팅 전략 회의록"
                  updatedAt="어제"
                  icon={<FileTextIcon className="w-4 h-4 text-green-600" />}
                />
                
                <DocumentItem 
                  title="디자인 가이드라인"
                  updatedAt="3일 전"
                  icon={<FileTextIcon className="w-4 h-4 text-green-600" />}
                />
                
                <DocumentItem 
                  title="사용자 인터뷰 결과"
                  updatedAt="1주일 전"
                  icon={<FileTextIcon className="w-4 h-4 text-green-600" />}
                />
              </div>
            </div>
            
            {/* 활성 칸반보드 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">활성 칸반보드</h2>
                <Link href="/kanban" className="text-sm text-blue-600 hover:text-blue-800">
                  모두 보기
                </Link>
              </div>
              <div className="space-y-3">
                <KanbanItem 
                  title="마케팅 캠페인"
                  tasks={{total: 12, completed: 9}}
                  icon={<Trello className="w-4 h-4 text-purple-600" />}
                />
                
                <KanbanItem 
                  title="웹사이트 리디자인"
                  tasks={{total: 8, completed: 3}}
                  icon={<Trello className="w-4 h-4 text-purple-600" />}
                />
                
                <KanbanItem 
                  title="모바일 앱 개발"
                  tasks={{total: 15, completed: 7}}
                  icon={<Trello className="w-4 h-4 text-purple-600" />}
                />
                
                <KanbanItem 
                  title="고객 피드백 처리"
                  tasks={{total: 5, completed: 2}}
                  icon={<Trello className="w-4 h-4 text-purple-600" />}
                />
              </div>
            </div>
            
            {/* 최근 회의 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">최근 회의</h2>
                <Link href="/meetings" className="text-sm text-blue-600 hover:text-blue-800">
                  모두 보기
                </Link>
              </div>
              <div className="space-y-3">
                <MeetingItem 
                  title="주간 팀 미팅"
                  date="2023-06-05"
                  participants={8}
                  icon={<VideoIcon className="w-4 h-4 text-blue-600" />}
                />
                
                <MeetingItem 
                  title="제품 기획 회의"
                  date="2023-06-02"
                  participants={5}
                  icon={<VideoIcon className="w-4 h-4 text-blue-600" />}
                />
                
                <MeetingItem 
                  title="디자인 리뷰"
                  date="2023-05-30"
                  participants={4}
                  icon={<VideoIcon className="w-4 h-4 text-blue-600" />}
                />
                
                <MeetingItem 
                  title="클라이언트 미팅"
                  date="2023-05-28"
                  participants={6}
                  icon={<VideoIcon className="w-4 h-4 text-blue-600" />}
                />
              </div>
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
  small = false
}: { 
  icon: React.ReactNode; 
  text: string; 
  href: string;
  active?: boolean;
  small?: boolean;
}) {
  return (
    <Link 
      href={href} 
      className={`flex items-center px-3 py-2 ${small ? 'text-sm' : 'text-base'} font-medium rounded-md ${
        active 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className={`mr-3 ${small ? 'text-gray-400' : active ? 'text-blue-500' : 'text-gray-500'}`}>
        {icon}
      </span>
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
  upcoming = false
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
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">예정됨</span>
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

function ScheduleItem({ title, time, type, icon }: { title: string; time: string; type: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
      <div className="flex items-center">
        <div className="mr-3 p-2 bg-gray-100 rounded-full">{icon}</div>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500">{time}</p>
        </div>
      </div>
      <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">{type}</span>
    </div>
  );
}

function DocumentItem({ title, updatedAt, icon }: { title: string; updatedAt: string; icon: React.ReactNode }) {
  return (
    <Link href={`/documents/${title.toLowerCase().replace(/\s+/g, '-')}`} className="block">
      <div className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
        <div className="mr-3 p-2 bg-gray-100 rounded-full">{icon}</div>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-500">수정됨: {updatedAt}</p>
        </div>
      </div>
    </Link>
  );
}

function KanbanItem({ 
  title, 
  tasks, 
  icon 
}: { 
  title: string; 
  tasks: {total: number; completed: number}; 
  icon: React.ReactNode 
}) {
  const percentage = Math.round((tasks.completed / tasks.total) * 100);
  
  return (
    <Link href={`/kanban/${title.toLowerCase().replace(/\s+/g, '-')}`} className="block">
      <div className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
        <div className="mr-3 p-2 bg-gray-100 rounded-full">{icon}</div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{tasks.completed}/{tasks.total} 작업 완료</p>
            <span className="text-xs font-medium text-gray-700">{percentage}%</span>
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

function MeetingItem({ 
  title, 
  date, 
  participants, 
  icon 
}: { 
  title: string; 
  date: string; 
  participants: number; 
  icon: React.ReactNode 
}) {
  return (
    <Link href={`/meetings/${title.toLowerCase().replace(/\s+/g, '-')}`} className="block">
      <div className="flex items-center p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
        <div className="mr-3 p-2 bg-gray-100 rounded-full">{icon}</div>
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <div className="flex items-center text-sm text-gray-500">
            <span className="mr-3">{date}</span>
            <div className="flex items-center">
              <UsersIcon className="w-3 h-3 mr-1" />
              <span>{participants}명</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
