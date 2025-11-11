'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDownIcon,
  MenuIcon,
  BellIcon,
  UsersIcon,
  CheckCircleIcon,
  ClockIcon,
  ListTodoIcon,
  PercentIcon
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNotifications } from "@/app/contexts/NotificationContext";
import { useProject } from "@/app/contexts/ProjectContext";
import Sidebar from "@/components/Sidebar";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Epic {
  id: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  projectId?: string;
  color?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  assigneeName?: string;
  createdAt: string;
  updatedAt: string;
  epicId?: string;
  epic?: Epic;
}

interface ChartDataPoint {
  date: string;
  completedTasks: number;
  totalTasks: number;
  remainingTasks: number;
  plannedCompletion: number;
}

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const { showNotificationPanel, setShowNotificationPanel, hasNewNotifications } = useNotifications();
  const { projects, currentProject } = useProject();
  const [mounted, setMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [burnupData, setBurnupData] = useState<ChartDataPoint[]>([]);
  const [burndownData, setBurndownData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (currentProject?.id) {
      fetchTasks();
    } else {
      setTasks([]);
      setBurnupData([]);
      setBurndownData([]);
    }
  }, [currentProject]);

  const openSettingsModal = () => {
    setSettingsModalOpen(true);
  };

  const fetchTasks = async () => {
    if (!currentProject?.id) return;
    
    try {
      setLoading(true);
      // 프로젝트 전체 작업을 가져오기
      const response = await fetch(`/api/tasks?projectId=${currentProject.id}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
        generateChartData(data);
      }
    } catch (error) {
      console.error('작업 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (tasks: Task[]) => {
    if (!tasks.length) {
      setBurnupData([]);
      setBurndownData([]);
      return;
    }

    // 프로젝트의 모든 작업을 기준으로 차트 생성
    const sortedTasks = [...tasks].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // 프로젝트 시작일부터 현재까지
    const startDate = new Date(sortedTasks[0]?.createdAt || new Date());
    const endDate = new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalTasks = tasks.length;
    
    const chartPoints: ChartDataPoint[] = [];
    const maxDays = Math.min(totalDays + 1, 14); // 2주치 데이터
    
    for (let i = 0; i < maxDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const tasksUpToDate = sortedTasks.filter(task => 
        new Date(task.createdAt) <= currentDate
      );
      
      const completedTasksUpToDate = tasksUpToDate.filter(task => 
        task.status === 'done' && new Date(task.updatedAt) <= currentDate
      );

      const progress = totalDays > 0 ? i / totalDays : 0;
      const plannedProgress = progress * tasksUpToDate.length;
      
      // 이상적인 번다운: 시작일에 전체 작업 수에서 시간에 따라 선형으로 감소
      const idealRemainingTasks = Math.max(0, Math.round(totalTasks * (1 - progress)));

      chartPoints.push({
        date: currentDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        completedTasks: completedTasksUpToDate.length,
        totalTasks: tasksUpToDate.length,
        remainingTasks: Math.max(0, totalTasks - completedTasksUpToDate.length),
        plannedCompletion: idealRemainingTasks
      });
    }

    setBurnupData(chartPoints);
    setBurndownData(chartPoints);
  };

  if (!mounted) {
    return null;
  }

  // 로딩 중일 때
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center flex flex-col items-center">
          <div className={`relative w-24 h-24 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-16 h-16 border-4 border-current border-solid rounded-full opacity-20 ${theme === 'dark' ? 'border-blue-500' : 'border-blue-600'}`}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-16 h-16 border-4 border-current border-solid rounded-full border-t-transparent animate-spin`}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>C</span>
            </div>
          </div>
          <p className={`mt-6 text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>보고서 로딩 중...</p>
        </div>
      </div>
    );
  }

  const currentProjectName = currentProject?.name || "프로젝트";

  // 통계 계산
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const todoTasks = tasks.filter(task => task.status === 'todo').length;
  const reviewTasks = tasks.filter(task => task.status === 'review').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 번업 차트 데이터
  const burnupChartData = {
    labels: burnupData.map(point => point.date),
    datasets: [
      {
        label: '완료된 작업',
        data: burnupData.map(point => point.completedTasks),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.1,
      },
      {
        label: '전체 작업',
        data: burnupData.map(point => point.totalTasks),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
      }
    ]
  };

  // 번다운 차트 데이터
  const burndownChartData = {
    labels: burndownData.map(point => point.date),
    datasets: [
      {
        label: '남은 작업',
        data: burndownData.map(point => point.remainingTasks),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
      },
      {
        label: '이상적인 번다운',
        data: burndownData.map(point => point.plannedCompletion),
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.1,
      }
    ]
  };

  // 작업 상태 분포 차트
  const statusChartData = {
    labels: ['완료', '진행 중', '검토 중', '할 일'],
    datasets: [
      {
        data: [completedTasks, inProgressTasks, reviewTasks, todoTasks],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(245, 158, 11)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: { size: 12 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.parsed.y}개`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: theme === 'dark' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(156, 163, 175, 0.3)',
        }
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        grid: {
          color: theme === 'dark' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(156, 163, 175, 0.3)',
        }
      }
    }
  } as any;

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { size: 12 },
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = Math.round((context.parsed / total) * 100);
            return `${context.label}: ${context.parsed}개 (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* 통합 사이드바 */}
      <Sidebar
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        currentPage="reports"
        onSettingsClick={openSettingsModal}
      />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 모바일 헤더 */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-background border-b border-border">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <MenuIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-black dark:bg-blue-600 rounded-lg flex items-center justify-center mr-2">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">Colla</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              className={`relative p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                hasNewNotifications ? 'notification-bounce' : ''
              }`}
              title="알림"
            >
              <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              {hasNewNotifications && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </div>
      
        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* 페이지 헤더 */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">보고서 대시보드</h1>
            <p className="text-muted-foreground">{currentProjectName} 프로젝트 현황과 팀 성과를 종합적으로 분석해보세요</p>
          </div>
      
          {/* 통계 카드들 */}
          {tasks.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-2">완료된 작업</p>
                  <p className="text-3xl font-bold text-foreground">{completedTasks}</p>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-2">진행 중</p>
                  <p className="text-3xl font-bold text-foreground">{inProgressTasks}</p>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-2">전체 작업</p>
                  <p className="text-3xl font-bold text-foreground">{totalTasks}</p>
                </div>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-2">완료율</p>
                  <p className="text-3xl font-bold text-foreground">{completionRate}%</p>
                </div>
              </div>
            </div>
          )}

          {/* 차트 섹션 */}
          {tasks.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* 번업 차트 */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">번업 보고서</h3>
                  <p className="text-sm text-muted-foreground">완료된 작업과 전체 범위의 증가 추세</p>
                </div>
                <div className="h-80">
                  <Line data={burnupChartData} options={chartOptions} />
                </div>
              </div>

              {/* 번다운 차트 */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">번다운 보고서</h3>
                  <p className="text-sm text-muted-foreground">남은 작업의 감소 추세와 계획 대비 진행률</p>
                </div>
                <div className="h-80">
                  <Line data={burndownChartData} options={chartOptions} />
                </div>
              </div>

              {/* 작업 상태 분포 */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">작업 상태 분포</h3>
                  <p className="text-sm text-muted-foreground">현재 작업들의 상태별 분포 현황</p>
                </div>
                <div className="h-80">
                  <Doughnut data={statusChartData} options={doughnutOptions} />
                </div>
              </div>

              {/* 담당자별 작업 현황 */}
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">담당자별 작업 현황</h3>
                  <p className="text-sm text-muted-foreground">담당자별 완료/미완료 작업 분포</p>
                </div>
                <div className="overflow-x-auto max-h-96 overflow-y-auto border border-border rounded-lg">
                  <table className="min-w-full">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground bg-background">담당자</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground bg-background">작업</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground bg-background">상태</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground bg-background">에픽</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => {
                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case 'done':
                              return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200';
                            case 'in-progress':
                              return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200';
                            case 'review':
                              return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200';
                            case 'todo':
                              return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
                            default:
                              return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
                          }
                        };

                        const getStatusText = (status: string) => {
                          switch (status) {
                            case 'done': return '완료';
                            case 'in-progress': return '진행 중';
                            case 'review': return '검토 중';
                            case 'todo': return '할 일';
                            default: return status;
                          }
                        };

                        return (
                          <tr key={task.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-primary">
                                    {task.assigneeName ? task.assigneeName.charAt(0).toUpperCase() : '?'}
                                  </span>
                                </div>
                                <span className="font-medium">{task.assigneeName || '미지정'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-foreground max-w-xs truncate block">
                                {task.title}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                                {getStatusText(task.status)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                                {task.epic?.title || '미지정'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* 데이터 없음 상태 */
            <div className="bg-card border border-border rounded-lg p-12 text-center">
              <UsersIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">작업 데이터가 없습니다</h3>
              <p className="text-muted-foreground mb-4">
                현재 프로젝트에 작업이 없습니다. 작업을 생성한 후 다시 확인해주세요.
              </p>
            </div>
          )}

          {/* 실시간 업데이트 표시 */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-muted rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              <span className="text-sm text-muted-foreground">실시간 데이터로 업데이트됩니다</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center flex flex-col items-center">
          <div className="relative w-24 h-24 text-blue-500">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-current border-solid rounded-full opacity-20 border-blue-500"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-current border-solid rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-blue-500">C</span>
            </div>
          </div>
          <p className="mt-6 text-lg font-medium text-gray-300">보고서 로딩 중...</p>
        </div>
      </div>
    }>
      <ReportsPageContent />
    </Suspense>
  );
}