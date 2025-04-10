"use client";

import { useState, useEffect, useMemo, useContext } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, differenceInDays, getDay, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, HomeIcon, CalendarIcon, PlusIcon, X } from "lucide-react";
import { useProject } from "@/app/contexts/ProjectContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTasks } from "@/hooks/useTasks";
import { Task as KanbanTask, TaskStatus } from "@/components/kanban/KanbanBoard";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  startDate?: Date;
  endDate?: Date;
  dueDate?: Date | null;
  isAllDay?: boolean;
  createdAt: Date;
  projectId?: string;
}

interface CalendarTask extends Task {
  startPosition: number; // 시작 날짜의 위치 (인덱스)
  duration: number;     // 기간 (일수)
  row: number;          // 행 위치 (겹치는 태스크 처리용)
}

// 마우스 우클릭 이벤트
interface ContextMenu {
  show : boolean;
  x : number;
  y : number;
  date : Date | null;
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('projectId');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);
  const { currentProject, projects } = useProject();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { tasks: projectTasks, updateTask, fetchTasks } = useTasks(projectId || currentProject?.id);
  const [sidebarTasks, setSidebarTasks] = useState<Task[]>([]);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dropTarget, setDropTarget] = useState<Date | null>(null);

  // 사이드바에 표시할 태스크 (dueDate가 없는 태스크들)
  useEffect(() => {
    // KanbanTask 타입을 Task 타입으로 변환
    const convertedTasks = projectTasks.map((task: any): Task => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || null,
      startDate: undefined,
      endDate: undefined,
      isAllDay: false,
      createdAt: new Date(task.createdAt || Date.now()),
      projectId: task.projectId
    }));
    
    setSidebarTasks(convertedTasks.filter(task => !task.dueDate));
  }, [projectTasks]);

  // 캘린더에 표시할 태스크 가져오기
  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentProject?.id && !projectId) return;
      
      try {
        const response = await fetch(`/api/projects/${currentProject?.id || projectId}/tasks`);
        if (!response.ok) throw new Error('태스크를 가져오는데 실패했습니다.');
        const data = await response.json();
        
        // API 응답 데이터를 Task 인터페이스에 맞게 변환
        const convertedTasks = data.map((task: any): Task => ({
          id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          startDate: task.startDate ? new Date(task.startDate) : undefined,
          endDate: task.endDate ? new Date(task.endDate) : undefined,
          isAllDay: task.isAllDay,
          createdAt: new Date(task.createdAt),
          projectId: task.projectId
        }));
        
        // dueDate가 있는 태스크만 필터링
        setTasks(convertedTasks.filter((task: Task) => task.dueDate));
      } catch (error) {
        console.error('태스크 로딩 오류:', error);
      }
    };

    fetchTasks();
  }, [currentProject?.id, projectId, projectTasks]);

  // 드래그 시작 핸들러
  const handleDragStart = (task: Task) => (e: React.DragEvent) => {
    setDraggedTask(task);
    e.dataTransfer.setData('text/plain', task.id);
    // 드래그 이미지 설정 (투명하게)
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
  };

  // 드래그 종료 핸들러
  const handleDragEnd = () => {
    setDraggedTask(null);
    setDropTarget(null);
  };

  // 드롭 타겟에 드래그 오버 핸들러
  const handleDragOver = (date: Date) => (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(date);
  };

  // 드롭 영역에서 드래그 벗어날 때 핸들러
  const handleDragLeave = () => {
    setDropTarget(null);
  };

  // 태스크 드롭 핸들러 (날짜에 태스크 할당)
  const handleDrop = (date: Date) => async (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    
    if (!draggedTask) return;
    
    try {
      const updatedDueDate = new Date(date);
      updatedDueDate.setHours(23, 59, 999, 999); // 하루의 끝으로 설정

      // 태스크 업데이트 (dueDate 설정)
      const updatedTask: KanbanTask = {
        id: draggedTask.id,
        title: draggedTask.title,
        description: draggedTask.description,
        status: draggedTask.status as TaskStatus,
        priority: draggedTask.priority as "low" | "medium" | "high",
        dueDate: updatedDueDate,
        projectId: draggedTask.projectId
      };
      
      await updateTask(updatedTask);
      
      // 사이드바 태스크에서 제거
      setSidebarTasks(prev => prev.filter(t => t.id !== draggedTask.id));
      
      // 캘린더 데이터 다시 가져오기
      fetchTasks();
    } catch (error) {
      console.error('태스크 업데이트 오류:', error);
    }
  };

  // 사이드바로 태스크 드롭 (dueDate 초기화)
  const handleDropToSidebar = async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedTask || !draggedTask.dueDate) return;
    
    try {
      // 태스크 업데이트 (dueDate 초기화)
      const updatedTask: KanbanTask = {
        id: draggedTask.id,
        title: draggedTask.title,
        description: draggedTask.description,
        status: draggedTask.status as TaskStatus,
        priority: draggedTask.priority as "low" | "medium" | "high",
        dueDate: undefined,
        projectId: draggedTask.projectId
      };
      
      await updateTask(updatedTask);
      
      // 사이드바 태스크에 추가
      setSidebarTasks(prev => [...prev, {...draggedTask, dueDate: null}]);
      
      // 캘린더 데이터 다시 가져오기
      fetchTasks();
    } catch (error) {
      console.error('태스크 업데이트 오류:', error);
    }
  };

  // 달력 날짜와 태스크 계산을 메모이제이션
  const { calendarDays, processedCalendarTasks } = useMemo(() => {
    // 현재 월의 시작일과 마지막일을 구함
    const monthStart = startOfMonth(currentDate);
    const firstDayOfMonth = getDay(monthStart); // 0: 일요일, 1: 월요일, ...
    
    // 이전 달의 마지막 날짜들을 포함 (달력 첫 줄 채우기 위함)
    const prevMonthDays = firstDayOfMonth > 0 
      ? eachDayOfInterval({ 
          start: addDays(monthStart, -firstDayOfMonth), 
          end: addDays(monthStart, -1) 
        }) 
      : [];
    
    const monthEnd = endOfMonth(currentDate);
    const currentMonthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // 다음 달의 시작 날짜들을 포함 (달력 마지막 줄 채우기 위함)
    const lastDayOfMonth = getDay(monthEnd); // 0: 일요일, 1: 월요일, ...
    const nextMonthDays = lastDayOfMonth < 6 
      ? eachDayOfInterval({ 
          start: addDays(monthEnd, 1), 
          end: addDays(monthEnd, 6 - lastDayOfMonth) 
        }) 
      : [];
    
    // 달력에 표시할 모든 날짜 (이전 달 + 현재 달 + 다음 달)
    const allCalendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
    
    // 태스크 처리 로직 (tasks가 비어있으면 빈 배열 반환)
    if (tasks.length === 0) {
      return { calendarDays: allCalendarDays, processedCalendarTasks: [] };
    }
    
    // 태스크를 겹침 없이 행별로 배치하기 위한 함수
    const assignRowsToTasks = (tasks: CalendarTask[]): CalendarTask[] => {
      // 태스크를 시작일 기준으로 정렬
      const sortedTasks = [...tasks].sort((a, b) => a.startPosition - b.startPosition);
      
      // 각 태스크의 행을 할당
      const assignedTasks: CalendarTask[] = [];
      const usedRows: {[key: number]: number[]} = {}; // 각 위치에서 사용 중인 행 추적
      
      for (const task of sortedTasks) {
        let row = 0;
        let foundRow = false;
        
        // 태스크가 위치할 수 있는 첫 번째 빈 행 찾기
        while (!foundRow) {
          foundRow = true;
          
          // 태스크 기간 동안 이 행이 사용 가능한지 확인
          for (let pos = task.startPosition; pos < task.startPosition + task.duration; pos++) {
            if (usedRows[pos] && usedRows[pos].includes(row)) {
              foundRow = false;
              row++;
              break;
            }
          }
        }
        
        // 태스크에 행 할당
        const taskWithRow = { ...task, row };
        assignedTasks.push(taskWithRow);
        
        // 사용된 행 표시
        for (let pos = task.startPosition; pos < task.startPosition + task.duration; pos++) {
          if (!usedRows[pos]) usedRows[pos] = [];
          usedRows[pos].push(row);
        }
      }
      
      return assignedTasks;
    };

    const preparedTasks: CalendarTask[] = [];
    
    tasks.forEach(task => {
      if (!task.dueDate) return; // null 또는 undefined dueDate 건너뛰기
      
      const taskCreatedAt = new Date(task.createdAt);
      const taskDue = task.dueDate ? new Date(task.dueDate) : taskCreatedAt;
      
      // 모든 날짜 범위에 표시되는 태스크만 필터링
      if (taskCreatedAt <= addDays(monthEnd, 6 - lastDayOfMonth) && 
          taskDue >= addDays(monthStart, -firstDayOfMonth)) {
        
        // 표시 시작 날짜
        const displayStart = taskCreatedAt < addDays(monthStart, -firstDayOfMonth)
          ? addDays(monthStart, -firstDayOfMonth)
          : taskCreatedAt;
        
        // 표시 종료 날짜
        const displayEnd = taskDue > addDays(monthEnd, 6 - lastDayOfMonth)
          ? addDays(monthEnd, 6 - lastDayOfMonth)
          : taskDue;
        
        // 시작 위치 계산 (전체 달력 날짜 배열에서의 인덱스)
        const startPosition = differenceInDays(displayStart, addDays(monthStart, -firstDayOfMonth));
        
        // 표시 기간 계산
        const duration = differenceInDays(displayEnd, displayStart) + 1;
        
        preparedTasks.push({
          ...task,
          startPosition,
          duration,
          row: 0 // 임시 행 값, 나중에 할당됨
        });
      }
    });
    
    // 태스크에 행 할당
    const tasksWithRows = assignRowsToTasks(preparedTasks);
    return { calendarDays: allCalendarDays, processedCalendarTasks: tasksWithRows };
  }, [currentDate, tasks]);
  
  // 계산된 태스크를 상태로 업데이트
  useEffect(() => {
    setCalendarTasks(processedCalendarTasks);
  }, [processedCalendarTasks]);

  // 이전 달로 이동
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  // 다음 달로 이동
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  // 요일 헤더
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  
  // 현재 프로젝트 이름 가져오기
  const currentProjectName = projectId 
    ? projects?.find(p => p.id === projectId)?.name || "프로젝트" 
    : "모든 프로젝트";

  return (
    <div className="bg-white min-h-screen flex">
      {/* 상단 네비게이션 바 */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 py-4 px-6 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
              <HomeIcon className="w-5 h-5" />
            </Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900 font-medium">캘린더</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(projectId ? `/?projectId=${projectId}` : '/')}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              대시보드로 돌아가기
            </Button>
            
            <Button 
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              예약되지 않은 업무
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 max-w-6xl mx-auto py-8 px-4 mt-16">
        {/* 캘린더 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <CalendarIcon className="w-6 h-6 text-blue-600 mr-2" />
            <h1 className="text-2xl font-bold">캘린더</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="hover:bg-gray-100">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-xl font-medium">
              {format(currentDate, 'yyyy년 MM월', { locale: ko })}
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="hover:bg-gray-100">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-white rounded-t-lg">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={`text-center py-3 text-sm font-medium
                ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'}`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        <div className="relative bg-white rounded-b-lg border border-gray-200 border-t-0 shadow-sm">
          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDate && isSameDay(selectedDate, day);
              const isWeekend = index % 7 === 0 || index % 7 === 6;
              const isDropTargetDay = dropTarget && isSameDay(dropTarget, day);

              return (
                <div
                  key={day.toString()}
                  className={`
                    min-h-[110px] p-2 border-r border-t border-gray-200 relative
                    ${!isCurrentMonth ? 'bg-gray-50' : ''}
                    ${isSelected ? 'bg-blue-50' : ''}
                    ${isDropTargetDay ? 'bg-blue-100 ring-2 ring-blue-500' : ''}
                    transition-colors duration-150 cursor-pointer
                  `}
                  onClick={() => setSelectedDate(day)}
                  onDragOver={handleDragOver(day)}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop(day)}
                >
                  <div className={`
                    h-5 w-5 flex items-center justify-center rounded-full text-xs
                    ${isCurrentDay ? 'bg-blue-500 text-white' : ''}
                    ${!isCurrentMonth ? 'text-gray-400' : ''}
                    ${isWeekend && isCurrentMonth && !isCurrentDay ? (index % 7 === 0 ? 'text-red-500' : 'text-blue-500') : ''}
                  `}>
                    {format(day, 'd')}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 태스크 오버레이 */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {calendarTasks.map((task) => {
              // 태스크 색상 결정
              const bgColor = task.status === 'todo' 
                ? 'bg-gray-100' 
                : task.status === 'in-progress' 
                  ? 'bg-blue-100' 
                  : 'bg-green-100';
              
              const borderColor = task.status === 'todo' 
                ? 'border-gray-300' 
                : task.status === 'in-progress' 
                  ? 'border-blue-300' 
                  : 'border-green-300';
              
              const textColor = task.status === 'todo' 
                ? 'text-gray-700' 
                : task.status === 'in-progress' 
                  ? 'text-blue-700' 
                  : 'text-green-700';
              
              // 각 주에 맞게 태스크 세그먼트 분할
              const taskSegments = [];
              let remainingDuration = task.duration;
              let currentPosition = task.startPosition;
              
              while (remainingDuration > 0) {
                // 현재 위치의 열(요일) 인덱스 계산 (0-6)
                const currentCol = currentPosition % 7;
                // 현재 위치의 행(주) 인덱스 계산
                const currentRow = Math.floor(currentPosition / 7);
                
                // 이번 주에 표시할 수 있는 최대 일수 (남은 일수와 주 끝까지 남은 일수 중 작은 값)
                const daysInCurrentWeek = Math.min(remainingDuration, 7 - currentCol);
                
                // 태스크 세그먼트의 위치 및 크기 계산
                const cellWidth = 100 / 7; // 셀 너비 (%)
                const left = currentCol * cellWidth;
                const width = daysInCurrentWeek * cellWidth;
                
                // 세그먼트의 상단 위치 (행 위치에 따라)
                const rowHeight = 22; // 각 태스크 행의 높이
                const top = currentRow * 110 + 35 + task.row * rowHeight;
                
                // 세그먼트 추가
                taskSegments.push(
                  <div 
                    key={`${task.id}-segment-${taskSegments.length}`}
                    className={`absolute ${bgColor} ${textColor} rounded-md border ${borderColor} px-2 py-0.5 
                      text-xs font-medium overflow-hidden shadow-sm pointer-events-auto cursor-pointer 
                      hover:shadow-md transition-all duration-150`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      top: `${top}px`,
                      height: `${rowHeight - 2}px`,
                      zIndex: 10
                    }}
                    title={`${task.title} (${format(new Date(task.createdAt), 'yyyy-MM-dd')} ~ ${task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''})`}
                    draggable
                    onDragStart={handleDragStart(task)}
                    onDragEnd={handleDragEnd}
                  >
                    <span className="truncate">{task.title}</span>
                  </div>
                );
                
                // 남은 기간과 현재 위치 업데이트
                remainingDuration -= daysInCurrentWeek;
                currentPosition += daysInCurrentWeek;
              }
              
              return taskSegments;
            })}
          </div>
        </div>
      </div>

      {/* 사이드바 (dueDate가 없는 태스크 목록) */}
      <div 
        className={`fixed top-0 bottom-0 right-0 w-80 bg-white shadow-lg border-l border-gray-200 p-4 transition-transform duration-300 z-20 mt-16 
          ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('bg-gray-50');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('bg-gray-50');
        }}
        onDrop={(e) => {
          e.currentTarget.classList.remove('bg-gray-50');
          handleDropToSidebar(e);
        }}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">예약되지 않은 업무</h3>
          <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          {sidebarTasks.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              예약되지 않은 업무가 없습니다
            </div>
          ) : (
            sidebarTasks.map(task => {
              // 우선순위에 따른 색상 설정
              const borderColor = task.priority === 'high' 
                ? 'border-red-300' 
                : task.priority === 'medium' 
                  ? 'border-yellow-300' 
                  : 'border-green-300';
              
              const bgColor = task.priority === 'high' 
                ? 'bg-red-50' 
                : task.priority === 'medium' 
                  ? 'bg-yellow-50' 
                  : 'bg-green-50';

              const statusBg = task.status === 'todo' 
                ? 'bg-gray-100' 
                : task.status === 'in-progress' 
                  ? 'bg-blue-100' 
                  : task.status === 'done' 
                    ? 'bg-green-100' 
                    : 'bg-yellow-100';

              return (
                <div
                  key={task.id}
                  className={`${bgColor} border ${borderColor} rounded-md p-3 shadow-sm cursor-pointer`}
                  draggable
                  onDragStart={handleDragStart(task)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusBg}`}>
                      {task.status === 'todo' ? '할 일' : 
                       task.status === 'in-progress' ? '진행 중' : 
                       task.status === 'done' ? '완료' : '검토'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {task.priority === 'high' ? '높은 우선순위' : 
                     task.priority === 'medium' ? '중간 우선순위' : '낮은 우선순위'}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}