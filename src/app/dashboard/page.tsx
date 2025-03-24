"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  BarChart3Icon, 
  PieChartIcon, 
  TrendingUpIcon, 
  CalendarIcon, 
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
  Trello
} from "lucide-react";
import { useProject } from "../contexts/ProjectContext";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const { projects, loading } = useProject();
  const [currentProject, setCurrentProject] = useState<any>(null);

  // URL 쿼리 파라미터로부터 프로젝트 ID를 가져옴
  useEffect(() => {
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
    }
  }, [projectIdParam]);

  // 선택된 프로젝트 ID를 기반으로 현재 프로젝트 설정
  useEffect(() => {
    if (!loading && selectedProjectId && projects.length > 0) {
      const project = projects.find(p => p.id === selectedProjectId);
      setCurrentProject(project || null);
    }
  }, [loading, selectedProjectId, projects]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        {currentProject ? `${currentProject.name} 대시보드` : '프로젝트 대시보드'}
      </h1>
      {currentProject?.description && (
        <p className="text-gray-600 mb-8">{currentProject.description}</p>
      )}

      {/* 주요 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard 
          title="완료된 작업"
          value="12"
          change="+3"
          trend="up"
          icon={<CheckCircleIcon className="w-8 h-8 text-green-500" />}
        />
        <MetricCard 
          title="진행 중인 작업"
          value="8"
          change="-1"
          trend="down"
          icon={<ClockIcon className="w-8 h-8 text-blue-500" />}
        />
        <MetricCard 
          title="지연된 작업"
          value="3"
          change="+1"
          trend="up"
          icon={<AlertTriangleIcon className="w-8 h-8 text-amber-500" />}
        />
        <MetricCard 
          title="일정 달성율"
          value="78%"
          change="+5%"
          trend="up"
          icon={<TrendingUpIcon className="w-8 h-8 text-indigo-500" />}
        />
      </div>

      {/* 차트 및 통계 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">작업 상태</h2>
            <PieChartIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-center text-gray-500">
              <Trello className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>해당 프로젝트의 작업 상태 차트가 표시됩니다.</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">일정 진행도</h2>
            <BarChart3Icon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-center text-gray-500">
              <CalendarIcon className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p>해당 프로젝트의 일정 진행도 차트가 표시됩니다.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">최근 활동</h2>
        </div>
        <div className="space-y-4">
          <ActivityItem 
            action="작업 완료"
            user="김지민"
            item="디자인 초안 검토"
            time="1시간 전"
          />
          <ActivityItem 
            action="새로운 댓글"
            user="이승우"
            item="API 엔드포인트 문서"
            time="3시간 전"
          />
          <ActivityItem 
            action="작업 상태 변경"
            user="박소연"
            item="메인 페이지 리팩토링"
            time="어제"
          />
          <ActivityItem 
            action="새 작업 추가"
            user="최준호"
            item="사용자 인증 기능 구현"
            time="어제"
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
  trend, 
  icon 
}: { 
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className="bg-gray-50 rounded-md p-2">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center">
        <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
        <span className="text-sm text-gray-500 ml-2">지난 주 대비</span>
      </div>
    </div>
  );
}

function ActivityItem({ 
  action, 
  user, 
  item, 
  time 
}: { 
  action: string;
  user: string;
  item: string;
  time: string;
}) {
  return (
    <div className="flex space-x-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
          {user.charAt(0)}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800">
          <span className="font-medium">{user}</span>님이 
          <span className="font-medium"> {item}</span>을(를) 
          <span className="font-medium"> {action}</span>했습니다.
        </p>
        <p className="text-sm text-gray-500">{time}</p>
      </div>
    </div>
  );
} 