// app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
// import { v4 as uuidv4 } from "uuid"; // uuidv4 주석 처리
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import {
  VideoIcon,
  UsersIcon,
  Trello,
  FileTextIcon,
  CalendarIcon,
  LayoutDashboardIcon,
  SearchIcon,
  BellIcon,
  UserIcon,
  SettingsIcon,
  FolderIcon,
  PlusIcon,
  LogOutIcon,
  XIcon,
  BarChart3Icon,
  SunIcon,
  MoonIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  StarIcon,
  // Edit3Icon, // 사용하지 않는 아이콘 제거
} from "lucide-react";
import Link from "next/link";
// import Image from "next/image"; // Image 주석 처리
import { useAuth } from "./contexts/AuthContext";
import { useProject } from "./contexts/ProjectContext";
import { Task, TaskStatus } from "@/components/kanban/KanbanBoard";
// import { useTasks } from "@/hooks/useTasks"; // useTasks 임포트 제거

// shadcn/ui DropdownMenu 컴포넌트 임포트
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// API 응답에 project 객체가 포함되므로, 이를 반영하는 새로운 타입을 정의합니다.
// 기존 Task 타입의 필드도 포함하도록 확장합니다。
interface TaskWithProjectInfo extends Task {
  project?: {
    id: string;
    name: string;
  } | null;
}

// 알림 타입 정의
type Notification = {
  id: string;
  type: "invitation" | "document_update" | "task_assigned" | "generic" | "task_created" | "task_updated";
  title: string;
  message: string;
  link: string;
  createdAt: string; // ISO 문자열 또는 Date 객체
  isRead?: boolean;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  projectId?: string; // 프로젝트 초대의 경우 프로젝트 ID
  taskId?: string; // 작업 관련 알림의 경우 작업 ID
};

// 작업 알림 타입 정의
type TaskNotification = {
  id: string;
  projectId: string;
  taskId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  project?: {
    name: string;
  };
};

// Invitation 타입을 page.tsx 내에 정의 (또는  import)
type Invitation = {
  id: string;
  projectId: string;
  createdAt: string;
  project: {
    id: string;
    name: string;
    user?: { 
      name: string;
    };
  };
};

// 일정 타입 정의
type CalendarEvent = {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  projectId?: string;
  userId?: string;
  project?: {
    id: string;
    name: string;
  };
};

// 새로 추가된 타입 정의
interface NewTaskData {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  projectId?: string;
}

interface MeetingRecord {
  id: string;
  title?: string;
  startTime: string;
  participants: string | unknown[]; 
}

interface DocumentSummary {
  id: string;
  title?: string;
  updatedAt: string;
  createdAt: string;
  isStarred?: boolean;
  projectId?: string;
}

// 실제 프로젝트 초대 알림을 가져오는 함수
const fetchProjectInvitationsAsNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await fetch("/api/projects/invitations", {
      headers: {
        "Cache-Control": "no-cache", 
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch invitations:", response.status, await response.text());
      return [];
    }

    const invitations: Invitation[] = await response.json();

    return invitations.map((invitation) => ({
      id: invitation.id, 
      projectId: invitation.projectId, 
      type: "invitation",
      title: `'${invitation.project.name}' 프로젝트 초대`,
      message: `초대자: ${invitation.project.user?.name || '정보 없음'}`,
      link: "/projects/invitations", 
      createdAt: invitation.createdAt,
      icon: <UsersIcon className="w-5 h-5" />,
      iconBgColor: "bg-blue-50",
      iconColor: "text-blue-500",
      isRead: false, 
    }));
  } catch (error) {
    console.error("Error fetching or processing project invitations:", error);
    return []; 
  }
};

// 작업 관련 알림을 가져오는 함수
const fetchTaskNotifications = async (): Promise<Notification[]> => {
  try {
    const response = await fetch("/api/notifications/tasks", {
      headers: {
        "Cache-Control": "no-cache", 
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch task notifications:", response.status, await response.text());
      return [];
    }

    const taskNotifications: TaskNotification[] = await response.json();

    return taskNotifications.map((notification) => {
      let icon = <Trello className="w-5 h-5" />;
      let iconBgColor = "bg-purple-50";
      let iconColor = "text-purple-500";
      
      if (notification.status === "todo") {
        icon = <ClockIcon className="w-5 h-5" />;
        iconBgColor = "bg-gray-50";
        iconColor = "text-gray-500";
      } else if (notification.status === "in-progress") {
        icon = <AlertCircleIcon className="w-5 h-5" />;
        iconBgColor = "bg-blue-50";
        iconColor = "text-blue-500";
      } else if (notification.status === "review") {
        icon = <AlertCircleIcon className="w-5 h-5" />;
        iconBgColor = "bg-yellow-50";
        iconColor = "text-yellow-500";
      } else if (notification.status === "done") {
        icon = <CheckCircleIcon className="w-5 h-5" />;
        iconBgColor = "bg-green-50";
        iconColor = "text-green-500";
      }

      const isNew = new Date(notification.createdAt).getTime() === new Date(notification.updatedAt).getTime();
      const type = isNew ? "task_created" : "task_updated";
      
      const projectName = notification.project?.name || '프로젝트';
      const message = isNew 
        ? `${projectName}에 새 작업이 추가되었습니다.` 
        : `${projectName}의 작업 상태가 ${notification.status}(으)로 변경되었습니다.`;
      
      const link = notification.projectId 
        ? `/kanban?projectId=${notification.projectId}`
        : "/kanban";

      return {
        id: `task-${notification.id}-${Date.now()}`, 
        type,
        title: notification.title,
        message,
        link,
        createdAt: notification.updatedAt, 
        icon,
        iconBgColor,
        iconColor,
        projectId: notification.projectId,
        taskId: notification.taskId,
        isRead: false,
      };
    });
  } catch (error) {
    console.error("Error fetching or processing task notifications:", error);
    return []; 
  }
};

// 작업 상태 분포 차트 컴포넌트
function TaskStatusChart({ projectId }: { projectId?: string }) {
  const [taskStats, setTaskStats] = useState({
    todo: 0,
    inProgress: 0,
    done: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<1 | 2>(1); // 차트 타입 상태 추가
  const [hoveredSection, setHoveredSection] = useState<string | null>(null); // 호버 상태 추가

  useEffect(() => {
    const fetchTaskStats = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/projects/${projectId}/tasks`);
        if (!response.ok) throw new Error('작업 통계를 불러오는데 실패했습니다');
        
        const tasks = await response.json();
        
        const stats = {
          todo: tasks.filter((task: any) => task.status === 'todo').length,
          inProgress: tasks.filter((task: any) => task.status === 'in-progress').length,
          done: tasks.filter((task: any) => task.status === 'done' || task.status === 'review').length,
          total: tasks.length
        };
        
        setTaskStats(stats);
        setError(null);
      } catch (err) {
        setError('작업 통계를 불러오는데 실패했습니다');
        setTaskStats({ todo: 0, inProgress: 0, done: 0, total: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchTaskStats();
  }, [projectId]);

  // 바 차트 SVG 생성
  const createBarChart = () => {
    const { todo, inProgress, done, total } = taskStats;
    
    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <div className="w-80 h-48 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold">0</div>
              <div className="text-base">총 업무 항목</div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-base">작업이 없습니다</p>
          </div>
        </div>
      );
    }

    const maxValue = Math.max(todo, inProgress, done);
    const barHeight = 200;
    const barWidth = 60;
    const spacing = 40;
    
    const todoHeight = maxValue > 0 ? (todo / maxValue) * barHeight : 0;
    const inProgressHeight = maxValue > 0 ? (inProgress / maxValue) * barHeight : 0;
    const doneHeight = maxValue > 0 ? (done / maxValue) * barHeight : 0;

    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-end justify-center space-x-12 w-full">
          {/* 바 차트 */}
          <div className="flex items-end space-x-8">
            {/* 해야 할 일 바 */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div 
                  className="bg-pink-500 rounded-t-lg transition-all duration-500 flex items-end justify-center"
                  style={{ 
                    width: `${barWidth}px`, 
                    height: `${Math.max(todoHeight, 20)}px` 
                  }}
                >
                  {todo > 0 && (
                    <span className="text-white font-bold text-sm mb-2">{todo}</span>
                  )}
                </div>
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">해야 할 일</div>
              </div>
            </div>

            {/* 진행 중 바 */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div 
                  className="bg-blue-500 rounded-t-lg transition-all duration-500 flex items-end justify-center"
                  style={{ 
                    width: `${barWidth}px`, 
                    height: `${Math.max(inProgressHeight, 20)}px` 
                  }}
                >
                  {inProgress > 0 && (
                    <span className="text-white font-bold text-sm mb-2">{inProgress}</span>
                  )}
                </div>
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">진행 중</div>
              </div>
            </div>

            {/* 완료 바 */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div 
                  className="bg-orange-500 rounded-t-lg transition-all duration-500 flex items-end justify-center"
                  style={{ 
                    width: `${barWidth}px`, 
                    height: `${Math.max(doneHeight, 20)}px` 
                  }}
                >
                  {done > 0 && (
                    <span className="text-white font-bold text-sm mb-2">{done}</span>
                  )}
                </div>
              </div>
              <div className="mt-3 text-center">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">완료</div>
              </div>
            </div>
          </div>

          {/* 총계 표시 */}
          <div className="flex flex-col items-center justify-center ml-8">
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">{total}</div>
            <div className="text-base text-gray-500 dark:text-gray-400">총 업무 항목</div>
          </div>
        </div>
      </div>
    );
  };

  // 도넛 차트 SVG 생성
  const createDonutChart = () => {
    const { todo, inProgress, done, total } = taskStats;
    
    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <div className="w-44 h-44 rounded-full border-12 border-gray-200 dark:border-gray-600 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold">0</div>
              <div className="text-base">총 업무 항목</div>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-base">작업이 없습니다</p>
          </div>
        </div>
      );
    }

    const radius = 90;
    const strokeWidth = 24;
    const normalizedRadius = radius - strokeWidth * 0.5;
    const circumference = normalizedRadius * 2 * Math.PI;
    
    // 각 상태별 비율 계산
    const todoPercent = (todo / total) * 100;
    const inProgressPercent = (inProgress / total) * 100;
    const donePercent = (done / total) * 100;
    
    // 각 섹션의 stroke-dasharray 계산
    const todoStroke = (todoPercent / 100) * circumference;
    const inProgressStroke = (inProgressPercent / 100) * circumference;
    const doneStroke = (donePercent / 100) * circumference;
    
    // 각 섹션의 시작 위치 계산 (회전)
    const todoOffset = 0;
    const inProgressOffset = todoStroke;
    const doneOffset = todoStroke + inProgressStroke;

    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center justify-center space-x-8 w-full">
          {/* 도넛 차트 */}
          <div className="relative flex-shrink-0">
            <svg 
              width="200" 
              height="200" 
              className="transform -rotate-90"
              viewBox="0 0 220 220"
            >
              {/* 배경 원 */}
              <circle
                cx="110"
                cy="110"
                r={normalizedRadius}
                stroke="#e5e7eb"
                strokeWidth={strokeWidth}
                fill="transparent"
                className="dark:stroke-gray-600"
              />
              
              {/* 해야 할 일 (분홍색) */}
              {todo > 0 && (
                <circle
                  cx="110"
                  cy="110"
                  r={normalizedRadius}
                  stroke="#ec4899"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${todoStroke} ${circumference}`}
                  strokeDashoffset={-todoOffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer hover:brightness-110"
                  onMouseEnter={() => setHoveredSection('todo')}
                  onMouseLeave={() => setHoveredSection(null)}
                />
              )}
              
              {/* 진행 중 (파란색) */}
              {inProgress > 0 && (
                <circle
                  cx="110"
                  cy="110"
                  r={normalizedRadius}
                  stroke="#3b82f6"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${inProgressStroke} ${circumference}`}
                  strokeDashoffset={-inProgressOffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer hover:brightness-110"
                  onMouseEnter={() => setHoveredSection('inProgress')}
                  onMouseLeave={() => setHoveredSection(null)}
                />
              )}
              
              {/* 완료 (주황색) */}
              {done > 0 && (
                <circle
                  cx="110"
                  cy="110"
                  r={normalizedRadius}
                  stroke="#f97316"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={`${doneStroke} ${circumference}`}
                  strokeDashoffset={-doneOffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer hover:brightness-110"
                  onMouseEnter={() => setHoveredSection('done')}
                  onMouseLeave={() => setHoveredSection(null)}
                />
              )}
            </svg>
            
            {/* 중앙 텍스트 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {hoveredSection ? (
                <>
                  <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                    {hoveredSection === 'todo' && `${Math.round((todo / total) * 100)}%`}
                    {hoveredSection === 'inProgress' && `${Math.round((inProgress / total) * 100)}%`}
                    {hoveredSection === 'done' && `${Math.round((done / total) * 100)}%`}
                  </div>
                  <div className="text-base text-gray-500 dark:text-gray-400">
                    {hoveredSection === 'todo' && '해야 할 일'}
                    {hoveredSection === 'inProgress' && '진행 중'}
                    {hoveredSection === 'done' && '완료'}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-bold text-gray-900 dark:text-gray-100">{total}</div>
                  <div className="text-base text-gray-500 dark:text-gray-400">총 업무 항목</div>
                </>
              )}
            </div>
          </div>
          
          {/* 범례 */}
          <div className="space-y-4">
            <div 
              className="flex items-center cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md"
              onMouseEnter={() => setHoveredSection('todo')}
              onMouseLeave={() => setHoveredSection(null)}
            >
              <div className="w-5 h-5 rounded-full bg-pink-500 mr-4"></div>
              <span className="text-base text-gray-700 dark:text-gray-300">
                해야 할 일: {todo}
              </span>
            </div>
            <div 
              className="flex items-center cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md"
              onMouseEnter={() => setHoveredSection('inProgress')}
              onMouseLeave={() => setHoveredSection(null)}
            >
              <div className="w-5 h-5 rounded-full bg-blue-500 mr-4"></div>
              <span className="text-base text-gray-700 dark:text-gray-300">
                진행 중: {inProgress}
              </span>
            </div>
            <div 
              className="flex items-center cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-md"
              onMouseEnter={() => setHoveredSection('done')}
              onMouseLeave={() => setHoveredSection(null)}
            >
              <div className="w-5 h-5 rounded-full bg-orange-500 mr-4"></div>
              <span className="text-base text-gray-700 dark:text-gray-300">
                완료: {done}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        {/* 차트 전환 버튼 */}
        <div className="flex justify-center mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setChartType(1)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                chartType === 1
                  ? 'bg-blue-500 dark:bg-blue-400 scale-125'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
            <button
              onClick={() => setChartType(2)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                chartType === 2
                  ? 'bg-blue-500 dark:bg-blue-400 scale-125'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          </div>
        </div>
        
        {/* 로딩 상태 */}
        <div className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        {/* 차트 전환 버튼 */}
        <div className="flex justify-center mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setChartType(1)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                chartType === 1
                  ? 'bg-blue-500 dark:bg-blue-400 scale-125'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
            <button
              onClick={() => setChartType(2)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                chartType === 2
                  ? 'bg-blue-500 dark:bg-blue-400 scale-125'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          </div>
        </div>
        
        {/* 에러 상태 */}
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <BarChart3Icon className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-center text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!projectId) {
    return (
      <div className="flex flex-col h-full">
        {/* 차트 전환 버튼 */}
        <div className="flex justify-center mb-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setChartType(1)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                chartType === 1
                  ? 'bg-blue-500 dark:bg-blue-400 scale-125'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
            <button
              onClick={() => setChartType(2)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                chartType === 2
                  ? 'bg-blue-500 dark:bg-blue-400 scale-125'
                  : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
            />
          </div>
        </div>
        
        {/* 빈 상태 메시지 */}
        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <BarChart3Icon className="w-10 h-10 mb-2 opacity-50" />
          <p className="text-center">프로젝트를 선택하면</p>
          <p className="text-center text-sm mt-1">작업 진행 상황을 확인할 수 있습니다</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 차트 전환 버튼 */}
      <div className="flex justify-center mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setChartType(1)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              chartType === 1
                ? 'bg-blue-500 dark:bg-blue-400 scale-125'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
          />
          <button
            onClick={() => setChartType(2)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              chartType === 2
                ? 'bg-blue-500 dark:bg-blue-400 scale-125'
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
            }`}
          />
        </div>
      </div>
      
      {/* 차트 영역 */}
      <div className="flex-1 relative overflow-hidden min-h-[300px]">
        <div className={`absolute inset-0 w-full h-full transition-all duration-500 ease-in-out transform ${
          chartType === 1 ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        }`}>
          <div className="w-full h-full">
            {createDonutChart()}
          </div>
        </div>
        <div className={`absolute inset-0 w-full h-full transition-all duration-500 ease-in-out transform ${
          chartType === 2 ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}>
          <div className="w-full h-full">
            {createBarChart()}
          </div>
        </div>
      </div>
    </div>
  );
}

// 작업 생성 모달 컴포넌트
function TaskCreateModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  projectId,
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (task: NewTaskData) => Promise<void>; // 타입 변경
  projectId?: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // 모달 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // ESC 키 감지
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await onSubmit({
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? dueDate : undefined,
        projectId
      });
      
      // 폼 초기화
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setDueDate("");
      
      onClose();
    } catch (error) {
      console.error("작업 생성 중 오류:", error);
      alert("작업 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50`}>
      <div 
        ref={modalRef}
        className={`w-full max-w-md p-6 rounded-lg shadow-xl bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">새 작업 추가</h3>
          <button 
            onClick={onClose} 
            className={`p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700`}
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">제목 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full px-3 py-2 rounded-md bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="작업 제목"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-3 py-2 rounded-md bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="작업 설명"
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">상태</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className={`w-full px-3 py-2 rounded-md bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="todo">할 일</option>
                  <option value="in-progress">진행 중</option>
                  <option value="review">검토</option>
                  <option value="done">완료</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">우선순위</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                  className={`w-full px-3 py-2 rounded-md bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="low">낮음</option>
                  <option value="medium">중간</option>
                  <option value="high">높음</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">마감일</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-md bg-white border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 border focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-md 
                  bg-gray-200 hover:bg-gray-300 text-gray-700
                  dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200
                `}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 rounded-md 
                  bg-blue-600 hover:bg-blue-700 text-white
                  dark:bg-blue-700 dark:hover:bg-blue-600
                 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                    저장 중...
                  </span>
                ) : '저장'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // 테마 관련 코드 수정
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // theme 값 계산
  const theme = (currentTheme || 'dark') as 'light' | 'dark';

  // next-themes hydration 처리를 위한 mounted 상태 추가
  useEffect(() => {
    setMounted(true);
  }, []);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  // const [roomId, /* setRoomId */] = useState(""); // roomId 및 setRoomId 주석 처리

  // 기존의 theme 저장 useEffect 제거 (next-themes가 자동으로 처리)

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const {
    projects,
    hasProjects,
    loading: projectLoading,
    currentProject,
    setCurrentProject,
    acceptProjectInvitation,
    rejectProjectInvitation
  } = useProject();
  // const { tasks = [], loading: tasksLoading } = useTasks( // tasks 변수 제거
  //   currentProject?.id || null
  // );

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const lastNotificationCountRef = useRef(0);
  const notificationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const previousNotificationsRef = useRef<Notification[]>([]);
  const initialLoadDoneRef = useRef(false);

  const loadNotifications = async (isPanelOpening?: boolean) => {
    if (user) { 
      let shouldShowLoadingOuter = false;
      try {
        shouldShowLoadingOuter = (isPanelOpening && !initialLoadDoneRef.current) || !initialLoadDoneRef.current;
        if (shouldShowLoadingOuter) {
          setNotificationLoading(true);
        }
        setNotificationError(null);
        
        const invitationNotifications = await fetchProjectInvitationsAsNotifications();
        const taskNotifications = await fetchTaskNotifications();
        const allNotifications = [...invitationNotifications, ...taskNotifications];
        
        const sortedNotifications = allNotifications.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        const newCount = sortedNotifications.length;
        
        if (initialLoadDoneRef.current && newCount > previousNotificationsRef.current.length) {
           const prevIds = new Set(previousNotificationsRef.current.map(n => n.id));
           const hasTrulyNew = sortedNotifications.some(n => !prevIds.has(n.id));
           if (hasTrulyNew) {
          setHasNewNotifications(true);
           }
        }
        
        lastNotificationCountRef.current = newCount;
        
        const areNotificationsEqual = (prev: Notification[], next: Notification[]) => {
          if (prev.length !== next.length) return false;
          const sortById = (a: Notification, b: Notification) => a.id.localeCompare(b.id);
          const sortedPrev = [...prev].sort(sortById);
          const sortedNext = [...next].sort(sortById);
          
          return sortedPrev.every((notification, index) => 
            notification.id === sortedNext[index].id &&
            notification.type === sortedNext[index].type &&
            notification.message === sortedNext[index].message 
          );
        };
        
        if (!areNotificationsEqual(previousNotificationsRef.current, sortedNotifications)) {
          setNotifications(sortedNotifications);
          previousNotificationsRef.current = [...sortedNotifications];
        }
        
        initialLoadDoneRef.current = true;
      } catch (err: unknown) { // err 타입을 unknown으로 변경
        console.error("알림 로딩 중 오류:", err);
        const errorMessage = err instanceof Error ? err.message : "알림 로딩 중 오류 발생";
        setNotificationError(errorMessage);
      } finally {
        if (shouldShowLoadingOuter) {
          setNotificationLoading(false);
        }
      }
    }
  };

  useEffect(() => {
    if (showNotificationPanel) {
      setHasNewNotifications(false);
      loadNotifications(true);
      }
  }, [showNotificationPanel]);

  useEffect(() => {
    if (user && !authLoading) {
      if (!initialLoadDoneRef.current) {
      loadNotifications();
      }
    }
    
    if (user && !authLoading && !notificationIntervalRef.current) {
      let lastApiCallTime = Date.now();
      
      notificationIntervalRef.current = setInterval(() => {
        const now = Date.now();
        if (now - lastApiCallTime >= 5000) { 
          loadNotifications();
          lastApiCallTime = now;
        }
      }, 1000); 
    }
    
    return () => {
      if (notificationIntervalRef.current) {
        clearInterval(notificationIntervalRef.current);
        notificationIntervalRef.current = null;
      }
    };
  }, [user, authLoading]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
    } else if (!authLoading && !projectLoading && user && !hasProjects) {
      router.push("/projects/new");
    }
  }, [authLoading, projectLoading, user, hasProjects, router]);

  useEffect(() => {
    if (hasProjects && !currentProject && projects.length > 0) {
      setCurrentProject(projects[0]);
    }
  }, [hasProjects, currentProject, projects, setCurrentProject]);

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
  
  // hydration mismatch 방지
  if (!mounted) {
    return null;
  }

  if (authLoading || projectLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-background text-foreground`}>
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
          <p className={`mt-6 text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Colla 로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasProjects) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("로그아웃 오류:", error);
    }
  };

  const handleAcceptInvitation = async (invitationId: string, projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (processingInvitation) return; 
    try {
      setProcessingInvitation(invitationId);
      await acceptProjectInvitation(projectId);
      setNotifications(prev => prev.filter(notification => 
        !(notification.type === 'invitation' && notification.id === invitationId)
      ));
      lastNotificationCountRef.current = Math.max(0, lastNotificationCountRef.current - 1);
    } catch (error) {
      console.error("초대 수락 오류:", error);
    } finally {
      setProcessingInvitation(null);
      loadNotifications();
    }
  };
  
  const handleRejectInvitation = async (invitationId: string, projectId: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (processingInvitation) return; 
    try {
      setProcessingInvitation(invitationId);
      await rejectProjectInvitation(projectId);
      setNotifications(prev => prev.filter(notification => 
        !(notification.type === 'invitation' && notification.id === invitationId)
      ));
      lastNotificationCountRef.current = Math.max(0, lastNotificationCountRef.current - 1);
    } catch (error) {
      console.error("초대 거절 오류:", error);
    } finally {
      setProcessingInvitation(null);
      loadNotifications();
    }
  };

  const handleAddTask = async (taskData: NewTaskData) => {
    try {
      const url = taskData.projectId 
        ? `/api/projects/${taskData.projectId}/tasks` 
        : "/api/tasks";
      
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });
      
      if (!response.ok) {
        throw new Error("작업을 추가하는데 실패했습니다.");
      }
      
      const createdTask = await response.json();
      
      // 작업 생성 이벤트 트리거 (새 작업 알림 용도)
      try {
        await fetch("/api/notifications/task-events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: "task_created",
            taskId: createdTask.id,
            projectId: createdTask.projectId,
          }),
        });
      } catch (notificationError) {
        console.error("작업 생성 알림 전송 실패:", notificationError);
      }
      
      alert("작업이 성공적으로 추가되었습니다.");
    } catch (error) {
      console.error("작업 추가 중 오류:", error);
      throw error; // 모달에서 처리할 수 있도록 오류를 다시 던짐
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "좋은 아침이에요";
    if (hour >= 12 && hour < 18) return "좋은 오후에요";
    if (hour >= 18 && hour < 22) return "좋은 저녁이에요";
    return "좋은 밤 되세요";
  };

  return (
    <> 
      <CalendarStyles />
      <ModernScrollbarStyles />
      <div className="flex h-screen bg-background text-foreground">
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64  border-r border-gray-200 bg-background dark:border-gray-700 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:relative md:flex-shrink-0 flex flex-col`}
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-black dark:bg-blue-600 rounded-lg flex items-center justify-center mr-2">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">Colla</span>
            </div>
            <button
              className="md:hidden"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            >
              <XIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          <nav className="flex-grow px-4 py-4 space-y-2 overflow-y-auto">
            <SidebarLink
              icon={<SearchIcon className="w-5 h-5" />}
              text="검색"
              href="#" 
              theme={theme}
              onClick={(e) => { e.preventDefault(); alert('검색 기능 구현 예정'); }}
            />
            <SidebarLink
              icon={<LayoutDashboardIcon className="w-5 h-5" />}
              text="대시보드"
              href="/"
              active={pathname === "/"}
              theme={theme}
            />
            <SidebarLink
              icon={<BellIcon className="w-5 h-5" />}
              text="알림"
              href="#" 
              theme={theme}
              onClick={(e) => { 
                e.preventDefault(); 
                setShowNotificationPanel(!showNotificationPanel);
              }}
              badgeCount={hasNewNotifications ? 'new' : undefined}
            />
            <SidebarLink
              icon={<SettingsIcon className="w-5 h-5" />}
              text="설정"
              href="/settings" 
              active={pathname === "/settings"}
              theme={theme}
            />
            
            <div className="pt-4">
              <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                내 작업 공간
              </h3>
              <div className="mt-2 space-y-1">
                <SidebarLink
                  icon={<Trello className="w-5 h-5" />}
                  text="칸반보드"
                  href={currentProject ? `/kanban?projectId=${currentProject.id}` : "/kanban"}
                  active={pathname?.startsWith("/kanban")}
                  theme={theme}
                  small
                />
                <SidebarLink
                  icon={<CalendarIcon className="w-5 h-5" />}
                  text="캘린더"
                  href={currentProject ? `/calendar?projectId=${currentProject.id}` : "/calendar"}
                  active={pathname?.startsWith("/calendar")}
                  theme={theme}
                  small
                />
                <SidebarLink
                  icon={<FileTextIcon className="w-5 h-5" />}
                  text="문서"
                  href={currentProject?.id ? `/documents?projectId=${currentProject.id}` : "/documents"}
                  active={pathname?.startsWith("/documents")}
                  theme={theme}
                  small
                />
                
                {/* 문서 하위 메뉴 추가 */}
                {pathname?.startsWith("/documents") && (
                  <div className="pl-4 pt-1 space-y-1 ml-2.5">
                    <SidebarLink
                      icon={<FileTextIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      text="모든 문서"
                      href={currentProject?.id ? `/documents?projectId=${currentProject.id}` : "/documents"}
                      active={pathname?.startsWith("/documents") && !searchParams?.has("favorites") && !pathname?.includes("/new")}
                      theme={theme}
                      small
                    />
                    
                    <SidebarLink
                      icon={<StarIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      text="즐겨찾기"
                      href={currentProject?.id ? `/documents?projectId=${currentProject.id}&favorites=true` : "/documents?favorites=true"}
                      active={pathname?.startsWith("/documents") && searchParams?.has("favorites")}
                      theme={theme}
                      small
                    />
                    
                    <SidebarLink
                      icon={<PlusIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                      text="새 문서 작성"
                      href={currentProject?.id ? `/documents/new?projectId=${currentProject.id}` : "/documents/new"}
                      active={pathname?.includes("/documents/new")}
                      theme={theme}
                      small
                    />
                  </div>
                )}
                
                <SidebarLink 
                  icon={<UsersIcon className="w-5 h-5"/>} 
                  text="팀원 관리" 
                  href={currentProject ? `/projects/${currentProject.id}/members` : "/projects"}
                  active={pathname?.includes("/projects") && pathname?.includes("/members")}
                  theme={theme}
                  small 
                />
                <SidebarLink
                  icon={<VideoIcon className="w-5 h-5" />}
                  text="화상 회의"
                  href="/meeting"
                  active={pathname?.startsWith("/meeting")}
                  theme={theme}
                  small
                />
                <SidebarLink
                  icon={<BarChart3Icon className="w-5 h-5" />}
                  text="보고서"
                  href="/reports"
                  active={pathname?.startsWith("/reports")}
                  theme={theme}
                  small
                />
            </div>
          </div>

            <div className="pt-4">
              <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                프로젝트
              </h3>
              <nav className="mt-2 space-y-1">
                {projects.map((project) => (
                  <SidebarLink
                    key={project.id}
                    icon={<FolderIcon className="w-5 h-5" />}
                    text={project.name}
                    href={`/?projectId=${project.id}`} 
                    small
                    active={currentProject?.id === project.id && pathname === "/"}
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentProject(project);
                      router.push(`/?projectId=${project.id}`); 
                    }}
                    theme={theme}
                    isProject={true}
                  />
                ))}
                <SidebarLink
                  icon={<PlusIcon className="w-5 h-5" />}
                  text="새 프로젝트"
                  href="/projects/new"
                  active={pathname === "/projects/new"}
                  theme={theme}
                  small
                  onClick={() => router.push("/projects/new")}
                />
              </nav>
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
                  <UserIcon className="w-6 h-6 mr-3 rounded-full bg-gray-200 dark:bg-gray-600 p-0.5 text-gray-700 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{user.name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" sideOffset={5}>
                <DropdownMenuLabel className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/mypage')} className="cursor-pointer">
                  <UserIcon className="w-4 h-4 mr-2" />
                  <span>정보 수정</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                  {theme === 'dark' ? <SunIcon className="w-4 h-4 mr-2" /> : <MoonIcon className="w-4 h-4 mr-2" />}
                  <span>{theme === 'dark' ? "라이트 모드" : "다크 모드"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/50 focus:text-red-600 dark:focus:text-red-400">
                  <LogOutIcon className="w-4 h-4 mr-2" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {showNotificationPanel && (
          <div 
              className={`fixed top-0 left-0 md:left-64 h-full w-80 md:w-96 z-40 transform transition-transform duration-300 ease-in-out ${ 
              showNotificationPanel ? 'translate-x-0' : '-translate-x-full'
              } bg-white border-r border-gray-300 text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 shadow-lg flex flex-col`}
          >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700"> 
                  <div className="flex justify-between items-center">
                  <h3 className={`text-lg font-semibold`}>알림</h3>
                  <button 
                      onClick={() => setShowNotificationPanel(false)} 
                      className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                        <XIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                      </button>
                  </div>
                    </div>
                    
              <div className="flex-grow overflow-y-auto p-4">
                    {notificationLoading && (
                      <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500"></div>
                      </div>
                    )}

                    {notificationError && (
                      <div className="text-center py-10 text-red-500">
                        <p>{notificationError}</p>
                      </div>
                    )}

                    {!notificationLoading && !notificationError && notifications.length === 0 && (
                  <div className="text-center py-10 text-gray-400 dark:text-gray-500">
                  <BellIcon className="w-10 h-10 mx-auto mb-2" />
                        <p>새로운 알림이 없습니다.</p>
                      </div>
                    )}

                    {!notificationLoading && !notificationError && notifications.length > 0 && (
                  notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                      className="p-4 mb-1 rounded-lg flex flex-col transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => {
                      if (notification.type !== 'invitation') {
                          router.push(notification.link);
                          setShowNotificationPanel(false); 
                      }
                      }}
                          >
                            <div className="flex items-start">
                          <div className={`flex-shrink-0 p-2 rounded-full ${notification.iconBgColor || 'bg-gray-100'} dark:bg-gray-700 bg-opacity-20 mr-4`}>
                                {notification.icon || <BellIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${notification.iconColor || 'text-gray-900'} dark:text-gray-100`}>{notification.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-300 mt-1 truncate">
                                  {notification.message}
                                </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                                  {formatDateForNotification(notification.createdAt)}
                                </p>
                              </div>
                            </div>
                            
                            {notification.type === 'invitation' && notification.projectId && (
                              <div className="mt-3 flex justify-end space-x-2">
                                {processingInvitation === notification.id ? (
                                      <div className="text-xs flex items-center text-gray-500 dark:text-gray-400">
                                    <div className="mr-2 w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                    처리 중...
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={(e) => handleRejectInvitation(notification.id, notification.projectId as string, e)}
                                      className="px-3 py-1 rounded text-xs font-medium bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-700 dark:hover:bg-red-600 dark:text-red-100 transition-colors"
                                    >
                                      거절
                                    </button>
                                    <button
                                      onClick={(e) => handleAcceptInvitation(notification.id, notification.projectId as string, e)}
                                      className="px-3 py-1 rounded text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 dark:text-blue-100 transition-colors"
                                    >
                                      수락
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                            {(notification.type === 'task_created' || notification.type === 'task_updated') && (
                              <div className="mt-3 flex justify-end">
                                <button
                                  onClick={() => {
                                    router.push(notification.link);
                                          setShowNotificationPanel(false);
                                  }}
                                  className="px-3 py-1 rounded text-xs font-medium bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 dark:text-purple-100 transition-colors"
                                >
                                  칸반보드로 이동
                                </button>
                              </div>
                            )}
                          </div>
                  ))
                    )}
              </div>
                    
              {/* "모든 알림 보기 페이지로" 링크 제거 */}
                </div>
              )}

        <div className={`flex-1 flex flex-col overflow-hidden ${showNotificationPanel ? 'pl-80 md:pl-96' : ''} transition-all duration-300 ease-in-out`}>
          {/* 상단 헤더 제거 */}
          <main className="flex flex-col flex-1 p-6 lg:p-8 overflow-y-auto bg-background">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">{getGreeting()}, {user.name}님!</h2>
              <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {currentProject ? `${currentProject.name} 에 대한 요약을 확인하세요.` : '프로젝트를 선택하면 요약 정보를 확인할 수 있습니다.'}
              </p>
            </div>

            <div className="flex flex-col gap-8 flex-1"> {/* 변경: flex-col로 전환 */}
              {/* 상단 행 Wrapper: flex-grow 비율 4 */}
              <div className="min-[1400px]:flex-[4] grid grid-cols-1 min-[1400px]:grid-cols-12 gap-8">
                {/* 프로젝트 진행 상황 */}
                <DashboardWidget
                  title="프로젝트 진행 상황"
                  viewAllLink="/reports"
                  className="min-[1400px]:col-span-6 h-[400px]"
                >
                  <TaskStatusChart projectId={currentProject?.id} />
                </DashboardWidget>

                {/* 나에게 할당된 작업 */}
                <DashboardWidget
                  title="나에게 할당된 작업"
                  viewAllLink="/kanban"
                  className="min-[1400px]:col-span-6 h-[400px]" // 5개 작업이 보이도록 높이 증가
                  actionButton={
                    <button 
                      onClick={() => setShowTaskModal(true)} 
                      className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                      title="새 작업 만들기"
                    >
                      <PlusIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                    </button>
                  }
                  withScroll={true}
                >
                  <SimplifiedKanbanBoard /> {/* theme prop 제거 */}
                </DashboardWidget>
              </div>

              {/* 하단 행 Wrapper: flex-grow 비율 6 */}
              <div className="min-[1400px]:flex-[6] grid grid-cols-1 min-[1400px]:grid-cols-12 gap-8">
                {/* 다가오는 일정 */}
                <DashboardWidget
                  title="다가오는 일정"
                  viewAllLink="/calendar"
                  // className="order-4 min-[1400px]:order-2 min-[1400px]:col-span-6 h-full"
                  className="min-[1400px]:col-span-6 h-full" // 변경: order 제거
                >
                  <UpcomingEvents /> {/* theme prop 제거 */}
                </DashboardWidget>

                {/* 최근 문서 & 최근 회의 컨테이너 */}
                {/* <div className="order-5 min-[1400px]:order-3 min-[1400px]:col-span-6 flex flex-col gap-8 h-full"> */}
                <div className="min-[1400px]:col-span-6 flex flex-col gap-8 h-full"> {/* 변경: order 제거 */}
                  {/* 4a. 최근 문서 */}
                  <DashboardWidget
                    title="최근 문서"
                    viewAllLink={currentProject ? `/documents?projectId=${currentProject.id}` : "/documents"}
                    actionButton={
                      <button 
                        onClick={() => router.push(currentProject ? `/documents/new?projectId=${currentProject.id}` : '/documents/new')} 
                        className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                        title="새 문서 만들기"
                      >
                        <FileTextIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </button>
                    }
                  >
                    <RecentDocuments projectId={currentProject?.id} /> {/* theme prop 제거 */}
                  </DashboardWidget>

                  {/* 4b. 최근 회의 */}
                  <DashboardWidget
                    title="최근 회의"
                    viewAllLink="/meeting/records"
                    className="flex-1" // 유지
                  >
                    <RecentMeetings /> {/* theme prop 제거 */}
                  </DashboardWidget>
                </div>
              </div>
            </div>
          </main>
        </div> {/* flex-1 flex flex-col overflow-hidden ... 의 닫는 태그 */}

        {/* 작업 생성 모달 */}
        <TaskCreateModal 
          isOpen={showTaskModal} 
          onClose={() => setShowTaskModal(false)} 
          onSubmit={handleAddTask}
          projectId={currentProject?.id}
        />
      </div> {/* flex h-screen ... 의 닫는 태그 */}
    </> // 최상위 Fragment 닫는 태그
  );
}

function SidebarLink({
  icon,
  text,
  href,
  active = false,
  small = false,
  onClick,
  theme = "dark", 
  badgeCount,
  isProject = false // 프로젝트 링크인지 여부를 확인하는 새 prop
}: {
  icon: React.ReactNode;
  text: string;
  href: string;
  active?: boolean;
  small?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  theme?: "light" | "dark";
  badgeCount?: string | number;
  isProject?: boolean;
}) {
  // 활성 상태의 프로젝트를 위한 배경색 계산
  const activeProjectBg = theme === 'dark' 
    ? 'bg-blue-900 bg-opacity-30' // 다크 모드: 짙은 파란색 배경 (투명도 30%)
    : 'bg-blue-100 bg-opacity-50'; // 라이트 모드: 연한 파란색 배경 (투명도 50%)
    
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-between px-2 py-1.5 ${small ? "text-sm" : "text-[15px]"} rounded-md transition-colors duration-150 ${
        theme === 'dark'
          ? active && isProject
            ? `${activeProjectBg} text-gray-300 hover:bg-gray-700 hover:text-gray-100` // 활성 프로젝트: 투명한 파란색 배경
            : "text-gray-300 hover:bg-gray-700 hover:text-gray-100" // 일반/활성 상태: 텍스트 색상 동일
          : active && isProject
            ? `${activeProjectBg} text-gray-600 hover:bg-gray-200 hover:text-gray-900` // 활성 프로젝트: 투명한 파란색 배경
            : "text-gray-600 hover:bg-gray-200 hover:text-gray-900" // 일반/활성 상태: 텍스트 색상 동일
      }`}
    >
          <div className="flex items-center">
        <div className={`mr-2.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{icon}</div>
        <span>{text}</span>
          </div>
      {badgeCount && (
        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${badgeCount === 'new' ? (theme === 'dark' ? 'bg-red-500 text-white' : 'bg-red-500 text-white') : (theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700')}`}>
          {badgeCount === 'new' ? '' : badgeCount}
            </span>
          )}
    </Link>
  );
}

function DashboardWidget({ 
  title,
  children, 
  className = "",
  viewAllLink,
  actionButton,
  withScroll = false
}: {
  title: string;
  children: React.ReactNode; 
  className?: string;
  viewAllLink?: string;
  actionButton?: React.ReactNode;
  withScroll?: boolean;
}) {
  return (
    <div className={`rounded-xl shadow-sm bg-white border border-gray-200 dark:bg-[#2a2a2c] dark:border-gray-700 p-6 flex flex-col ${className}`}>
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {actionButton && <div className="ml-2">{actionButton}</div>} 
        </div>
        {viewAllLink && (
          <Link href={viewAllLink} className="text-base font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            모두 보기
          </Link>
        )}
        </div>
      <div className={withScroll ? "flex-1 overflow-y-auto pr-2" : "flex-1"}>{children}</div>
    </div>
  );
}

function RecentMeetings({ /* theme prop 제거 */ }: { /* theme prop 타입 제거 */ }) {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]); // 타입 변경
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/meetings');
        if (!response.ok) throw new Error('회의 목록을 불러오는데 실패했습니다');
        const result = await response.json();
        setMeetings(result.data.slice(0, 3)); 
        setError(null);
      } catch (err) {
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
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
  };

  const getParticipantCount = (participants: string | unknown[]) => { // 타입 변경
    if (!participants) return 0;
    try {
      const parsedParticipants = typeof participants === 'string' ? JSON.parse(participants) : participants;
      return Array.isArray(parsedParticipants) ? parsedParticipants.length : 0;
    } catch { return 0; }
  };

  if (loading) return <div className="flex justify-center items-center py-4 text-gray-500 dark:text-gray-400"> 로딩 중...</div>;
  if (error) return <div className="text-center py-4 text-red-500 dark:text-red-400">{error}</div>;
  if (meetings.length === 0) return <div className="text-center py-4 text-gray-400 dark:text-gray-500">회의 기록 없음</div>; // 수정: 라이트모드 색상 변경

    return (
    <div className="space-y-2">
      {meetings.map((meeting) => (
        <div
          key={meeting.id}
          onClick={() => router.push(`/meeting/records/${meeting.id}`)}
          className={`flex items-center p-2.5 rounded-lg cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-700`}
        >
          <div className={`mr-3 p-1.5 rounded-full bg-gray-100 dark:bg-gray-700`}>
            <VideoIcon className={`w-4 h-4 text-blue-600 dark:text-blue-400`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-medium truncate text-gray-800 dark:text-gray-200`}>
              {meeting.title || "제목 없는 회의"}
            </h4>
            <div className={`flex items-center text-xs text-gray-500 dark:text-gray-400`}>
              <span>{formatDate(meeting.startTime)}</span>
              <span className="mx-1.5">·</span>
              <UsersIcon className="w-3 h-3 mr-0.5" />
                <span>{getParticipantCount(meeting.participants)}명</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SimplifiedKanbanBoard({ /* theme prop 제거 */ }: { /* theme prop 타입 제거 */ }) {
  const { currentProject } = useProject();
  const { user } = useAuth();
  const [assignedTasks, setAssignedTasks] = useState<TaskWithProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchAssignedTasks = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/tasks/user/${user.id}`);
        
        if (!response.ok) {
          throw new Error('할당된 작업을 불러오는데 실패했습니다');
        }
        
        const data = await response.json();
        
        // 현재 프로젝트의 작업만 필터링
        let filteredTasks = data as TaskWithProjectInfo[];
        if (currentProject?.id) {
          filteredTasks = filteredTasks.filter(task => task.projectId === currentProject.id);
        }
        
        setAssignedTasks(filteredTasks);
      } catch (err) {
        console.error('할당된 작업 로딩 중 오류:', err);
        setError('할당된 작업을 불러오는데 실패했습니다');
        setAssignedTasks([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssignedTasks();
  }, [user, currentProject?.id]);

  // 마감일 관련 함수 추가
  const getDueDateInfo = (dueDate: string | Date | null | undefined) => {
    if (!dueDate) {
      return {
        text: "마감일 미설정",
        className: 'text-gray-400 dark:text-gray-500',
        icon: <ClockIcon className="w-3 h-3 mr-1" />
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 오늘 날짜의 시작 시간으로 설정
    
    const dueDateObj = new Date(dueDate);
    dueDateObj.setHours(0, 0, 0, 0); // 마감일의 시작 시간으로 설정
    
    const diffTime = dueDateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      // 마감일 지남
      return {
        text: `${Math.abs(diffDays)}일 지남`,
        className: 'text-red-500 dark:text-red-400',
        icon: <AlertCircleIcon className="w-3 h-3 mr-1" />
      };
    } else if (diffDays === 0) {
      // 오늘 마감
      return {
        text: "오늘 마감",
        className: 'text-orange-500 dark:text-orange-400',
        icon: <AlertCircleIcon className="w-3 h-3 mr-1" />
      };
    } else if (diffDays <= 3) {
      // 3일 이내 마감
      return {
        text: `${diffDays}일 남음`,
        className: 'text-yellow-500 dark:text-yellow-400',
        icon: <ClockIcon className="w-3 h-3 mr-1" />
      };
    } else {
      // 3일 이상 남음
      return {
        text: `${diffDays}일 남음`,
        className: 'text-green-500 dark:text-green-400',
        icon: <ClockIcon className="w-3 h-3 mr-1" />
      };
    }
  };

  // 상태에 따른 태그 스타일 정의
  const getStatusTag = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
            bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200`}>
            할 일
          </span>
        );
      case 'in-progress':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
            bg-blue-100 text-blue-800 dark:bg-blue-700 dark:text-blue-100`}>
            진행 중
          </span>
        );
      case 'review':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
            bg-yellow-100 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100`}>
            검토
          </span>
        );
      case 'done':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
            bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-100`}>
            완료
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) return <div className="flex justify-center items-center py-4 text-gray-500 dark:text-gray-400"> 로딩 중...</div>;
  if (error) return <div className="text-center py-4 text-red-500 dark:text-red-400">{error}</div>;
  if (assignedTasks.length === 0) return <div className="text-center py-4 text-gray-400 dark:text-gray-500">할당된 작업이 없습니다</div>; // 수정: 라이트모드 색상 변경

  return (
    <div className="space-y-1.5 overflow-y-auto pr-1 assigned-tasks-scrollbar">
      {assignedTasks.map((task) => (
        <div
          key={task.id}
          onClick={() => router.push(`/kanban?projectId=${task.projectId || ''}`)}
          className={`p-2.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer border-b border-gray-100 dark:border-gray-700/50`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium truncate text-gray-800 dark:text-gray-200`}>
                {task.title}
              </h4>
              <div className="flex flex-wrap items-center gap-x-3 mt-0.5">
                {task.project?.name && (
                  <div className={`text-xs flex items-center text-gray-500 dark:text-gray-400`}>
                    <FolderIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">{task.project.name}</span>
                  </div>
                )}
                
                {/* 마감일 정보 추가 */}
                {(() => {
                  const dueInfo = getDueDateInfo(task.dueDate === null ? undefined : task.dueDate);
                  return (
                    <div className={`text-xs flex items-center ${dueInfo.className}`}>
                      {dueInfo.icon}
                      <span>{dueInfo.text}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
            {getStatusTag(task.status as TaskStatus)}
          </div>
          {task.description && (
            <p className={`text-xs mt-1 line-clamp-1 text-gray-500 dark:text-gray-400`}>
              {task.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function RecentDocuments({ projectId /* theme prop 제거 */ }: { projectId?: string; /* theme prop 타입 제거 */ }) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]); // 타입 변경
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        const url = projectId ? `/api/documents?projectId=${projectId}&limit=15` : '/api/documents?limit=15'; 
        const response = await fetch(url);
        if (!response.ok) throw new Error('문서 로딩 실패');
        const data = await response.json();
        setDocuments(data);
        setError(null);
      } catch (err) {
        setError('문서 로딩 실패');
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [projectId]);

  const formatDate = (dateStr: string | Date | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return "방금 전";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
      return `${diffDay}일 전`;
  };

  if (loading) return <div className="flex justify-center items-center py-4 text-gray-500 dark:text-gray-400"> 로딩 중...</div>;
  if (error) return <div className="text-center py-4 text-red-500 dark:text-red-400">{error}</div>;
  if (documents.length === 0) return <div className="text-center py-4 text-gray-500 dark:text-gray-400">문서 없음</div>;

    return (
    <div className="flex overflow-x-auto space-x-2 pb-3 recent-documents-scrollbar">
      {documents.map((doc) => (
        <div
          key={doc.id}
          onClick={() => router.push(`/documents/${doc.id}${projectId ? `?projectId=${projectId}` : ''}`)}
          className={`flex-shrink-0 w-40 cursor-pointer transition-colors duration-200 border rounded-lg 
            bg-white border-gray-200 hover:bg-gray-50 
            dark:bg-[#2a2a2c] dark:border-gray-600 dark:hover:bg-gray-700 
            p-2.5 flex flex-col items-center`}
        >
          {/* Icon Area */}
          <div className={`h-20 flex items-center justify-center mb-1.5`}>
            <FileTextIcon className={`w-8 h-8 text-gray-400 dark:text-gray-500 transition-colors`} />
          </div>

          {/* Title Area */}
          <div className={`w-full mb-1`}>
            <h4 className={`text-xs font-medium truncate text-center text-gray-800 dark:text-gray-200`}>{doc.title || "무제 문서"}</h4>
          </div>

          {/* Info Area */}
          <div className={`text-center`}>
            <p className={`text-[10px] text-gray-600 dark:text-gray-500`}>최근 수정</p>
            <p className={`text-[10px] text-gray-500 dark:text-gray-400`}>{formatDate(doc.updatedAt || doc.createdAt)}</p>
          </div>
           {/* Starred Icon - Optionally keep or remove */}
           {doc.isStarred && (
            <div className="absolute top-2 right-2">
              <StarIcon className="w-3 h-3 text-yellow-500" />
            </div>
          )}
        </div>
      ))}
      </div>
    );
  }



function UpcomingEvents({ /* theme prop 제거 */ }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // const router = useRouter(); // router 변수 제거
  const { theme: currentTheme } = useTheme(); // Calendar 스타일 위해 currentTheme 사용

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/calendar?limit=10'); 
        if (!response.ok) throw new Error('일정을 불러오는데 실패했습니다');
        const data = await response.json();
        setEvents(data.sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
        setError(null);
      } catch (err) {
        setError('일정을 불러오는데 실패했습니다');
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const formatDateForEventGroup = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `오늘 ${date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `내일 ${date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}`;
    }
    return date.toLocaleDateString('ko-KR', { weekday: 'short', month: 'long', day: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: 'numeric', hour12: true });
  };

  const groupEventsByDate = (eventsToGroup: CalendarEvent[]) => {
    return eventsToGroup.reduce((acc, event) => {
      const dateKey = new Date(event.startDate).toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(event);
      return acc;
    }, {} as Record<string, CalendarEvent[]>);
  };

  if (loading) return <div className="flex justify-center items-center py-8 text-gray-500 dark:text-gray-400">로딩 중...</div>;
  if (error) return <div className="text-center py-8 text-red-500 dark:text-red-400">{error}</div>;
  if (events.length === 0) return <div className="text-center py-8 text-gray-500 dark:text-gray-400">예정된 일정이 없습니다</div>;

  const groupedEvents = groupEventsByDate(events);
  const calendarThemeClass = currentTheme === 'dark' ? 'dark-calendar' : 'light-calendar';

  return (
    <div className="flex h-full bg-white dark:bg-[#2a2a2c] p-1"> {/* 배경색 수정 */}
      <div className="w-1/3 pr-6 py-2 flex flex-col items-center border-r border-gray-200 dark:border-gray-700"> 
        <div className="w-full max-w-[260px] mx-auto calendar-container py-2">
          <Calendar
            value={new Date()} 
            view="month"
            locale="ko-KR"
            className={calendarThemeClass} // 수정된 theme 클래스 사용
            formatDay={(locale, date) => new Date(date).getDate().toString()} // 날짜만 표시
            tileClassName={({ date, view }) => { // 오늘 날짜 강조를 위한 클래스 추가 로직
              if (view === 'month' && date.toDateString() === new Date().toDateString()) {
                return currentTheme === 'dark' ? 'today-dark' : 'today-light'; // 수정된 theme 클래스 사용
              }
              return null;
            }}
          />
        </div>
      </div>

      <div className="w-2/3 pl-6 py-2 space-y-4 overflow-y-auto flex-1" style={{ maxHeight: '100%' }}>
        {Object.keys(groupedEvents).map((dateKey) => (
          <div key={dateKey}>
            <h4 className="text-sm font-semibold mb-2 text-gray-500 dark:text-gray-400">
              {formatDateForEventGroup(dateKey)}
            </h4>
    <div className="space-y-3">
              {groupedEvents[dateKey].map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-start p-2 rounded-md transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <div className="w-px bg-gray-300 dark:bg-gray-600 mr-3 self-stretch"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{event.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatTime(event.startDate)} - {event.project?.name || '개인 일정'}
            </p>
          </div>
        </div>
      ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CalendarStyles = () => (
  <style jsx global>{`
    .calendar-container .react-calendar {
      border: none;
      border-radius: 0.5rem; /* 8px */
      font-family: inherit;
      width: 100%;
      line-height: 1.2em; /* 기본 line-height 조정 */
    }
    html:not(.dark) .light-calendar.react-calendar {
      background-color: #ffffff; /* white */
    }
    html.dark .dark-calendar.react-calendar {
      background-color: var(--background); /* #1f1f21, globals.css의 --background 변수 사용 */
    }
    .calendar-container .react-calendar__navigation button {
      min-width: 30px;
      font-size: 0.875rem; /* 14px */
      padding: 0.5em 0.3em;
    }
    html:not(.dark) .light-calendar .react-calendar__navigation button {
      color: #374151; /* gray-700 */
    }
    html.dark .dark-calendar .react-calendar__navigation button {
      color: #d1d5db; /* gray-300 */
    }
    html:not(.dark) .light-calendar .react-calendar__navigation button:hover,
    html:not(.dark) .light-calendar .react-calendar__navigation button:focus {
      background-color: #f3f4f6; /* gray-100 */
    }
    html.dark .dark-calendar .react-calendar__navigation button:hover,
    html.dark .dark-calendar .react-calendar__navigation button:focus {
      background-color: #2a2a2c; /* 사용자 지정 카드 배경색과 유사하게 */
    }
    .calendar-container .react-calendar__month-view__weekdays {
      font-size: 0.7rem; /* 요일 폰트 크기 */
      font-weight: 500;
    }
    html:not(.dark) .light-calendar .react-calendar__month-view__weekdays__weekday abbr {
      text-decoration: none;
      color: #6b7280; /* gray-500 */
    }
    html.dark .dark-calendar .react-calendar__month-view__weekdays__weekday abbr {
      text-decoration: none;
      color: #9ca3af; /* gray-400 */
    }
    .calendar-container .react-calendar__tile {
      padding: 0.4em 0.3em; /* 날짜 타일 패딩 조정 */
      font-size: 0.8rem; /* 날짜 폰트 크기 */
      border-radius: 0.25rem; /* 4px */
      height: auto; /* 높이 자동 조정 */
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 30px; /* 최소 높이 */
    }
    html:not(.dark) .light-calendar .react-calendar__tile {
      color: #1f2937; /* gray-800 */
    }
    html.dark .dark-calendar .react-calendar__tile {
      color: #e5e7eb; /* gray-200 */
    }
    html:not(.dark) .light-calendar .react-calendar__tile:enabled:hover,
    html:not(.dark) .light-calendar .react-calendar__tile:enabled:focus {
      background-color: #e5e7eb; /* gray-200 */
    }
    html.dark .dark-calendar .react-calendar__tile:enabled:hover,
    html.dark .dark-calendar .react-calendar__tile:enabled:focus {
      background-color: #374151; /* gray-700, 네비게이션 버튼 기존 hover 색상 */
    }
    
    /* 오늘 날짜 스타일 */
    html:not(.dark) .light-calendar .react-calendar__tile.today-light {
      background: #eff6ff !important; /* blue-50 */
      color: #1d4ed8 !important; /* blue-700 */
      font-weight: bold;
    }
    html.dark .dark-calendar .react-calendar__tile.today-dark {
      background: #1e3a8a !important; /* darker blue-800/900 */
      color: #93c5fd !important; /* blue-300 */
      font-weight: bold;
    }

    /* 선택된 날짜 스타일 (오늘 날짜와 겹칠 때 우선순위) */
    html:not(.dark) .light-calendar .react-calendar__tile--active,
    html:not(.dark) .light-calendar .react-calendar__tile--active.today-light {
      background: #2563eb !important; /* blue-600 */
      color: white !important;
    }
    html.dark .dark-calendar .react-calendar__tile--active,
    html.dark .dark-calendar .react-calendar__tile--active.today-dark {
      background: #3b82f6 !important; /* blue-500 */
      color: white !important;
    }

    html:not(.dark) .light-calendar .react-calendar__tile--active:enabled:hover,
    html:not(.dark) .light-calendar .react-calendar__tile--active:enabled:focus,
    html:not(.dark) .light-calendar .react-calendar__tile--active.today-light:enabled:hover,
    html:not(.dark) .light-calendar .react-calendar__tile--active.today-light:enabled:focus {
      background: #1d4ed8 !important; /* blue-700 */
    }
    html.dark .dark-calendar .react-calendar__tile--active:enabled:hover,
    html.dark .dark-calendar .react-calendar__tile--active:enabled:focus,
    html.dark .dark-calendar .react-calendar__tile--active.today-dark:enabled:hover,
    html.dark .dark-calendar .react-calendar__tile--active.today-dark:enabled:focus {
      background: #2563eb !important; /* blue-600 */
    }

    .calendar-container .react-calendar__month-view__days__day--neighboringMonth {
      opacity: 0.4;
    }
    .calendar-container .react-calendar__year-view .react-calendar__tile,
    .calendar-container .react-calendar__decade-view .react-calendar__tile,
    .calendar-container .react-calendar__century-view .react-calendar__tile {
        padding: 1em 0.5em; /* 년/월 보기 패딩 조정 */
    }
  `}</style>
);

const ModernScrollbarStyles = () => (
  <style jsx global>{`
    /* Firefox */
    html.dark ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    html:not(.dark) ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    /* Webkit (Chrome, Safari, Edge) - Track */
    html.dark ::-webkit-scrollbar-track {
      background: #1f2937; /* gray-800 */
      border-radius: 4px;
    }
    html:not(.dark) ::-webkit-scrollbar-track {
      background: #f3f4f6; /* gray-100 */
      border-radius: 4px;
    }

    /* Webkit (Chrome, Safari, Edge) - Thumb */
    html.dark ::-webkit-scrollbar-thumb {
      background-color: #4b5563; /* gray-600 */
      border-radius: 4px;
      border: 2px solid #1f2937; /* gray-800, creates padding */
    }
    html:not(.dark) ::-webkit-scrollbar-thumb {
      background-color: #d1d5db; /* gray-300 */
      border-radius: 4px;
      border: 2px solid #f3f4f6; /* gray-100, creates padding */
    }

    /* Webkit (Chrome, Safari, Edge) - Thumb on hover */
    html.dark ::-webkit-scrollbar-thumb:hover {
      background-color: #6b7280; /* gray-500 */
    }
    html:not(.dark) ::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af; /* gray-400 */
    }

    /* Firefox - General */
    html.dark * {
      scrollbar-width: thin;
      scrollbar-color: #4b5563 #1f2937; /* thumb track */
    }
    html:not(.dark) * {
      scrollbar-width: thin;
      scrollbar-color: #d1d5db #f3f4f6; /* thumb track */
    }

    /* Custom scrollbar for recent documents (horizontal) */
    html.dark .recent-documents-scrollbar::-webkit-scrollbar {
      height: 8px;
    }
    html:not(.dark) .recent-documents-scrollbar::-webkit-scrollbar {
      height: 8px;
    }
    html.dark .recent-documents-scrollbar::-webkit-scrollbar-track {
      background: #1f2937; /* gray-800 */
      border-radius: 4px;
    }
    html:not(.dark) .recent-documents-scrollbar::-webkit-scrollbar-track {
      background: #f3f4f6; /* gray-100 */
      border-radius: 4px;
    }
    html.dark .recent-documents-scrollbar::-webkit-scrollbar-thumb {
      background-color: #4b5563; /* gray-600 */
      border-radius: 4px;
      border: 2px solid #1f2937; /* gray-800, creates padding */
    }
    html:not(.dark) .recent-documents-scrollbar::-webkit-scrollbar-thumb {
      background-color: #d1d5db; /* gray-300 */
      border-radius: 4px;
      border: 2px solid #f3f4f6; /* gray-100, creates padding */
    }
    html.dark .recent-documents-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #6b7280; /* gray-500 */
    }
    html:not(.dark) .recent-documents-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af; /* gray-400 */
    }
    html.dark .recent-documents-scrollbar {
      scrollbar-color: #4b5563 #1f2937; /* thumb track for Firefox */
    }
    html:not(.dark) .recent-documents-scrollbar {
      scrollbar-color: #d1d5db #f3f4f6; /* thumb track for Firefox */
    }
    
    /* 할당된 작업 스크롤바 스타일 */
    html.dark .assigned-tasks-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    html:not(.dark) .assigned-tasks-scrollbar::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    html.dark .assigned-tasks-scrollbar::-webkit-scrollbar-track {
      background: #1f2937; /* gray-800 */
      border-radius: 3px;
    }
    html:not(.dark) .assigned-tasks-scrollbar::-webkit-scrollbar-track {
      background: #f3f4f6; /* gray-100 */
      border-radius: 3px;
    }
    html.dark .assigned-tasks-scrollbar::-webkit-scrollbar-thumb {
      background-color: #4b5563; /* gray-600 */
      border-radius: 3px;
      border: 1px solid #1f2937; /* gray-800, creates padding */
    }
    html:not(.dark) .assigned-tasks-scrollbar::-webkit-scrollbar-thumb {
      background-color: #d1d5db; /* gray-300 */
      border-radius: 3px;
      border: 1px solid #f3f4f6; /* gray-100, creates padding */
    }
    html.dark .assigned-tasks-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #6b7280; /* gray-500 */
    }
    html:not(.dark) .assigned-tasks-scrollbar::-webkit-scrollbar-thumb:hover {
      background-color: #9ca3af; /* gray-400 */
    }
    html.dark .assigned-tasks-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #4b5563 #1f2937; /* thumb track for Firefox */
    }
    html:not(.dark) .assigned-tasks-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #d1d5db #f3f4f6; /* thumb track for Firefox */
    }
  `}</style>
);
