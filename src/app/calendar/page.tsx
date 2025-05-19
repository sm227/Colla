"use client";

import { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, differenceInDays, getDay, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, HomeIcon, CalendarIcon, PlusIcon, X } from "lucide-react";
import { useProject } from "@/app/contexts/ProjectContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTasks } from "@/hooks/useTasks";
import { Task as KanbanTask, TaskStatus } from "@/components/kanban/KanbanBoard";

export interface Task {
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
  isCalendarEvent?: boolean; // 캘린더 일정과 칸반 태스크를 구분하는 필드
  kanbanTaskId?: string; // 연결된 칸반 태스크 ID
  userId?: string; // 일정 생성자 ID
  user?: { // 일정 생성자 정보
    id: string;
    name: string;
    email: string;
  };
  project?: { // 프로젝트 정보
    id: string;
    name: string;
  };
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

// 일정 추가 다이얼로그 인터페이스
interface AddEventDialog {
  show: boolean;
  date: Date | null;
}

// 일정 수정 다이얼로그 인터페이스
interface EditEventDialog {
  show: boolean;
  event: Task | null;
}

const CalendarPage: React.FC = () => {
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
  const [isLoading, setIsLoading] = useState(false);
  
  // 일정 추가 다이얼로그 상태
  const [addEventDialog, setAddEventDialog] = useState<AddEventDialog>({
    show: false,
    date: null
  });
  
  // 새 일정 상태
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    projectId: ''  // 프로젝트 ID 필드 추가
  });
  
  // 일정 수정 다이얼로그 상태
  const [editEventDialog, setEditEventDialog] = useState<EditEventDialog>({
    show: false,
    event: null
  });
  
  // 편집 중인 이벤트 상태
  const [editingEvent, setEditingEvent] = useState({
    id: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    projectId: ''
  });
  
  // 테마 상태 추가
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // 테마 설정 로직 추가
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    setTheme(savedTheme || 'light');
  }, []);
  
  // 로컬 스토리지 대신 API에서 캘린더 이벤트 직접 불러오기
  const fetchCalendarEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      // 캘린더 이벤트 가져오기
      const calendarResponse = await fetch('/api/calendar');
      if (!calendarResponse.ok) {
        throw new Error('캘린더 이벤트를 가져오는데 실패했습니다');
      }
      const calendarData = await calendarResponse.json();
      
      // 마감일이 있는 태스크 가져오기
      const tasksResponse = await fetch('/api/tasks?hasDueDate=true');
      if (!tasksResponse.ok) {
        throw new Error('태스크를 가져오는데 실패했습니다');
      }
      const tasksData = await tasksResponse.json();
      
      // 캘린더 이벤트 포맷팅
      const calendarEvents = calendarData.map((event: any) => ({
        ...event,
        id: event.id.toString(),
        startDate: event.startDate ? new Date(event.startDate) : undefined,
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        dueDate: event.endDate ? new Date(event.endDate) : null,
        createdAt: new Date(event.createdAt),
        isCalendarEvent: true
      }));
      
      // 마감일이 있는 칸반 태스크 포맷팅
      const taskEvents = tasksData
        .map((task: any) => ({
          ...task,
          id: task.id.toString(),
          startDate: task.startDate ? new Date(task.startDate) : new Date(task.createdAt),
          endDate: task.endDate ? new Date(task.endDate) : undefined,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          createdAt: new Date(task.createdAt),
          isCalendarEvent: false
        }));
      
      // 모든 이벤트 합치기
      setTasks([...calendarEvents, ...taskEvents]);
    } catch (error) {
      console.error('캘린더 이벤트 가져오기 오류:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    fetchCalendarEvents();
    fetchKanbanTasks();
  }, [fetchCalendarEvents]);

  // 칸반 태스크를 가져오는 함수
  const fetchKanbanTasks = async () => {
    try {
      const response = await fetch('/api/tasks?noCalendarEvents=true');
      if (!response.ok) {
        throw new Error('칸반 태스크를 가져오는데 실패했습니다');
      }
      const data = await response.json();
      
      // 캘린더에 표시되지 않은 칸반 태스크만 사이드바에 표시
      // 마감일이 없는 태스크만 사이드바에 표시
      const kanbanTasks = data
        .filter((task: any) => !task.dueDate) // 마감일이 없는 태스크만 필터링
        .map((task: any) => ({
          ...task,
          id: task.id.toString(),
          startDate: task.startDate ? new Date(task.startDate) : undefined,
          endDate: task.endDate ? new Date(task.endDate) : undefined,
          dueDate: null, // 마감일은 null로 설정
          createdAt: new Date(task.createdAt),
          isCalendarEvent: false // 칸반 태스크는 기본적으로 캘린더 이벤트가 아님
        }));
      
      setSidebarTasks(kanbanTasks);
    } catch (error) {
      console.error('칸반 태스크 가져오기 오류:', error);
      setSidebarTasks([]);
    }
  };

  // 일정 추가 함수
  const addCalendarEvent = async (event: any) => {
    if (!event.title.trim()) {
      alert("제목이 필요합니다. 이벤트에 제목을 추가해주세요.");
      return;
    }

    try {
      const startDateTime = new Date(event.startDate);
      
      // 종료 날짜가 없으면 시작 날짜와 동일하게 설정
      let endDateTime;
      if (!event.endDate || event.endDate.trim() === '') {
        endDateTime = new Date(event.startDate);
      } else {
        endDateTime = new Date(event.endDate);
      }

      // 캘린더 API로 이벤트 추가
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: event.title,
          description: event.description,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          projectId: event.projectId || null  // 프로젝트 ID 포함
        }),
      });

      if (!response.ok) {
        throw new Error('캘린더 이벤트 추가 실패');
      }

      const newEvent = await response.json();
      
      // 상태 업데이트
      setTasks((prev) => [...prev, {
        ...newEvent,
        id: newEvent.id.toString(),
        startDate: new Date(newEvent.startDate),
        endDate: new Date(newEvent.endDate),
        dueDate: new Date(newEvent.endDate),
        createdAt: new Date(newEvent.createdAt),
        isCalendarEvent: true
      }]);

      alert("이벤트가 추가되었습니다.");

      // 폼 초기화 및 닫기
      setAddEventDialog({ show: false, date: null });
      setNewEvent({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        projectId: ''  // 프로젝트 ID 초기화
      });
    } catch (error) {
      console.error("캘린더 이벤트 추가 오류:", error);
      alert("이벤트를 추가하는 도중 오류가 발생했습니다.");
    }
  };
  
  // 드래그 시작 핸들러
  const handleDragStart = (task: Task) => (e: React.DragEvent) => {
    // 즉시 드래그 상태 설정
    setDraggedTask(task);
    
    // 데이터 전송 설정
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // 드래그 이미지 설정 (투명하게)
    const img = new Image();
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    e.dataTransfer.setDragImage(img, 0, 0);
    
    // 드래그 대상 요소에 스타일 추가
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.4';
      e.currentTarget.style.border = '2px dashed #4f46e5';
    }
  };

  // 드래그 종료 핸들러
  const handleDragEnd = (e: React.DragEvent) => {
    // 드래그 상태 초기화
    setDraggedTask(null);
    setDropTarget(null);
    
    // 드래그 대상 요소의 스타일 복원
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
      e.currentTarget.style.border = ''; // 원래 border 스타일로 복원
    }
  };

  // 드롭 타겟에 드래그 오버 핸들러
  const handleDragOver = (date: Date) => (e: React.DragEvent) => {
    e.preventDefault();
    
    // 드롭 허용 효과 설정
    e.dataTransfer.dropEffect = 'move';
    
    // 현재 드롭 타겟 설정
    setDropTarget(date);
    
    // 드롭 대상 요소에 시각적 효과 추가
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = '#dbeafe'; // 더 눈에 띄는 파란색 배경
      e.currentTarget.style.boxShadow = '0 0 0 2px #3b82f6'; // 파란색 테두리 효과
    }
  };

  // 드롭 영역에서 드래그 벗어날 때 핸들러
  const handleDragLeave = (e: React.DragEvent) => {
    // 드롭 타겟 초기화
    setDropTarget(null);
    
    // 드롭 대상 요소의 스타일 복원
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = '';
      e.currentTarget.style.boxShadow = '';
    }
  };

  // 태스크 드롭 핸들러 (날짜에 태스크 할당)
  const handleDrop = (date: Date) => async (e: React.DragEvent) => {
    e.preventDefault();
    setDropTarget(null);
    
    // 드롭 대상 요소의 스타일 초기화
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.backgroundColor = '';
      e.currentTarget.style.boxShadow = '';
    }
    
    if (!draggedTask) return;
    
    try {
      // 날짜 설정 - 날짜 경계값 설정
      const droppedDate = new Date(date);
      droppedDate.setHours(0, 0, 0, 0); // 하루의 시작으로 설정
      
      let startDate: Date;
      let endDate: Date;
      
      if (draggedTask.isCalendarEvent) {
        // 캘린더 일정인 경우:
        // 원래의 시작일과 종료일 가져오기
        const originalStartDate = draggedTask.startDate ? new Date(draggedTask.startDate) : new Date(draggedTask.createdAt);
        const originalEndDate = draggedTask.dueDate ? new Date(draggedTask.dueDate) : originalStartDate;
        
        // 드래그한 날짜가 시작일보다 이전인지 확인
        if (droppedDate < originalStartDate) {
          // 시작일만 변경 (시작일만 앞으로 당김)
          startDate = new Date(droppedDate);
          endDate = new Date(originalEndDate);
        } 
        // 드래그한 날짜가 종료일보다 이후인지 확인
        else if (droppedDate > originalEndDate) {
          // 종료일만 변경 (종료일만 뒤로 밀기)
          startDate = new Date(originalStartDate);
          endDate = new Date(droppedDate);
          endDate.setHours(23, 59, 59, 999); // 하루의 끝으로 설정
        } 
        // 드래그한 날짜가 기간 안에 있는 경우 (가까운 쪽 변경)
        else {
          // 시작일과 드래그 날짜의 차이
          const diffToStart = Math.abs(droppedDate.getTime() - originalStartDate.getTime());
          // 종료일과 드래그 날짜의 차이
          const diffToEnd = Math.abs(originalEndDate.getTime() - droppedDate.getTime());
          
          if (diffToStart < diffToEnd) {
            // 시작일 변경 (시작일이 더 가까움)
            startDate = new Date(droppedDate);
            endDate = new Date(originalEndDate);
          } else {
            // 종료일 변경 (종료일이 더 가까움)
            startDate = new Date(originalStartDate);
            endDate = new Date(droppedDate);
            endDate.setHours(23, 59, 59, 999); // 하루의 끝으로 설정
          }
        }
      } else {
        // 일반 태스크인 경우: 마감일만 변경
        startDate = droppedDate;
        endDate = new Date(droppedDate);
        endDate.setHours(23, 59, 59, 999); // 하루의 끝으로 설정
      }

      // 즉시 UI에 반영하기 위해 드래그한 태스크 복사
      const updatedLocalTask: Task = {
        ...draggedTask,
        // 캘린더 일정은 시작일과 종료일 모두 설정, 태스크는 마감일만 설정
        startDate: draggedTask.isCalendarEvent ? startDate : endDate,
        endDate: endDate,
        dueDate: endDate,
        isCalendarEvent: draggedTask.isCalendarEvent
      };

      // 로컬 태스크 상태 업데이트
      setTasks(prevTasks => {
        // 이미 캘린더에 해당 태스크가 있는지 확인
        const taskExists = prevTasks.some(t => t.id === draggedTask.id);
        
        if (taskExists) {
          // 이미 존재하면 업데이트
          return prevTasks.map(t => 
            t.id === draggedTask.id ? updatedLocalTask : t
          );
        } else {
          // 존재하지 않으면 추가
          return [...prevTasks, updatedLocalTask];
        }
      });

      if (draggedTask.isCalendarEvent) {
        // 캘린더 이벤트 업데이트
        await fetch(`/api/calendar/${draggedTask.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }),
        });
      } else {
        // 칸반 태스크 업데이트
        await updateTask({
          id: draggedTask.id,
          title: draggedTask.title,
          description: draggedTask.description,
          status: draggedTask.status as TaskStatus,
          priority: draggedTask.priority as "low" | "medium" | "high",
          startDate: endDate,
          dueDate: endDate,
          projectId: draggedTask.projectId
        });
      }
      
      // 사이드바 태스크에서 제거 (중복 방지)
      setSidebarTasks(prev => prev.filter(t => t.id !== draggedTask.id));
    } catch (error) {
      console.error('이벤트 업데이트 오류:', error);
      // 에러 발생 시 사용자에게 알림
      alert('일정 업데이트 중 오류가 발생했습니다. 새로고침 후 다시 시도해 주세요.');
    }
  };

  // 사이드바로 태스크 드롭 (dueDate 초기화)
  const handleDropToSidebar = async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedTask) return;
    
    // 캘린더 일정(isCalendarEvent=true)은 사이드바에 드롭할 수 없음
    if (draggedTask.isCalendarEvent) {
      alert("캘린더 일정은 예약되지 않은 업무 목록으로 이동할 수 없습니다.");
      return;
    }
    
    try {
      // 즉시 UI에 반영하기 위해 드래그한 태스크 복사
      const updatedLocalTask: Task = {
        ...draggedTask,
        startDate: undefined,  // 시작일 제거
        dueDate: null,  // 마감일 제거
        isCalendarEvent: false // 캘린더 이벤트가 아님으로 표시
      };
      
      // 로컬 태스크 상태 즉시 업데이트
      setTasks(prevTasks => {
        // 기존 태스크 필터링 (드래그된 태스크 제외)
        return prevTasks.filter(t => t.id !== draggedTask.id); // 사이드바로 드롭하면 캘린더에서 제거
      });
      
      // 태스크 업데이트 (dueDate와 startDate 초기화) - 서버 요청
      const updatedTask: KanbanTask = {
        id: draggedTask.id,
        title: draggedTask.title,
        description: draggedTask.description,
        status: draggedTask.status as TaskStatus,
        priority: draggedTask.priority as "low" | "medium" | "high",
        startDate: undefined,
        dueDate: undefined,
        projectId: draggedTask.projectId
      };
      
      // 사이드바 태스크에 즉시 추가 (중복 체크 후)
      setSidebarTasks(prev => {
        // 이미 해당 ID의 태스크가 사이드바에 있는지 확인
        const taskExists = prev.some(t => t.id === updatedLocalTask.id);
        // 존재하지 않는 경우에만 추가
        return taskExists ? prev : [...prev, updatedLocalTask];
      });
      
      // 백그라운드에서 서버 업데이트 실행
      await updateTask(updatedTask);
    } catch (error) {
      console.error('이벤트 처리 오류:', error);
      alert('일정 처리 중 오류가 발생했습니다. 새로고침 후 다시 시도해 주세요.');
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
      
      // 태스크의 시작 날짜와 마감일 설정
      // isCalendarEvent가 true인 경우는 시작일부터 마감일까지 전체 기간 표시
      // 일반 칸반 태스크는 마감일(dueDate)에만 표시
      const taskStartDate = task.isCalendarEvent === true ?
                           (task.startDate ? new Date(task.startDate) : new Date(task.createdAt)) : 
                           new Date(task.dueDate);
      
      const taskDue = new Date(task.dueDate);
      
      // 마감일이 하루의 끝시간으로 설정되어 있지 않으면 조정
      if (taskDue.getHours() !== 23 || taskDue.getMinutes() !== 59) {
        taskDue.setHours(23, 59, 59, 999);
      }
      
      // 시작일과 마감일이 달력 범위에 포함되는 태스크만 필터링
      const calendarStart = addDays(monthStart, -firstDayOfMonth);
      const calendarEnd = addDays(monthEnd, 6 - lastDayOfMonth);
      
      // 시작일이 달력 끝보다 이전이고, 마감일이 달력 시작보다 이후인 태스크만 표시
      if (taskStartDate <= calendarEnd && taskDue >= calendarStart) {
        // 표시 시작 날짜 (달력 범위 내로 제한)
        const displayStart = taskStartDate < calendarStart ? calendarStart : taskStartDate;
        
        // 표시 종료 날짜 (달력 범위 내로 제한)
        const displayEnd = taskDue > calendarEnd ? calendarEnd : taskDue;
        
        // 시작 위치 계산 (전체 달력 날짜 배열에서의 인덱스)
        const startPosition = differenceInDays(displayStart, calendarStart);
        
        // 표시 기간 계산
        // 캘린더 일정은 시작일부터 마감일까지 전체 기간을 표시
        // 일반 태스크는 마감일에만 표시 (기간은 1일)
        const duration = task.isCalendarEvent === true ? 
                        differenceInDays(displayEnd, displayStart) + 1 : 
                        1;
        
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

  // 일정 수정 함수
  const updateCalendarEvent = async (event: any) => {
    if (!event.title.trim()) {
      alert("제목이 필요합니다. 이벤트에 제목을 추가해주세요.");
      return;
    }

    try {
      const startDateTime = new Date(event.startDate);
      
      // 종료 날짜가 없으면 시작 날짜와 동일하게 설정
      let endDateTime;
      if (!event.endDate || event.endDate.trim() === '') {
        endDateTime = new Date(event.startDate);
      } else {
        endDateTime = new Date(event.endDate);
      }

      // 캘린더 API로 이벤트 업데이트
      const response = await fetch(`/api/calendar/${event.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: event.title,
          description: event.description,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          projectId: event.projectId || null
        }),
      });

      if (!response.ok) {
        throw new Error('캘린더 이벤트 수정 실패');
      }

      const updatedEvent = await response.json();
      
      // 상태 업데이트
      setTasks(prev => prev.map(task => {
        if (task.id === event.id) {
          return {
            ...updatedEvent,
            id: updatedEvent.id.toString(),
            startDate: new Date(updatedEvent.startDate),
            endDate: new Date(updatedEvent.endDate),
            dueDate: new Date(updatedEvent.endDate),
            createdAt: new Date(updatedEvent.createdAt),
            isCalendarEvent: true
          };
        }
        return task;
      }));

      alert("이벤트가 수정되었습니다.");

      // 다이얼로그 닫기
      setEditEventDialog({ show: false, event: null });
    } catch (error) {
      console.error("캘린더 이벤트 수정 오류:", error);
      alert("이벤트를 수정하는 도중 오류가 발생했습니다.");
    }
  };

  // 일정 삭제 함수
  const deleteCalendarEvent = async (eventId: string) => {
    if (!confirm("정말로 이 일정을 삭제하시겠습니까?")) {
      return;
    }

    try {
      // 캘린더 API로 이벤트 삭제
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('캘린더 이벤트 삭제 실패');
      }

      // 상태 업데이트 (삭제된 일정 제거)
      setTasks(prev => prev.filter(task => task.id !== eventId));

      alert("이벤트가 삭제되었습니다.");

      // 다이얼로그 닫기
      setEditEventDialog({ show: false, event: null });
    } catch (error) {
      console.error("캘린더 이벤트 삭제 오류:", error);
      alert("이벤트를 삭제하는 도중 오류가 발생했습니다.");
    }
  };

  // 일정 클릭 핸들러 함수
  const handleEventClick = (event: Task) => {
    // 캘린더 일정만 수정 가능 (태스크는 칸반 보드에서 수정)
    if (!event.isCalendarEvent) return;
    
    // 수정 다이얼로그 열기
    setEditEventDialog({ show: true, event });
    
    // 편집 폼 초기화
    setEditingEvent({
      id: event.id,
      title: event.title,
      description: event.description || '',
      startDate: event.startDate ? format(new Date(event.startDate), 'yyyy-MM-dd') : '',
      endDate: event.dueDate ? format(new Date(event.dueDate), 'yyyy-MM-dd') : '',
      projectId: event.projectId || ''
    });
  };

  return (
    <div className="bg-white min-h-screen flex">
      {/* 상단 네비게이션 바 */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 py-4 px-6 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-gray-500 hover:text-blue-600 transition-colors">
              <HomeIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-gray-500'}`} />
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
              <CalendarIcon className={`w-4 h-4 ${theme === 'dark' ? 'text-white' : 'text-blue-600'} mr-1`} />
              예약되지 않은 업무
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 max-w-6xl mx-auto py-8 px-4 mt-16">
        {/* 캘린더 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <CalendarIcon className={`w-6 h-6 ${theme === 'dark' ? 'text-white' : 'text-blue-600'} mr-2`} />
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
                  onClick={() => {
                    setSelectedDate(day);
                    // 날짜 클릭 시 일정 추가 다이얼로그 표시
                    setAddEventDialog({ 
                      show: true, 
                      date: day 
                    });
                    // 선택한 날짜로 시작일 자동 설정
                    setNewEvent({
                      ...newEvent,
                      startDate: format(day, 'yyyy-MM-dd')
                    });
                  }}
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
              // 태스크 색상 결정 - 캘린더 일정과 칸반 태스크 구분
              const bgColor = task.isCalendarEvent 
                ? 'bg-indigo-100' // 캘린더 일정은 인디고/보라색 계열
                : 'bg-blue-100';  // 칸반 태스크는 파란색 계열
              const borderColor = task.isCalendarEvent 
                ? 'border-indigo-300' 
                : 'border-blue-300';
              const textColor = task.isCalendarEvent 
                ? 'text-indigo-700' 
                : 'text-blue-700';
              
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
                
                // 프로젝트와 사용자 이름 표시 준비
                const userName = task.user?.name || "";
                const projectName = task.project?.name || "";
                
                // 툴팁 내용 구성
                let tooltipContent = '';
                if (task.isCalendarEvent) {
                  tooltipContent = `${task.title} (${format(task.startDate || new Date(task.createdAt), 'yyyy-MM-dd')} ~ ${task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''})`;
                  if (userName) tooltipContent += `\n작성자: ${userName}`;
                  if (projectName) tooltipContent += `\n프로젝트: ${projectName}`;
                } else {
                  tooltipContent = `${task.title} (마감일: ${task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '없음'})`;
                }
                
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
                    title={tooltipContent}
                    draggable
                    onDragStart={handleDragStart(task)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => {
                      e.stopPropagation(); // 캘린더 셀 클릭 이벤트가 발생하지 않도록 함
                      handleEventClick(task);
                    }}
                  >
                    <span className="truncate">
                      {task.isCalendarEvent ? (
                        <>
                          {task.title}
                          {projectName && <span className="ml-1 text-xs opacity-75">({projectName})</span>}
                        </>
                      ) : (
                        `${task.title} (마감)`
                      )}
                    </span>
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
              // 색상 구분 (사이드바에는 태스크만 표시되므로 모두 파란색)
              const borderColor = 'border-blue-300';
              const bgColor = 'bg-blue-50';
              const statusBg = 'bg-blue-100';
              const statusText = 'text-blue-700';

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
                    <span className={`text-xs px-2 py-1 rounded-full ${statusBg} ${statusText}`}>
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
      
      {/* 일정 수정 다이얼로그 */}
      {editEventDialog.show && editEventDialog.event && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                일정 수정
              </h2>
              <button
                onClick={() => setEditEventDialog({ show: false, event: null })}
                className="text-gray-500 hover:text-gray-700 rounded-full p-1 hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* 제목 입력 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    제목 <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="일정 제목 입력"
                    required
                  />
                </div>

                {/* 설명 입력 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">설명</label>
                  <textarea
                    value={editingEvent.description}
                    onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={3}
                    placeholder="일정에 대한 설명 입력"
                  />
                </div>

                {/* 프로젝트 선택 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">프로젝트</label>
                  <select
                    value={editingEvent.projectId}
                    onChange={(e) => setEditingEvent({...editingEvent, projectId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">개인 일정</option>
                    {projects && projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 시작 날짜 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      시작 날짜 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      value={editingEvent.startDate}
                      onChange={(e) => setEditingEvent({...editingEvent, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>

                  {/* 종료 날짜 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">종료 날짜</label>
                    <input
                      type="date"
                      value={editingEvent.endDate}
                      onChange={(e) => setEditingEvent({...editingEvent, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 버튼 영역 */}
              <div className="mt-6 flex justify-between">
                <Button
                  variant="destructive"
                  onClick={() => deleteCalendarEvent(editingEvent.id)}
                  className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                >
                  삭제
                </Button>
                
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setEditEventDialog({ show: false, event: null })}
                  >
                    취소
                  </Button>
                  <Button
                    onClick={() => updateCalendarEvent(editingEvent)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    수정 완료
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 일정 추가 다이얼로그 */}
      {addEventDialog.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                새 일정 추가
              </h2>
              <button
                onClick={() => {
                  setAddEventDialog({ show: false, date: null });
                  setNewEvent({
                    title: '',
                    description: '',
                    startDate: '',
                    endDate: '',
                    projectId: ''  // 프로젝트 ID 초기화
                  });
                }}
                className="text-gray-500 hover:text-gray-700 rounded-full p-1 hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                {/* 제목 입력 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 flex items-center">
                    제목 <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="일정 제목 입력"
                    required
                  />
                </div>

                {/* 설명 입력 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">설명</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    rows={3}
                    placeholder="일정에 대한 설명 입력"
                  />
                </div>

                {/* 프로젝트 선택 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">프로젝트</label>
                  <select
                    value={newEvent.projectId}
                    onChange={(e) => setNewEvent({...newEvent, projectId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">개인 일정</option>
                    {projects && projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 시작 날짜 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center">
                      시작 날짜 <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                      type="date"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent({...newEvent, startDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      required
                    />
                  </div>

                  {/* 종료 날짜 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">종료 날짜</label>
                    <input
                      type="date"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent({...newEvent, endDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 버튼 영역 */}
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setAddEventDialog({ show: false, date: null })}
                >
                  취소
                </Button>
                <Button
                  onClick={() => addCalendarEvent(newEvent)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  일정 추가
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarPage;