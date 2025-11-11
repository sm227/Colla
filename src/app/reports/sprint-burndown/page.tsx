"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ShareIcon,
  MoreHorizontalIcon,
  MenuIcon,
  BellIcon
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
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  project?: {
    name: string;
  };
}

interface Task {
  id: string;
  title: string;
  status: string;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  startDate?: string;
  endDate?: string;
  epicId?: string;
  epic?: Epic;
}

interface TaskEvent {
  date: string;
  event: string;
  task: string;
  assignee: string;
  epic: string;
}

interface BurndownDataPoint {
  date: string;
  remainingTasks: number;
  idealBurndown: number;
  totalTasks: number;
}

function SprintBurndownReportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const { showNotificationPanel, setShowNotificationPanel, hasNewNotifications } = useNotifications();
  const { projects, currentProject } = useProject();
  const [mounted, setMounted] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [selectedEpicId, setSelectedEpicId] = useState<string | null>(null);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<BurndownDataPoint[]>([]);

  useEffect(() => {
    setMounted(true);
    // URL에서 에픽 ID 가져오기
    const epicId = searchParams.get('epicId');
    if (epicId) {
      setSelectedEpicId(epicId);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchEpics();
  }, [currentProject]);

  useEffect(() => {
    if (selectedEpicId) {
      fetchTasks();
    } else {
      setTasks([]);
      setChartData([]);
    }
  }, [selectedEpicId]);

  const openSettingsModal = () => {
    setSettingsModalOpen(true);
  };

  const fetchEpics = async () => {
    try {
      setLoading(true);
      const projectId = currentProject?.id;
      if (!projectId) return;
      
      const response = await fetch(`/api/epics?projectId=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setEpics(data);
        
        // 첫 번째 에픽이 있으면 자동 선택
        if (data.length > 0 && !selectedEpicId) {
          setSelectedEpicId(data[0].id);
        }
      }
    } catch (error) {
      console.error('에픽 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!selectedEpicId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks?epicId=${selectedEpicId}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
        generateBurndownData(data);
      }
    } catch (error) {
      console.error('작업 데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBurndownData = (tasks: Task[]) => {
    if (!tasks.length) {
      setChartData([]);
      return;
    }

    // 선택된 에픽 정보 가져오기
    const selectedEpic = epics.find(epic => epic.id === selectedEpicId);
    
    // 에픽 시작일과 종료일 사용, 없으면 작업들의 날짜 기준으로 설정
    const epicStartDate = selectedEpic?.startDate ? new Date(selectedEpic.startDate) : null;
    const epicEndDate = selectedEpic?.endDate ? new Date(selectedEpic.endDate) : null;
    
    // 작업들을 날짜순으로 정렬
    const sortedTasks = [...tasks].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // 시작일과 종료일 계산
    const startDate = epicStartDate || new Date(sortedTasks[0]?.createdAt || new Date());
    const endDate = epicEndDate || new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalTasks = tasks.length;
    
    // 날짜별 데이터 생성
    const burndownPoints: BurndownDataPoint[] = [];
    const maxDays = Math.min(totalDays + 1, 30); // 최대 30일치 데이터
    
    for (let i = 0; i < maxDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      // 해당 날짜까지 완료된 작업들
      const completedTasksUpToDate = tasks.filter(task => 
        task.status === 'done' && new Date(task.updatedAt) <= currentDate
      );

      // 남은 작업 수 = 전체 작업 - 완료된 작업
      const remainingTasks = totalTasks - completedTasksUpToDate.length;

      // 이상적인 번다운 (선형 감소)
      const progress = totalDays > 0 ? i / totalDays : 0;
      const idealBurndown = Math.max(0, Math.round(totalTasks * (1 - progress)));

      burndownPoints.push({
        date: currentDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }),
        remainingTasks: Math.max(0, remainingTasks),
        idealBurndown: idealBurndown,
        totalTasks: totalTasks
      });
    }

    setChartData(burndownPoints);
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
          <p className={`mt-6 text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>스프린트 번다운 보고서 로딩 중...</p>
        </div>
      </div>
    );
  }

  const currentEpicName = selectedEpicId 
    ? epics.find(e => e.id === selectedEpicId)?.title || "선택된 타임라인"
    : "타임라인을 선택하세요";

  const currentProjectName = currentProject?.name || "프로젝트";

  // 실제 차트 데이터 (번다운)
  const realChartData = {
    labels: chartData.map(point => point.date),
    datasets: [
      {
        label: '남은 작업',
        data: chartData.map(point => point.remainingTasks),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.1,
        pointRadius: 4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
      },
      {
        label: '이상적인 번다운',
        data: chartData.map(point => point.idealBurndown),
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.1,
        pointRadius: 3,
        pointBackgroundColor: 'rgb(156, 163, 175)',
      },
      {
        label: '전체 작업 범위',
        data: chartData.map(() => chartData[0]?.totalTasks || 0),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        borderDash: [10, 5],
        fill: false,
        tension: 0,
        pointRadius: 0,
        pointBackgroundColor: 'rgb(239, 68, 68)',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'start' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'line',
          padding: 20,
          font: {
            size: 12,
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            const datasetLabel = context.dataset.label;
            const value = context.parsed.y;
            if (datasetLabel === '전체 작업 범위') {
              return `${datasetLabel}: ${value}개 (고정)`;
            }
            return `${datasetLabel}: ${value}개`;
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: '날짜',
          font: {
            size: 12,
            weight: 'normal' as const
          }
        },
        grid: {
          display: true,
          color: theme === 'dark' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(156, 163, 175, 0.3)',
        }
      },
      y: {
        title: {
          display: true,
          text: '작업 수',
          font: {
            size: 12,
            weight: 'normal' as const
          }
        },
        beginAtZero: true,
        max: Math.max(chartData[0]?.totalTasks || 0, Math.max(...chartData.map(p => p.remainingTasks), 0)) + 2,
        ticks: {
          stepSize: 1,
        },
        grid: {
          display: true,
          color: theme === 'dark' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(156, 163, 175, 0.3)',
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  } as any;

  // 실제 테이블 데이터 생성 (완료된 작업들)
  const taskEvents: TaskEvent[] = tasks
    .filter(task => task.status === 'done') // 완료된 작업만
    .slice(0, 10) // 최근 10개 작업만 표시
    .map(task => ({
      date: new Date(task.updatedAt).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      event: '작업 완료됨',
      task: task.title,
      assignee: task.assignee || '미지정',
      epic: task.epic?.title || currentEpicName
    }));

  // 에픽 선택 처리
  const handleEpicChange = (epicId: string) => {
    setSelectedEpicId(epicId);
    router.push(`/reports/sprint-burndown?epicId=${epicId}`);
  };

  // 날짜 범위 계산
  const selectedEpic = epics.find(epic => epic.id === selectedEpicId);
  const dateRange = selectedEpic?.startDate && selectedEpic?.endDate 
    ? `${new Date(selectedEpic.startDate).toLocaleDateString('ko-KR')} - ${new Date(selectedEpic.endDate).toLocaleDateString('ko-KR')}`
    : chartData.length > 0 
    ? `${chartData[0]?.date} - ${chartData[chartData.length - 1]?.date}`
    : '데이터 없음';

  // 진행률 계산
  const completedTasks = tasks.filter(task => task.status === 'done').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

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
        <main className="flex-1 overflow-y-auto">
          {/* 브레드크럼과 헤더 */}
          <div className="border-b border-border bg-background">
            <div className="px-6 py-4">
              {/* 브레드크럼 */}
              <div className="flex items-center text-sm text-muted-foreground mb-4">
                <span>프로젝트</span>
                <span className="mx-2">/</span>
                <span>{currentProjectName}</span>
                <span className="mx-2">/</span>
                <span>보고서</span>
              </div>
              
              {/* 페이지 헤더 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.back()}
                    className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                  <h1 className="text-2xl font-bold text-foreground">스프린트 번다운 보고서</h1>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="flex items-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors">
                    이 보고서를 읽는 방법
                  </button>
                  <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <ShareIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <MoreHorizontalIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 필터 영역 */}
          <div className="px-6 py-4 bg-background border-b border-border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">타임라인</span>
                <div className="relative">
                  <select
                    value={selectedEpicId || ''}
                    onChange={(e) => handleEpicChange(e.target.value)}
                    className="min-w-[250px] px-3 py-2 bg-background border border-border rounded-md text-sm hover:bg-muted transition-colors appearance-none"
                  >
                    <option value="">타임라인 선택</option>
                    {epics.map(epic => (
                      <option key={epic.id} value={epic.id}>
                        {epic.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 pointer-events-none" />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">추적 필드</span>
                <div className="relative">
                  <button className="flex items-center justify-between min-w-[150px] px-3 py-2 bg-background border border-border rounded-md text-sm hover:bg-muted transition-colors">
                    <span>작업 수</span>
                    <ChevronDownIcon className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 요약 정보 */}
          <div className="px-6 py-3 bg-muted/50">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="font-medium">분석 기간</span>
                  <span className="text-muted-foreground">- {dateRange}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">진행률</span>
                  <span className={`font-semibold ${completionRate >= 80 ? 'text-green-600' : completionRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {completionRate}% ({completedTasks}/{totalTasks})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 차트 영역 */}
          <div className="px-6 py-6">
            {chartData.length > 0 ? (
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium mb-2">번다운 차트</h3>
                  <p className="text-sm text-muted-foreground">
                    남은 작업 수가 시간에 따라 감소하는 추세를 확인하세요. 파란색 실선이 이상적인 번다운 아래에 있으면 일정보다 빠르게 진행되고 있는 것입니다.
                  </p>
                </div>
                <div className="h-96">
                  <Line data={realChartData} options={chartOptions} />
                </div>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <p className="text-muted-foreground">
                  {selectedEpicId 
                    ? "선택한 타임라인에 작업 데이터가 없습니다." 
                    : "타임라인을 선택하여 스프린트 번다운 차트를 확인하세요."
                  }
                </p>
              </div>
            )}
          </div>

          {/* 테이블 영역 */}
          {taskEvents.length > 0 && (
            <div className="px-6 pb-6">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                  <h3 className="text-lg font-medium">완료된 작업</h3>
                  <p className="text-sm text-muted-foreground mt-1">번다운에 영향을 미친 최근 완료된 작업들입니다.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          완료 날짜
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          상태
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          작업 제목
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          담당자
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          타임라인
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {taskEvents.map((event, index) => (
                        <tr key={index} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {event.date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                              {event.event}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate">
                            {event.task}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              {event.assignee}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                              {event.epic}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function SprintBurndownReportPage() {
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
          <p className="mt-6 text-lg font-medium text-gray-300">스프린트 번다운 보고서 로딩 중...</p>
        </div>
      </div>
    }>
      <SprintBurndownReportPageContent />
    </Suspense>
  );
}
