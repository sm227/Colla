"use client";

import { useState, useEffect } from "react";
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
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Doughnut, PolarArea, Line } from 'react-chartjs-2';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);

interface ProjectData {
  id: string;
  name: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  members: {
    id: string;
    name: string;
    role: string;
  }[];
}

interface MemberData {
  id: string;
  name: string;
  role: string;
  completedTasks: number;
  totalTasks: number;
  projects: number;
}

interface ReportData {
  projects: ProjectData[];
  taskStatus: Record<string, number>;
  members: MemberData[];
}

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("이번 달");
  const [projectFilter, setProjectFilter] = useState("모든 프로젝트");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      const response = await fetch('/api/reports');
      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircleIcon className="w-12 h-12 text-red-500 mx-auto" />
          <p className="mt-4 text-gray-600">데이터를 불러오는 중 오류가 발생했습니다.</p>
          <button 
            onClick={fetchReportData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const totalTasks = Object.values(reportData.taskStatus).reduce((a, b) => a + b, 0);
  const completedTasks = reportData.taskStatus["done"] || 0;
  const inProgressTasks = reportData.taskStatus["in-progress"] || 0;
  const reviewTasks = reportData.taskStatus["review"] || 0;
  const todoTasks = reportData.taskStatus["todo"] || 0;
  const productivity = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
          <button 
            onClick={fetchReportData}
            className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
          >
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
          value={completedTasks.toString()} 
          change={5} 
          changeType="increase" 
          icon={<CheckCircleIcon className="w-5 h-5 text-green-500" />} 
          description="지난 달 대비"
        />
        
        <MetricCard 
          title="진행 중인 작업" 
          value={inProgressTasks.toString()} 
          change={3} 
          changeType="decrease" 
          icon={<ClockIcon className="w-5 h-5 text-blue-500" />} 
          description="지난 달 대비"
        />
        
        <MetricCard 
          title="지연된 작업" 
          value={todoTasks.toString()} 
          change={2} 
          changeType="increase" 
          icon={<AlertCircleIcon className="w-5 h-5 text-red-500" />} 
          description="지난 달 대비"
          negative
        />
        
        <MetricCard 
          title="팀 생산성" 
          value={`${productivity}%`} 
          change={5} 
          changeType="increase" 
          icon={<TrendingUpIcon className="w-5 h-5 text-purple-500" />} 
          description="지난 달 대비"
        />
      </div>
      
      {/* 차트 및 그래프 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">프로젝트 진행 상황</h2>
            <div className="flex gap-2">
              <select className="text-sm text-gray-700 border border-gray-300 rounded-md px-2 py-1">
                <option>진행률</option>
                <option>마감일</option>
              </select>
            </div>
          </div>
          <div className="h-72">
            {reportData.projects.length > 0 && (
              <Bar
                data={{
                  labels: reportData.projects.map(project => project.name),
                  datasets: [
                    {
                      label: '진행률',
                      data: reportData.projects.map(project => project.progress),
                      backgroundColor: reportData.projects.map(project => 
                        project.progress < 30 ? 'rgba(239, 68, 68, 0.7)' : // 빨간색 (지연)
                        project.progress < 70 ? 'rgba(59, 130, 246, 0.7)' : // 파란색 (진행 중)
                        'rgba(16, 185, 129, 0.7)' // 초록색 (거의 완료)
                      ),
                      borderColor: reportData.projects.map(project => 
                        project.progress < 30 ? 'rgb(239, 68, 68)' : 
                        project.progress < 70 ? 'rgb(59, 130, 246)' : 
                        'rgb(16, 185, 129)'
                      ),
                      borderWidth: 1,
                      borderRadius: 4,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `진행률: ${context.raw}%`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: function(value) {
                          return value + '%';
                        }
                      }
                    }
                  }
                }}
              />
            )}
          </div>
          <div className="text-xs text-gray-500 text-center mt-4">프로젝트별 완료율</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">작업 상태 분포</h2>
            <div className="text-sm text-gray-500">총 {totalTasks}개 작업</div>
          </div>
          <div className="h-72 flex items-center justify-center">
            {Object.keys(reportData.taskStatus).length > 0 && (
              <Doughnut
                data={{
                  labels: Object.keys(reportData.taskStatus).map(status => getStatusText(status)),
                  datasets: [
                    {
                      data: Object.values(reportData.taskStatus),
                      backgroundColor: [
                        'rgba(16, 185, 129, 0.7)', // 완료 (녹색)
                        'rgba(59, 130, 246, 0.7)', // 진행 중 (파란색)
                        'rgba(245, 158, 11, 0.7)', // 검토 중 (주황색)
                        'rgba(107, 114, 128, 0.7)', // 할 일 (회색)
                      ],
                      borderColor: [
                        'rgb(16, 185, 129)',
                        'rgb(59, 130, 246)',
                        'rgb(245, 158, 11)',
                        'rgb(107, 114, 128)',
                      ],
                      borderWidth: 1,
                      hoverOffset: 12,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '65%',
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 15,
                        font: {
                          size: 12,
                        }
                      }
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const value = context.raw as number;
                          const percentage = Math.round((value / totalTasks) * 100);
                          return `${context.label}: ${value}개 (${percentage}%)`;
                        }
                      }
                    }
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* 추가 그래프 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">주간 작업 완료 추이</h2>
            <div className="text-sm text-gray-500">최근 4주</div>
          </div>
          <div className="h-72">
            <Line
              data={{
                labels: ['1주 전', '2주 전', '3주 전', '4주 전'],
                datasets: [
                  {
                    fill: true,
                    label: '완료된 작업',
                    data: [
                      Math.round(completedTasks * 0.8), 
                      Math.round(completedTasks * 0.6), 
                      Math.round(completedTasks * 0.4), 
                      Math.round(completedTasks * 0.2)
                    ],
                    borderColor: 'rgb(16, 185, 129)',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.3,
                  },
                  {
                    fill: true,
                    label: '생성된 작업',
                    data: [
                      Math.round(totalTasks * 0.9), 
                      Math.round(totalTasks * 0.7), 
                      Math.round(totalTasks * 0.5), 
                      Math.round(totalTasks * 0.3)
                    ],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.3,
                  }
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      display: true,
                    },
                  },
                  x: {
                    grid: {
                      display: false,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">팀원별 작업 분포</h2>
            <div className="text-sm text-gray-500">상위 팀원</div>
          </div>
          <div className="h-72 flex items-center justify-center">
            <PolarArea
              data={{
                labels: reportData.members.slice(0, 5).map(member => member.name),
                datasets: [
                  {
                    data: reportData.members.slice(0, 5).map(member => member.completedTasks),
                    backgroundColor: [
                      'rgba(16, 185, 129, 0.7)',
                      'rgba(59, 130, 246, 0.7)',
                      'rgba(245, 158, 11, 0.7)',
                      'rgba(239, 68, 68, 0.7)',
                      'rgba(107, 114, 128, 0.7)',
                    ],
                    borderWidth: 1,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      font: {
                        size: 12,
                      }
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const member = reportData.members.slice(0, 5)[context.dataIndex];
                        return `완료된 작업: ${member.completedTasks}개 (${Math.round((member.completedTasks / member.totalTasks) * 100)}%)`;
                      }
                    }
                  }
                },
              }}
            />
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.projects.map((project) => (
                <ProjectRow 
                  key={project.id}
                  name={project.name}
                  status={project.progress === 100 ? "done" : "in-progress"}
                  statusText={getStatusText(project.progress === 100 ? "done" : "in-progress")}
                  progress={project.progress}
                  owner={project.members[0]?.name || "미지정"}
                  tasks={{total: project.totalTasks, completed: project.completedTasks}}
                  type="칸반보드"
                  icon={<Trello className="w-4 h-4 text-purple-600" />}
                />
              ))}
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
          {reportData.members.map((member) => (
            <MemberCard 
              key={member.id}
              name={member.name}
              role={member.role}
              tasks={{completed: member.completedTasks, total: member.totalTasks}}
              projects={member.projects}
              avatar={member.name.slice(0, 2).toUpperCase()}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch(status) {
    case "done": return "bg-green-500";
    case "in-progress": return "bg-blue-500";
    case "review": return "bg-yellow-500";
    case "todo": return "bg-gray-500";
    default: return "bg-gray-500";
  }
}

function getStatusText(status: string): string {
  switch(status) {
    case "done": return "완료";
    case "in-progress": return "진행 중";
    case "review": return "검토 중";
    case "todo": return "할 일";
    default: return status;
  }
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
  statusText,
  progress, 
  owner, 
  tasks,
  type,
  icon
}: { 
  name: string; 
  status: string;
  statusText: string;
  progress: number; 
  owner: string; 
  tasks: {total: number; completed: number};
  type: string;
  icon: React.ReactNode;
}) {
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'todo': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const statusClass = getStatusColor(status);
  const isOverdue = new Date() < new Date() && status !== 'done';
  
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
          {statusText}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
            <div 
              className={`h-2 rounded-full ${status === 'todo' ? 'bg-gray-600' : 'bg-blue-600'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-sm text-gray-500">{progress}%</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{owner}</div>
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