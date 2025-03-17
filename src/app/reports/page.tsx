"use client";

import { useState } from "react";
import { 
  BarChart3Icon, 
  PieChartIcon, 
  TrendingUpIcon, 
  UsersIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  AlertCircleIcon,
  CalendarIcon,
  FilterIcon,
  DownloadIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  Trello,
  FileTextIcon
} from "lucide-react";
import Link from "next/link";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("이번 달");
  const [projectFilter, setProjectFilter] = useState("모든 프로젝트");
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">프로젝트 보고서</h1>
        <p className="text-sm text-gray-600">팀의 프로젝트 현황과 성과를 한눈에 확인하세요</p>
      </div>
      
      {/* 필터 및 컨트롤 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <button className="flex items-center justify-between w-40 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
              <span>{dateRange}</span>
              <ChevronDownIcon className="w-4 h-4 ml-2" />
            </button>
          </div>
          
          <div className="relative">
            <button className="flex items-center justify-between w-48 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
              <span>{projectFilter}</span>
              <ChevronDownIcon className="w-4 h-4 ml-2" />
            </button>
          </div>
          
          <button className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <FilterIcon className="w-4 h-4 mr-2" />
            추가 필터
          </button>
        </div>
        
        <div className="flex gap-2">
          <button className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <RefreshCwIcon className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <button className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
            <DownloadIcon className="w-4 h-4 mr-2" />
            내보내기
          </button>
        </div>
      </div>
      
      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <MetricCard 
          title="완료된 작업" 
          value="42" 
          change={8} 
          changeType="increase" 
          icon={<CheckCircleIcon className="w-5 h-5 text-green-500" />} 
          description="지난 달 대비"
        />
        
        <MetricCard 
          title="진행 중인 작업" 
          value="18" 
          change={3} 
          changeType="decrease" 
          icon={<ClockIcon className="w-5 h-5 text-blue-500" />} 
          description="지난 달 대비"
        />
        
        <MetricCard 
          title="지연된 작업" 
          value="7" 
          change={2} 
          changeType="increase" 
          icon={<AlertCircleIcon className="w-5 h-5 text-red-500" />} 
          description="지난 달 대비"
          negative
        />
        
        <MetricCard 
          title="팀 생산성" 
          value="87%" 
          change={5} 
          changeType="increase" 
          icon={<TrendingUpIcon className="w-5 h-5 text-purple-500" />} 
          description="지난 달 대비"
        />
      </div>
      
      {/* 차트 및 그래프 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">프로젝트 진행 상황</h2>
            <button className="text-sm text-gray-500 hover:text-gray-700">
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="h-64 flex items-center justify-center">
            {/* 실제 차트 대신 임시 시각화 */}
            <div className="w-full flex items-end justify-between h-48 px-4">
              <div className="flex flex-col items-center">
                <div className="w-12 bg-blue-500 rounded-t-md" style={{ height: '60%' }}></div>
                <span className="text-xs mt-2 text-gray-600">1주차</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 bg-blue-500 rounded-t-md" style={{ height: '75%' }}></div>
                <span className="text-xs mt-2 text-gray-600">2주차</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 bg-blue-500 rounded-t-md" style={{ height: '45%' }}></div>
                <span className="text-xs mt-2 text-gray-600">3주차</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 bg-blue-500 rounded-t-md" style={{ height: '90%' }}></div>
                <span className="text-xs mt-2 text-gray-600">4주차</span>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center">주간 완료된 작업 수</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">작업 상태 분포</h2>
            <button className="text-sm text-gray-500 hover:text-gray-700">
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="h-64 flex items-center justify-center">
            {/* 실제 차트 대신 임시 원형 차트 */}
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 rounded-full border-8 border-green-500" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, 50% 50%)' }}></div>
              <div className="absolute inset-0 rounded-full border-8 border-blue-500" style={{ clipPath: 'polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 0, 50% 0)' }}></div>
              <div className="absolute inset-0 rounded-full border-8 border-red-500" style={{ clipPath: 'polygon(50% 50%, 0 0, 50% 0, 100% 0, 100% 100%, 50% 100%)' }}></div>
              <div className="absolute inset-0 rounded-full border-8 border-yellow-500" style={{ clipPath: 'polygon(50% 50%, 100% 100%, 0 100%, 0 0)' }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600">완료 (42)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600">진행 중 (18)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600">지연 (7)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
              <span className="text-xs text-gray-600">검토 중 (12)</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 프로젝트 진행 상황 테이블 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">프로젝트 진행 상황</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">정렬:</span>
            <button className="text-sm text-gray-700 hover:text-gray-900">마감일</button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">프로젝트</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">진행률</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">담당자</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">마감일</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <ProjectRow 
                name="마케팅 캠페인 기획" 
                status="진행 중" 
                progress={75} 
                owner="김지민" 
                dueDate="2023-06-30" 
                tasks={{total: 12, completed: 9}}
                type="칸반보드"
                icon={<Trello className="w-4 h-4 text-purple-600" />}
              />
              
              <ProjectRow 
                name="제품 개발 로드맵" 
                status="검토 중" 
                progress={40} 
                owner="이승우" 
                dueDate="2023-07-15" 
                tasks={{total: 8, completed: 3}}
                type="문서"
                icon={<FileTextIcon className="w-4 h-4 text-green-600" />}
              />
              
              <ProjectRow 
                name="웹사이트 리디자인" 
                status="지연" 
                progress={60} 
                owner="박소연" 
                dueDate="2023-06-10" 
                tasks={{total: 10, completed: 6}}
                type="칸반보드"
                icon={<Trello className="w-4 h-4 text-purple-600" />}
              />
              
              <ProjectRow 
                name="고객 피드백 분석" 
                status="완료" 
                progress={100} 
                owner="최준호" 
                dueDate="2023-06-05" 
                tasks={{total: 5, completed: 5}}
                type="문서"
                icon={<FileTextIcon className="w-4 h-4 text-green-600" />}
              />
              
              <ProjectRow 
                name="모바일 앱 개발" 
                status="진행 중" 
                progress={35} 
                owner="정다은" 
                dueDate="2023-08-20" 
                tasks={{total: 15, completed: 5}}
                type="칸반보드"
                icon={<Trello className="w-4 h-4 text-purple-600" />}
              />
            </tbody>
          </table>
        </div>
      </div>
      
      {/* 팀원 성과 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">팀원 성과</h2>
          <button className="text-sm text-blue-600 hover:text-blue-800">상세 보기</button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MemberCard 
            name="김지민" 
            role="프로젝트 매니저" 
            tasks={{completed: 15, total: 18}} 
            projects={3}
            avatar="KJ"
          />
          
          <MemberCard 
            name="이승우" 
            role="제품 디자이너" 
            tasks={{completed: 12, total: 14}} 
            projects={2}
            avatar="LS"
          />
          
          <MemberCard 
            name="박소연" 
            role="UI/UX 디자이너" 
            tasks={{completed: 8, total: 12}} 
            projects={2}
            avatar="PS"
          />
          
          <MemberCard 
            name="최준호" 
            role="프론트엔드 개발자" 
            tasks={{completed: 20, total: 22}} 
            projects={4}
            avatar="CJ"
          />
          
          <MemberCard 
            name="정다은" 
            role="백엔드 개발자" 
            tasks={{completed: 18, total: 20}} 
            projects={3}
            avatar="JD"
          />
          
          <MemberCard 
            name="한민수" 
            role="마케팅 스페셜리스트" 
            tasks={{completed: 10, total: 15}} 
            projects={2}
            avatar="HM"
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ 
  title, 
  value, 
  change, 
  changeType, 
  icon, 
  description,
  negative = false
}: { 
  title: string; 
  value: string; 
  change: number; 
  changeType: 'increase' | 'decrease'; 
  icon: React.ReactNode;
  description: string;
  negative?: boolean;
}) {
  const isPositiveChange = changeType === 'increase' && !negative || changeType === 'decrease' && negative;
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className="p-2 bg-gray-100 rounded-full">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center">
        {isPositiveChange ? (
          <ArrowUpIcon className="w-4 h-4 text-green-500 mr-1" />
        ) : (
          <ArrowDownIcon className="w-4 h-4 text-red-500 mr-1" />
        )}
        <span className={`text-sm font-medium ${isPositiveChange ? 'text-green-500' : 'text-red-500'}`}>
          {change}%
        </span>
        <span className="text-xs text-gray-500 ml-2">{description}</span>
      </div>
    </div>
  );
}

function ProjectRow({ 
  name, 
  status, 
  progress, 
  owner, 
  dueDate,
  tasks,
  type,
  icon
}: { 
  name: string; 
  status: string; 
  progress: number; 
  owner: string; 
  dueDate: string;
  tasks: {total: number; completed: number};
  type: string;
  icon: React.ReactNode;
}) {
  const getStatusColor = (status: string) => {
    switch(status) {
      case '완료': return 'bg-green-100 text-green-800';
      case '진행 중': return 'bg-blue-100 text-blue-800';
      case '지연': return 'bg-red-100 text-red-800';
      case '검토 중': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const statusClass = getStatusColor(status);
  const isOverdue = new Date(dueDate) < new Date() && status !== '완료';
  
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="mr-2">{icon}</div>
          <div className="text-sm font-medium text-gray-900">{name}</div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
          {status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
            <div 
              className={`h-2 rounded-full ${status === '지연' ? 'bg-red-600' : 'bg-blue-600'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{owner}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          {isOverdue && <AlertCircleIcon className="w-4 h-4 inline mr-1" />}
          {new Date(dueDate).toLocaleDateString('ko-KR')}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {tasks.completed}/{tasks.total} 완료
      </td>
    </tr>
  );
}

function MemberCard({ 
  name, 
  role, 
  tasks, 
  projects,
  avatar
}: { 
  name: string; 
  role: string; 
  tasks: {completed: number; total: number}; 
  projects: number;
  avatar: string;
}) {
  const completionRate = Math.round((tasks.completed / tasks.total) * 100);
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium mr-3">
          {avatar}
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{name}</h3>
          <p className="text-xs text-gray-500">{role}</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">작업 완료율</span>
            <span className="font-medium text-gray-900">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-600 h-1.5 rounded-full" 
              style={{ width: `${completionRate}%` }}
            ></div>
          </div>
        </div>
        
        <div className="flex justify-between">
          <div className="text-center">
            <p className="text-xs text-gray-500">완료한 작업</p>
            <p className="font-medium text-gray-900">{tasks.completed}/{tasks.total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">참여 프로젝트</p>
            <p className="font-medium text-gray-900">{projects}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">평균 소요 시간</p>
            <p className="font-medium text-gray-900">2.4일</p>
          </div>
        </div>
      </div>
    </div>
  );
} 