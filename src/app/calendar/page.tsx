"use client";

import { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, differenceInDays, getDay, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, HomeIcon, CalendarIcon, PlusIcon, X, MoreHorizontal } from "lucide-react";
import { useProject } from "@/app/contexts/ProjectContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTasks } from "@/hooks/useTasks";
import { Task as KanbanTask, TaskStatus } from "@/components/kanban/KanbanBoard";
import { useAuth } from "@/app/contexts/AuthContext";

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
  

  // 일정 추가 폼 상태
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormDate, setAddFormDate] = useState<string>('');
  
  const { user } = useAuth();
  
  // 로컬 스토리지 대신 API에서 캘린더 이벤트 직접 불러오기
  const fetchCalendarEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      // 프로젝트별 일정만 가져오기
      const calendarResponse = await fetch(`/api/calendar${projectId ? `?projectId=${projectId}` : ''}`);
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
  }, [projectId]);

  // 초기 데이터 로드
  useEffect(() => {
    fetchCalendarEvents();
    fetchKanbanTasks();
  }, [fetchCalendarEvents, projectId]);

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
      // datetime-local 값 그대로 ISO로 변환
      const startDateTime = new Date(event.startDate);
      let endDateTime;
      if (!event.endDate || event.endDate.trim() === '') {
        endDateTime = new Date(event.startDate);
      } else {
        endDateTime = new Date(event.endDate);
      }
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
          projectId: projectId || null
        }),
      });
      if (!response.ok) {
        throw new Error('캘린더 이벤트 추가 실패');
      }
      const newEvent = await response.json();
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
      setAddEventDialog({ show: false, date: null });
      setNewEvent({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        projectId: ''
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

  // 이전 달/주/일로 이동
  const handlePrev = () => {
    if (calendarView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else if (calendarView === 'week') {
      const newDate = addDays(currentDate, -7);
      setCurrentDate(newDate);
      setSelectedDate(newDate); // 주간 뷰: 선택 날짜도 이동
    } else {
      const newDate = addDays(currentDate, -1);
      setCurrentDate(newDate);
      setSelectedDate(newDate); // 일간 뷰: 선택 날짜도 이동
    }
  };

  // 다음 달/주/일로 이동
  const handleNext = () => {
    if (calendarView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else if (calendarView === 'week') {
      const newDate = addDays(currentDate, 7);
      setCurrentDate(newDate);
      setSelectedDate(newDate); // 주간 뷰: 선택 날짜도 이동
    } else {
      const newDate = addDays(currentDate, 1);
      setCurrentDate(newDate);
      setSelectedDate(newDate); // 일간 뷰: 선택 날짜도 이동
    }
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
      let endDateTime;
      if (!event.endDate || event.endDate.trim() === '') {
        endDateTime = new Date(event.startDate);
      } else {
        endDateTime = new Date(event.endDate);
      }
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
    if (!event.isCalendarEvent) return;
    setEditEventDialog({ show: true, event });
    setShowAddForm(false);
    setEditingEvent({
      id: event.id,
      title: event.title,
      description: event.description || '',
      startDate: event.startDate ? format(new Date(event.startDate), 'yyyy-MM-dd') : '',
      endDate: event.dueDate ? format(new Date(event.dueDate), 'yyyy-MM-dd') : '',
      projectId: event.projectId || ''
    });
  };

  const [calendarView, setCalendarView] = useState<'month'|'week'|'day'>('month');

  // 일정 색상 추출 함수
  function getCalendarEventColor(tasks: Task[]) {
    // isCalendarEvent: true인 일정에서 색상 추출(없으면 indigo-500)
    const calendarEvent = tasks.find(t => t.isCalendarEvent);
    // color 필드가 있다면 calendarEvent.color 사용
    return calendarEvent ? '#6366f1' : '#6366f1'; // indigo-500
  }
  function getProjectTaskColor(tasks: Task[]) {
    // isCalendarEvent: false인 태스크에서 색상 추출(없으면 blue-500)
    const projectTask = tasks.find(t => !t.isCalendarEvent);
    return projectTask ? '#3b82f6' : '#3b82f6'; // blue-500
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 좌측 패널 */}
      <aside className="w-72 border-r bg-white flex flex-col p-4">
        {/* 미니 달력 (예시: react-calendar 또는 커스텀) */}
        <div className="mb-6">
          <div className="font-bold text-lg mb-2">2025년 5월</div>
          {/* 미니 달력 자리 (추후 라이브러리 적용 가능) */}
          <div className="grid grid-cols-7 gap-1 text-xs text-center text-gray-500">
            {['일','월','화','수','목','금','토'].map(d => <div key={d}>{d}</div>)}
            {[...Array(31)].map((_,i) => <div key={i} className="py-1 rounded hover:bg-blue-100 cursor-pointer">{i+1}</div>)}
          </div>
        </div>
        {/* 일정 추가 버튼 */}
        <Button className="w-full mb-4" onClick={() => {
          setAddEventDialog({show:true,date:null});
          setShowAddForm(true);
          setEditEventDialog({ show: false, event: null });
          setNewEvent({
            ...newEvent,
            startDate: format(new Date(), 'yyyy-MM-dd'),
            endDate: '',
            projectId: ''
          });
        }}>
          <PlusIcon className="w-4 h-4 mr-1" /> 새 일정 추가
        </Button>
        {/* 계정/캘린더 목록 (색상 동적 적용) */}
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-1">내 캘린더</div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: getCalendarEventColor(tasks) }}
            />
            나의 일정
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: getProjectTaskColor(tasks) }}
            />
            프로젝트 일정
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" /> 공휴일/기념일
          </div>
        </div>
        {/* 공휴일/기념일 예시 */}
        <div className="text-xs text-gray-400 mb-1">공휴일</div>
        <div className="text-xs text-gray-600">5/1 노동절<br/>5/5 어린이날<br/>5/15 스승의날</div>
      </aside>
      
      {/* 중앙 메인 캘린더 */}
      <main className={`flex-1 w-full h-full flex flex-col p-0 m-0 justify-stretch items-stretch ${calendarView==='week'||calendarView==='day' ? 'overflow-y-auto' : 'overflow-hidden'}` }>
        {/* 상단 네비게이션 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrev}><ChevronLeft className="w-5 h-5" /></Button>
            <div className="text-2xl font-bold">{format(currentDate, 'yyyy년 M월', {locale:ko})}</div>
            <Button variant="ghost" size="icon" onClick={handleNext}><ChevronRight className="w-5 h-5" /></Button>
            <Button variant="ghost" size="sm" onClick={()=>setCurrentDate(new Date())}>오늘</Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={()=>router.push('/')}>대시보드</Button>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-gray-600 hover:text-gray-900 text-xs"
            >
              <CalendarIcon className="w-3 h-3 mr-1" />
              예약되지 않은 업무
            </Button>
            {/* 뷰 전환 버튼 */}
            <div className="flex gap-1 ml-2">
              <Button size="sm" variant={calendarView==='month'?'default':'outline'} onClick={()=>setCalendarView('month')}>월</Button>
              <Button size="sm" variant={calendarView==='week'?'default':'outline'} onClick={()=>setCalendarView('week')}>주</Button>
              <Button size="sm" variant={calendarView==='day'?'default':'outline'} onClick={()=>setCalendarView('day')}>일</Button>
            </div>
            <MoreHorizontal className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        {/* 월/주/일 달력 뷰 */}
        {calendarView === 'month' && (
          <div className="bg-white rounded-lg shadow border overflow-hidden w-full h-full flex flex-col">
            <div className="grid grid-cols-7 border-b text-center text-sm font-medium bg-gray-50 w-full">
              {weekDays.map((d,i)=>(<div key={i} className={i===0?'text-red-500':i===6?'text-blue-500':'text-gray-700'}>{d}</div>))}
            </div>
            <div className="grid grid-cols-7 flex-1 h-0 min-h-0 auto-rows-fr">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                return (
                  <div
                    key={day.toString()}
                    className={`relative border p-2 h-full ${!isCurrentMonth?'bg-gray-50 text-gray-400':'bg-white'} ${isCurrentDay?'ring-2 ring-blue-400':''}`}
                    onDoubleClick={() => {
                      setShowAddForm(true);
                      setAddFormDate(format(day, 'yyyy-MM-dd'));
                      setNewEvent({ ...newEvent, startDate: format(day, 'yyyy-MM-dd') });
                      setEditEventDialog({ show: false, event: null });
                    }}
                    onClick={()=>{
                      setSelectedDate(day);
                    }}
                    onDragOver={handleDragOver(day)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(day)}
                  >
                    <div className="absolute top-2 left-2 text-xs font-semibold">{format(day,'d')}</div>
                    {/* 일정 표시 */}
                    <div className="mt-6 space-y-1 relative h-full">
                      {(() => {
                        const events = calendarTasks.filter(t=>{
                          const dateToCheck = t.startDate || t.dueDate || undefined;
                          return dateToCheck && isSameDay(dateToCheck, day);
                        });
                        const showEvents = events.slice(0,2);
                        const moreCount = events.length - 2;
                        return (
                          <>
                            {showEvents.map((task,i)=>{
                              // 시간 포맷
                              const start = task.startDate ? new Date(task.startDate) : undefined;
                              const end = task.endDate ? new Date(task.endDate) : undefined;
                              const timeStr = (start && end)
                                ? `${start.getHours().toString().padStart(2,'0')}:${start.getMinutes().toString().padStart(2,'0')}~${end.getHours().toString().padStart(2,'0')}:${end.getMinutes().toString().padStart(2,'0')}`
                                : '';
                              return (
                                <div key={task.id+''+i} 
                                  className={`truncate px-2 py-0.5 rounded text-xs font-medium ${task.isCalendarEvent?'bg-indigo-100 text-indigo-700':'bg-blue-100 text-blue-700'}`}
                                  style={{whiteSpace:'normal',maxHeight:48,overflowY:'auto',wordBreak:'break-all',marginBottom:2}}
                                  onClick={() => handleEventClick(task)}
                                >
                                  <div>{task.title}</div>
                                  {timeStr && <div className="text-[10px] text-gray-500 mt-0.5">{timeStr}</div>}
                                </div>
                              )
                            })}
                            {moreCount > 0 && (
                              <div className="text-xs text-blue-500 cursor-pointer select-none" style={{marginTop:2}}>
                                +{moreCount}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {calendarView === 'week' && (
          <div className="bg-white rounded-lg shadow border overflow-hidden w-full h-full flex flex-col">
            <div className="grid grid-cols-7 border-b text-center text-sm font-medium bg-gray-50 w-full">
              {weekDays.map((d,i)=>(<div key={i} className={i===0?'text-red-500':i===6?'text-blue-500':'text-gray-700'}>{d}</div>))}
            </div>
            <div className="grid grid-cols-7 flex-1 h-0 min-h-0 auto-rows-fr">
              {(() => {
                // 현재 날짜가 속한 주의 일요일~토요일 구하기
                const curr = selectedDate || currentDate;
                const weekStart = addDays(curr, -getDay(curr));
                return Array.from({length:7}).map((_,i)=>{
                  const day = addDays(weekStart, i);
                  const isCurrentDay = isToday(day);
                  return (
                    <div
                      key={day.toString()}
                      className={`relative border p-2 h-full bg-white ${isCurrentDay?'ring-2 ring-blue-400':''}`}
                      onDoubleClick={() => {
                        setShowAddForm(true);
                        setAddFormDate(format(day, 'yyyy-MM-dd'));
                        setNewEvent({ ...newEvent, startDate: format(day, 'yyyy-MM-dd') });
                        setEditEventDialog({ show: false, event: null });
                      }}
                      onClick={()=>{
                        setSelectedDate(day);
                      }}
                      onDragOver={handleDragOver(day)}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop(day)}
                    >
                      <div className="absolute top-2 left-2 text-xs font-semibold">{format(day,'d')}</div>
                      <div className="mt-6 space-y-1 relative">
                        {(() => {
                          const events = calendarTasks.filter(t=>{
                            const dateToCheck = t.startDate || t.dueDate || undefined;
                            return dateToCheck && isSameDay(dateToCheck, day);
                          });
                          return (
                            <>
                              {events.map((task,i)=>{
                                // 시간 포맷
                                const start = task.startDate ? new Date(task.startDate) : undefined;
                                const end = task.endDate ? new Date(task.endDate) : undefined;
                                const timeStr = (start && end)
                                  ? `${start.getHours().toString().padStart(2,'0')}:${start.getMinutes().toString().padStart(2,'0')}~${end.getHours().toString().padStart(2,'0')}:${end.getMinutes().toString().padStart(2,'0')}`
                                  : '';
                                return (
                                  <div key={task.id+''+i} 
                                    className={`truncate px-2 py-0.5 rounded text-xs font-medium ${task.isCalendarEvent?'bg-indigo-100 text-indigo-700':'bg-blue-100 text-blue-700'}`}
                                    style={{whiteSpace:'normal',maxHeight:48,overflowY:'auto',wordBreak:'break-all',marginBottom:2}}
                                    onClick={() => handleEventClick(task)}
                                  >
                                    <div>{task.title}</div>
                                    {timeStr && <div className="text-[10px] text-gray-500 mt-0.5">{timeStr}</div>}
                                  </div>
                                )
                              })}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        )}
        {calendarView === 'day' && (
          <div className="bg-white rounded-lg shadow border overflow-hidden w-full h-full flex flex-col">
            <div className="border-b text-center text-sm font-medium bg-gray-50 py-2">
              {format(selectedDate || currentDate, 'yyyy년 MM월 dd일 (E)', {locale:ko})}
            </div>
            <div className="p-8 min-h-[300px]">
              <div className="font-bold mb-2">{format(selectedDate || currentDate, 'd일')}</div>
              <div className="space-y-2 relative">
                {(() => {
                  const events = calendarTasks.filter(t=>{
                    const dateToCheck = t.startDate || t.dueDate || undefined;
                    return dateToCheck && isSameDay(dateToCheck, selectedDate || currentDate);
                  });
                  return (
                    <>
                      {events.map((task,i)=>{
                        // 시간 포맷
                        const start = task.startDate ? new Date(task.startDate) : undefined;
                        const end = task.endDate ? new Date(task.endDate) : undefined;
                        const timeStr = (start && end)
                          ? `${start.getHours().toString().padStart(2,'0')}:${start.getMinutes().toString().padStart(2,'0')}~${end.getHours().toString().padStart(2,'0')}:${end.getMinutes().toString().padStart(2,'0')}`
                          : '';
                        return (
                          <div key={task.id+''+i} 
                            className={`truncate px-2 py-0.5 rounded text-xs font-medium ${task.isCalendarEvent?'bg-indigo-100 text-indigo-700':'bg-blue-100 text-blue-700'}`}
                            style={{whiteSpace:'normal',maxHeight:48,overflowY:'auto',wordBreak:'break-all',marginBottom:2}}
                            onClick={() => handleEventClick(task)}
                          >
                            <div>{task.title}</div>
                            {timeStr && <div className="text-[10px] text-gray-500 mt-0.5">{timeStr}</div>}
                          </div>
                        )
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 우측 패널 */}
      <aside className="w-80 border-l bg-white flex flex-col p-4 overflow-y-auto">
        {/* 일정 추가 폼: showAddForm이 true일 때만 표시 */}
        {showAddForm && (
          <div className="mb-6 border-b pb-4">
            <div className="font-bold text-lg mb-4">새 일정 추가</div>
            <div className="space-y-6">
              {/* 제목 */}
              <div>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 text-lg font-semibold placeholder-gray-400"
                  placeholder="제목을 입력하세요"
                  required
                />
              </div>
              {/* 설명 */}
              <div>
                <textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 text-base placeholder-gray-400 resize-none"
                  rows={2}
                  placeholder="설명을 입력하세요"
                />
              </div>
              {/* 날짜+시간 */}
              <div className="flex flex-col gap-2">
                <input
                  type="datetime-local"
                  value={newEvent.startDate}
                  onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                  className="w-full min-w-0 block bg-transparent border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 text-base placeholder-gray-400"
                  required
                />
                <input
                  type="datetime-local"
                  value={newEvent.endDate}
                  onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
                  className="w-full min-w-0 block bg-transparent border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 text-base placeholder-gray-400"
                />
              </div>
              {/* 버튼 */}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => {
                  addCalendarEvent(newEvent);
                  setShowAddForm(false);
                  setNewEvent({ title: '', description: '', startDate: '', endDate: '', projectId: '' });
                }}>
                  일정 추가
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => {
                  setShowAddForm(false);
                  setNewEvent({ title: '', description: '', startDate: '', endDate: '', projectId: '' });
                }}>
                  취소
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* 일정 수정 폼: editEventDialog.show가 true일 때만 표시 */}
        {editEventDialog.show && editEventDialog.event && (
          <div className="mb-6 border-b pb-4">
            <div className="font-bold text-lg mb-4">일정 수정</div>
            <div className="space-y-6">
              {/* 제목 */}
              <div>
                <input
                  type="text"
                  value={editingEvent.title}
                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 text-lg font-semibold placeholder-gray-400"
                  placeholder="제목을 입력하세요"
                  required
                />
              </div>
              {/* 설명 */}
              <div>
                <textarea
                  value={editingEvent.description}
                  onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 text-base placeholder-gray-400 resize-none"
                  rows={2}
                  placeholder="설명을 입력하세요"
                />
              </div>
              {/* 날짜+시간 */}
              <div className="flex flex-col gap-2">
                <input
                  type="datetime-local"
                  value={editingEvent.startDate}
                  onChange={e => setEditingEvent({ ...editingEvent, startDate: e.target.value })}
                  className="w-full min-w-0 block bg-transparent border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 text-base placeholder-gray-400"
                  required
                />
                <input
                  type="datetime-local"
                  value={editingEvent.endDate}
                  onChange={e => setEditingEvent({ ...editingEvent, endDate: e.target.value })}
                  className="w-full min-w-0 block bg-transparent border-0 border-b border-gray-300 focus:border-blue-500 focus:ring-0 text-base placeholder-gray-400"
                />
              </div>
              {/* 버튼 */}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => updateCalendarEvent(editingEvent)}>
                  수정 완료
                </Button>
                <Button className="flex-1" variant="outline" onClick={() => setEditEventDialog({ show: false, event: null })}>
                  취소
                </Button>
                <Button className="flex-1" variant="destructive" onClick={() => deleteCalendarEvent(editingEvent.id)}>
                  삭제
                </Button>
              </div>
              {/* 일정 생성자 정보 표시 */}
              <div className="mt-4 text-xs text-gray-500 border-t pt-3">
                {editEventDialog.event?.user ? (
                  <>
                    <span className="font-semibold">생성자:</span> {editEventDialog.event.user.name} ({editEventDialog.event.user.email})
                  </>
                ) : editEventDialog.event?.userId ? (
                  <>
                    <span className="font-semibold">생성자 ID:</span> {editEventDialog.event.userId}
                  </>
                ) : (
                  <span className="font-semibold">생성자 정보 없음</span>
                )}
              </div>
            </div>
          </div>
        )}
        {/* 기존 우측 안내/예정된 회의/단축키 안내 */}
        <div className="mb-6">
          <div className="font-bold text-lg mb-2">예정된 회의</div>
          <div className="text-xs text-gray-500">예정된 회의가 없습니다</div>
        </div>
        <div className="mb-6">
          <div className="font-bold text-lg mb-2">캘린더 안내</div>
          <ul className="text-xs text-gray-600 list-disc pl-4">
            <li>1</li>
            <li>2</li>
            <li>날짜 더블클릭으로 새 일정 추가</li>
          </ul>
        </div>
        {/* <div>
          <div className="font-bold text-lg mb-2">단축키 안내</div>
          <ul className="text-xs text-gray-600 list-disc pl-4">
            <li>←/→ : 월 이동</li>
            <li>Enter : 오늘로 이동</li>
            <li>Esc : 다이얼로그 닫기</li>
          </ul>
        </div> */}
      </aside>

      {/* 예약되지 않은 업무 사이드바 (드래그 앤 드롭) */}
      {isSidebarOpen && (
        <div 
          className="fixed top-0 bottom-0 right-0 w-80 bg-white shadow-lg border-l border-gray-200 p-4 transition-transform duration-300 z-20 mt-0"
          style={{marginTop:0}}
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
      )}
    </div>
  );
}

// 스크롤바 숨김용 글로벌 스타일
// eslint-disable-next-line react/no-unknown-property
<style jsx global>{`
  .hide-scrollbar {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE 10+ */
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome/Safari/Webkit */
  }
`}</style>

export default CalendarPage;