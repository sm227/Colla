"use client";

import { useState, useEffect, useMemo, useContext, useCallback, Suspense } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, differenceInDays, getDay, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, HomeIcon, CalendarIcon, PlusIcon, X, SunIcon, MoonIcon } from "lucide-react";
import { useProject } from "@/app/contexts/ProjectContext";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTasks } from "@/hooks/useTasks";
import { Task as KanbanTask, TaskStatus } from "@/components/kanban/KanbanBoard";
import { useAuth } from "@/app/contexts/AuthContext";
import { useTheme } from "next-themes";
import { DeleteConfirmModal } from "@/components/modals/DeleteConfirmModal";

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
  isHoliday?: boolean; // 공휴일 여부를 나타내는 필드
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

const CalendarPageContent: React.FC = () => {
  // 모든 hooks를 최상단으로 이동
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('projectId');
  const { currentProject, projects } = useProject();
  const { tasks: projectTasks, updateTask, fetchTasks } = useTasks(projectId || currentProject?.id);
  const { user } = useAuth();
  const { theme } = useTheme();

  // 탭 타입 정의
  type ActiveTab = 'none' | 'unscheduled' | 'addEvent' | 'editEvent' | 'taskDetail';

  // useState hooks
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);
  const [sidebarTasks, setSidebarTasks] = useState<Task[]>([]);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [dropTarget, setDropTarget] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [addFormDate, setAddFormDate] = useState<string>('');
  const [calendarView, setCalendarView] = useState<'month'|'week'|'day'>('month');
  const [mounted, setMounted] = useState(false);
  const [addEventDialog, setAddEventDialog] = useState<AddEventDialog>({
    show: false,
    date: null
  });
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    projectId: ''
  });
  const [editEventDialog, setEditEventDialog] = useState<EditEventDialog>({
    show: false,
    event: null
  });
  const [editingEvent, setEditingEvent] = useState({
    id: '',
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    projectId: ''
  });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // 통합 탭 상태 관리 - 하나의 탭만 열리도록 제어
  const [activeTab, setActiveTab] = useState<ActiveTab>('none');

  // 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // useCallback hooks
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
      
      // 공휴일 데이터 가져오기
      const currentYear = currentDate.getFullYear();
      const holidaysResponse = await fetch(`/api/holidays?year=${currentYear}`);
      let holidaysData = [];
      if (holidaysResponse.ok) {
        holidaysData = await holidaysResponse.json();
      } else {
        console.warn('공휴일 데이터를 가져오는데 실패했습니다:', holidaysResponse.statusText);
      }
      
      // 캘린더 이벤트 포맷팅
      const calendarEvents = calendarData.map((event: {
        id: number;
        title: string;
        description: string;
        startDate: string;
        endDate: string;
        createdAt: string;
      }) => ({
        ...event,
        id: event.id.toString(),
        startDate: event.startDate ? new Date(event.startDate) : undefined,
        endDate: event.endDate ? new Date(event.endDate) : undefined,
        dueDate: event.endDate ? new Date(event.endDate) : null,
        createdAt: new Date(event.createdAt),
        isCalendarEvent: true
      }));
      
      // 마감일이 있는 칸반 태스크 포맷팅 (dueDate 기준으로 표시)
      const taskEvents = tasksData
        .map((task: {
          id: number;
          title: string;
          description: string;
          status: string;
          priority: string;
          dueDate: string;
          createdAt: string;
          projectId?: string;
        }) => {
          return {
            ...task,
            id: task.id.toString(),
            startDate: undefined, // 칸반 태스크는 startDate 없음
            endDate: task.dueDate ? new Date(task.dueDate) : undefined,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            createdAt: new Date(task.createdAt),
            isCalendarEvent: false
          };
        });
      
      // 공휴일 이벤트 포맷팅
      const holidayEvents = holidaysData.map((holiday: {
        id: string;
        title: string;
        date: string;
      }) => ({
        ...holiday,
        id: holiday.id,
        startDate: new Date(holiday.date),
        endDate: new Date(holiday.date),
        dueDate: new Date(holiday.date),
        createdAt: new Date(),
        isCalendarEvent: true,
        isHoliday: true
      }));
      
      // 모든 이벤트 합치기
      setTasks([...calendarEvents, ...taskEvents, ...holidayEvents]);
    } catch (error) {
      console.error('캘린더 이벤트 가져오기 오류:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, currentDate]);

  // 칸반 태스크를 가져오는 함수
  const fetchKanbanTasks = useCallback(async () => {
    try {
      // 프로젝트별 태스크 가져오기
      const url = projectId 
        ? `/api/tasks?noCalendarEvents=true&projectId=${projectId}` 
        : '/api/tasks?noCalendarEvents=true';
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('칸반 태스크를 가져오는데 실패했습니다');
      }
      const data = await response.json();
      
      // 마감일이 없는 태스크만 필터링 (API에서 이미 필터링되지만 추가 확인)
      const kanbanTasks = data
        .filter((task: {
          dueDate?: string;
        }) => {
          return !task.dueDate;
        })
                  .map((task: {
            id: number;
            title: string;
            description: string;
            status: string;
            priority: string;
            startDate?: string;
            endDate?: string;
            createdAt: string;
            projectId?: string;
          }) => ({
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
  }, [projectId]);

  // useMemo hooks
  const { calendarDays, processedCalendarTasks, tasksByDate } = useMemo(() => {
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
    
    // 날짜별 태스크 매핑 미리 계산
    const tasksByDateMap = new Map<string, Task[]>();
    
    tasks.forEach(task => {
      if (!task.dueDate) return;
      
      // 태스크가 표시될 날짜 계산
      const dateToCheck = task.isCalendarEvent ? 
        (task.startDate || task.dueDate) : 
        task.dueDate;
      
      if (dateToCheck) {
        const dateKey = format(dateToCheck, 'yyyy-MM-dd');
        if (!tasksByDateMap.has(dateKey)) {
          tasksByDateMap.set(dateKey, []);
        }
        tasksByDateMap.get(dateKey)!.push(task);
      }
    });
    
    // 태스크 처리 로직 (tasks가 비어있으면 빈 배열 반환)
    if (tasks.length === 0) {
      return { calendarDays: allCalendarDays, processedCalendarTasks: [], tasksByDate: tasksByDateMap };
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
    return { calendarDays: allCalendarDays, processedCalendarTasks: tasksWithRows, tasksByDate: tasksByDateMap };
  }, [currentDate, tasks]);

  // useEffect hooks
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setCalendarTasks(processedCalendarTasks);
  }, [processedCalendarTasks]);

  useEffect(() => {
    fetchCalendarEvents();
    fetchKanbanTasks();
  }, [fetchCalendarEvents, fetchKanbanTasks, projectId]);

  // 일별 뷰에서 현재 시간으로 스크롤
  useEffect(() => {
    if (calendarView === 'day' && isToday(selectedDate || currentDate)) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const scrollPosition = Math.max(0, (currentHour * 64) + (currentMinute * 64 / 60) - 200); // 현재 시간보다 조금 위로
      
      // 스크롤 컨테이너 찾기
      const scrollContainer = document.querySelector('.day-view-scroll');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [calendarView, selectedDate, currentDate]);

  // 주별 뷰에서 현재 시간으로 스크롤
  useEffect(() => {
    if (calendarView === 'week') {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const scrollPosition = Math.max(0, (currentHour * 64) + (currentMinute * 64 / 60) - 200); // 현재 시간보다 조금 위로
      
      // 스크롤 컨테이너 찾기
      const scrollContainer = document.querySelector('.week-view-scroll');
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [calendarView, selectedDate, currentDate]);

  if (!mounted) {
    return (
      <div className="flex h-screen bg-background text-foreground items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  // 일정 추가 함수
  const addCalendarEvent = async (event: {
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    projectId: string;
  }) => {
    if (!event.title.trim()) {
      alert("제목이 필요합니다. 이벤트에 제목을 추가해주세요.");
      return;
    }
    try {
      let startDateTime: Date;
      let endDateTime: Date;
      
      // 시간이 설정되지 않은 경우 (월별 뷰에서 더블클릭으로 생성된 경우)
      if (event.startDate && !event.startDate.includes('T')) {
        // 현재 시간으로 설정
        const now = new Date();
        const baseDate = new Date(event.startDate);
        
        startDateTime = new Date(baseDate);
        startDateTime.setHours(now.getHours(), now.getMinutes(), 0, 0);
        
        endDateTime = new Date(startDateTime);
        endDateTime.setTime(startDateTime.getTime() + (60 * 60 * 1000)); // 1시간 후
      } else {
        // 시간이 설정된 경우 기존 로직 사용
        startDateTime = new Date(event.startDate);
        if (!event.endDate || event.endDate.trim() === '') {
          endDateTime = new Date(event.startDate);
        } else {
          endDateTime = new Date(event.endDate);
        }
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
    
    if (!draggedTask || draggedTask.isHoliday) return; // 공휴일은 드래그 불가
    
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
        startDate: draggedTask.isCalendarEvent ? startDate : undefined, // 칸반 태스크는 startDate 없음
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
          startDate: undefined, // 칸반 태스크는 startDate를 설정하지 않음
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
    
    if (!draggedTask || draggedTask.isHoliday) return; // 공휴일은 드래그 불가
    
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
  const updateCalendarEvent = async (event: {
    id: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    projectId: string;
  }) => {
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

      // 다이얼로그 닫기
      setEditEventDialog({ show: false, event: null });
      setActiveTab('none');
    } catch (error) {
      console.error("캘린더 이벤트 삭제 오류:", error);
      alert("이벤트를 삭제하는 도중 오류가 발생했습니다.");
    }
  };

  // 삭제 버튼 클릭 핸들러
  const handleDeleteClick = (eventId: string) => {
    setEventToDelete(eventId);
    setShowDeleteModal(true);
  };

  // 삭제 확인 핸들러
  const handleConfirmDelete = () => {
    if (eventToDelete) {
      deleteCalendarEvent(eventToDelete);
      setEventToDelete(null);
    }
  };

  // 일정 클릭 핸들러 함수
  const handleEventClick = (event: Task) => {
    if (event.isHoliday) {
      // 공휴일인 경우 간단한 정보만 표시
      alert(`${event.title}\n\n공휴일입니다.`);
      return;
    }
    
    if (event.isCalendarEvent) {
      // 캘린더 일정인 경우 기존 로직
      setEditEventDialog({ show: true, event });
      setActiveTab('editEvent');
      setEditingEvent({
        id: event.id,
        title: event.title,
        description: event.description || '',
        startDate: event.startDate ? format(new Date(event.startDate), 'yyyy-MM-dd\'T\'HH:mm') : '',
        endDate: event.dueDate ? format(new Date(event.dueDate), 'yyyy-MM-dd\'T\'HH:mm') : '',
        projectId: event.projectId || ''
      });
    } else {
      // 칸반 태스크인 경우 태스크 상세 정보 표시
      setSelectedTask(event);
      setActiveTab('taskDetail');
      setEditEventDialog({ show: false, event: null });
    }
  };

  // 캘린더 일정 색상 함수 (테마별 색상 적용)
  function getCalendarEventColor() {
    if (!mounted) return '#6366f1'; // 기본값
    if (theme === 'dark') {
      return '#8b5cf6'; // 다크모드: 보라색 (violet-500)
    }
    return '#6366f1'; // 라이트모드: 인디고색 (indigo-500)
  }

  // 칸반 태스크 색상 함수 (테마별 색상 적용)
  function getKanbanTaskColor() {
    if (!mounted) return '#3b82f6'; // 기본값
    if (theme === 'dark') {
      return '#06b6d4'; // 다크모드: 시안색 (cyan-500)
    }
    return '#3b82f6'; // 라이트모드: 파란색 (blue-500)
  }

  // 캘린더 일정 스타일 클래스 함수
  function getCalendarEventClasses() {
    if (!mounted) return 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20'; // 기본값
    if (theme === 'dark') {
      return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    }
    return 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20';
  }

  // 칸반 태스크 스타일 클래스 함수
  function getKanbanTaskClasses() {
    if (!mounted) return 'bg-blue-500/10 text-blue-700 border-blue-500/20'; // 기본값
    if (theme === 'dark') {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    }
    return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
  }

  // 공휴일 색상 함수 (테마별 색상 적용)
  function getHolidayColor() {
    if (!mounted) return '#dc2626'; // 기본값
    if (theme === 'dark') {
      return '#ef4444'; // 다크모드: 빨간색 (red-500)
    }
    return '#dc2626'; // 라이트모드: 진한 빨간색 (red-600)
  }

  // 공휴일 스타일 클래스 함수
  function getHolidayClasses() {
    if (!mounted) return 'bg-red-500/10 text-red-700 border-red-500/20'; // 기본값
    if (theme === 'dark') {
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
    return 'bg-red-500/10 text-red-700 border-red-500/20';
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* 좌측 패널 */}
      <aside className="w-72 border-r border-border bg-card text-card-foreground flex flex-col p-4">
        {/* 미니 달력 */}
        <div className="mb-6">
          <div className="font-bold text-lg mb-2">{format(currentDate, 'yyyy년 M월', {locale:ko})}</div>
          <div className="grid grid-cols-7 gap-1 text-xs text-center">
            {/* 요일 헤더 */}
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <div key={d} className={`py-1 font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground'}`}>
                {d}
              </div>
            ))}
            {/* 날짜 */}
            {(() => {
              const monthStart = startOfMonth(currentDate);
              const monthEnd = endOfMonth(currentDate);
              const firstDayOfMonth = getDay(monthStart);
              
              // 이전 달의 마지막 날짜들
              const prevMonthDays = firstDayOfMonth > 0 
                ? eachDayOfInterval({ 
                    start: addDays(monthStart, -firstDayOfMonth), 
                    end: addDays(monthStart, -1) 
                  }) 
                : [];
              
              // 현재 달의 날짜들
              const currentMonthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
              
              // 다음 달의 시작 날짜들 (42개 칸 채우기 위함)
              const totalCells = 42;
              const usedCells = prevMonthDays.length + currentMonthDays.length;
              const nextMonthDays = usedCells < totalCells 
                ? eachDayOfInterval({ 
                    start: addDays(monthEnd, 1), 
                    end: addDays(monthEnd, totalCells - usedCells) 
                  }) 
                : [];
              
              const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
              
              return allDays.map((day, index) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                const isSelectedDay = selectedDate && isSameDay(day, selectedDate);
                
                // 해당 날짜에 일정이 있는지 확인
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = tasksByDate.get(dateKey) || [];
                const hasEvents = dayEvents.length > 0;
                
                return (
                  <div 
                    key={index} 
                    className={`
                      py-1 rounded cursor-pointer transition-colors relative
                      ${!isCurrentMonth ? 'text-muted-foreground/50' : 'text-foreground'}
                      ${isCurrentDay ? 'bg-primary text-primary-foreground font-bold' : ''}
                      ${isSelectedDay && !isCurrentDay ? 'bg-muted text-foreground font-medium' : ''}
                      ${!isCurrentDay && !isSelectedDay ? 'hover:bg-muted/50' : ''}
                    `}
                    onClick={() => {
                      setSelectedDate(day);
                      setCurrentDate(day);
                    }}
                  >
                    {format(day, 'd')}
                    {/* 일정 있음 표시 */}
                    {hasEvents && isCurrentMonth && (
                      <div className={`
                        absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full
                        ${isCurrentDay ? 'bg-primary-foreground' : 'bg-primary'}
                      `} />
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
        {/* 일정 추가 버튼 */}
        <Button className="w-full mb-4" onClick={() => {
          setAddEventDialog({show:true,date:null});
          setActiveTab('addEvent');
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
              style={{ backgroundColor: getCalendarEventColor() }}
            />
            나의 일정
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: getKanbanTaskColor() }}
            />
            프로젝트 일정
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: getHolidayColor() }}
            />
            공휴일
          </div>
        </div>
      </aside>
      
      {/* 중앙 메인 캘린더 */}
      <main 
        className={`flex-1 w-full h-full flex flex-col p-4 bg-background text-foreground ${calendarView==='week'||calendarView==='day' ? 'overflow-y-auto' : 'overflow-hidden'}` }
      >
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
              onClick={() => setActiveTab(activeTab === 'unscheduled' ? 'none' : 'unscheduled')}
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
          </div>
        </div>
        {/* 월/주/일 달력 뷰 */}
        {calendarView === 'month' && (
          <div className="bg-card text-card-foreground rounded-lg shadow border border-border overflow-hidden w-full h-full flex flex-col">
            <div className="grid grid-cols-7 border-b border-border text-center text-sm font-medium bg-muted text-muted-foreground w-full">
              {weekDays.map((d,i)=>(<div key={i} className={`py-2 ${i===0?'text-red-500':i===6?'text-blue-500':'text-foreground'}`}>{d}</div>))}
            </div>
            <div className="grid grid-cols-7 flex-1 h-0 min-h-0 auto-rows-fr">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                return (
                  <div
                    key={day.toString()}
                    className={`relative border border-border p-2 h-full ${!isCurrentMonth?'bg-muted text-muted-foreground':'bg-card text-card-foreground'} ${isCurrentDay?'ring-2 ring-primary':''}`}
                    onDoubleClick={() => {
                      setActiveTab('addEvent');
                      setAddFormDate(format(day, 'yyyy-MM-dd'));
                      setNewEvent({ ...newEvent, startDate: format(day, 'yyyy-MM-dd') });
                      setEditEventDialog({ show: false, event: null });
                    }}
                    onClick={()=>{
                      setSelectedDate(day);
                    }}
                    onDragOver={handleDragOver(day)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedTask && !draggedTask.isCalendarEvent && !draggedTask.isHoliday) {
                        handleDrop(day)(e);
                      }
                    }}
                  >
                    {/* 날짜와 공휴일 표시 */}
                    <div className="absolute top-2 left-2 text-xs font-semibold flex items-center gap-1">
                      <span>{format(day,'d')}</span>
                      {(() => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const events = tasksByDate.get(dateKey) || [];
                        const holidayEvent = events.find(event => event.isHoliday);
                        return holidayEvent ? (
                          <span 
                            className="text-red-500 text-[10px]"
                            title={holidayEvent.title}
                          >
                            {holidayEvent.title}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    {/* 일정 표시 (공휴일 제외) */}
                    <div className="mt-6 space-y-1 relative h-full">
                      {(() => {
                        const dateKey = format(day, 'yyyy-MM-dd');
                        const events = tasksByDate.get(dateKey) || [];
                        // 공휴일이 아닌 이벤트만 필터링
                        const nonHolidayEvents = events.filter(event => !event.isHoliday);
                        const showEvents = nonHolidayEvents.slice(0,2);
                        const moreCount = nonHolidayEvents.length - 2;
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
                                  className={`truncate px-2 py-0.5 rounded text-xs font-medium ${
                                    !task.isCalendarEvent ? 'cursor-move' : 'cursor-pointer'
                                  } ${
                                    task.isCalendarEvent ? getCalendarEventClasses() : getKanbanTaskClasses()
                                  }`}
                                  style={{whiteSpace:'normal',maxHeight:48,overflowY:'auto',wordBreak:'break-all',marginBottom:2}}
                                  onClick={() => handleEventClick(task)}
                                  draggable={!task.isCalendarEvent} // 칸반 태스크만 드래그 가능
                                  onDragStart={!task.isCalendarEvent ? handleDragStart(task) : undefined}
                                  onDragEnd={!task.isCalendarEvent ? handleDragEnd : undefined}
                                  title={!task.isCalendarEvent ? "드래그하여 일정 변경" : "클릭하여 수정"}
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
          <div className="bg-card text-card-foreground rounded-lg shadow border border-border overflow-hidden w-full h-full flex flex-col">
            <div className="flex-1 overflow-y-auto week-view-scroll">
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '64px' }} />
                  <col style={{ width: 'calc((100% - 64px) / 7)' }} />
                  <col style={{ width: 'calc((100% - 64px) / 7)' }} />
                  <col style={{ width: 'calc((100% - 64px) / 7)' }} />
                  <col style={{ width: 'calc((100% - 64px) / 7)' }} />
                  <col style={{ width: 'calc((100% - 64px) / 7)' }} />
                  <col style={{ width: 'calc((100% - 64px) / 7)' }} />
                  <col style={{ width: 'calc((100% - 64px) / 7)' }} />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted text-muted-foreground border-b border-border">
                    <th className="border-r border-border py-2 text-center text-sm font-medium" style={{ width: '64px' }}>
                      시간
                    </th>
                    {(() => {
                      const curr = selectedDate || currentDate;
                      const weekStart = addDays(curr, -getDay(curr));
                      
                      return Array.from({length: 7}).map((_, i) => {
                        const day = addDays(weekStart, i);
                        const isCurrentDay = isToday(day);
                        
                        return (
                          <th 
                            key={i} 
                            className={`border-r border-border last:border-r-0 py-2 text-center text-sm font-medium ${
                              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-foreground'
                            } ${isCurrentDay ? 'bg-primary/10' : ''}`}
                          >
                            <div className="font-semibold">{weekDays[i]}</div>
                            <div className={`text-lg ${isCurrentDay ? 'text-primary font-bold' : ''} flex items-center justify-center gap-1`}>
                              <span>{format(day, 'd')}</span>
                              {(() => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const events = tasksByDate.get(dateKey) || [];
                                const holidayEvent = events.find(event => event.isHoliday);
                                return holidayEvent ? (
                                  <span 
                                    className="text-red-500 text-xs"
                                    title={holidayEvent.title}
                                  >
                                    {holidayEvent.title}
                                  </span>
                                ) : null;
                              })()}
                            </div>
                          </th>
                        );
                      });
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({length: 24}).map((_, hour) => (
                    <tr key={hour} className="h-16">
                      <td className="border-r border-border border-b border-border bg-muted/30 text-center align-top pt-1" style={{ width: '64px' }}>
                        <span className="text-xs text-muted-foreground">
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                      </td>
                      {(() => {
                        const curr = selectedDate || currentDate;
                        const weekStart = addDays(curr, -getDay(curr));
                        
                        return Array.from({length: 7}).map((_, dayIndex) => {
                          const day = addDays(weekStart, dayIndex);
                          const isCurrentDay = isToday(day);
                          
                          return (
                            <td 
                              key={dayIndex} 
                              className={`relative border-r border-border last:border-r-0 border-b border-border hover:bg-muted/20 transition-colors p-0 ${
                                isCurrentDay ? 'bg-primary/5' : ''
                              }`}
                              onDoubleClick={() => {
                                const dateTimeString = format(day, 'yyyy-MM-dd') + `T${hour.toString().padStart(2, '0')}:00`;
                                setActiveTab('addEvent');
                                setAddFormDate(format(day, 'yyyy-MM-dd'));
                                setNewEvent({ 
                                  ...newEvent, 
                                  startDate: dateTimeString,
                                  endDate: format(day, 'yyyy-MM-dd') + `T${(hour + 1).toString().padStart(2, '0')}:00`
                                });
                                setEditEventDialog({ show: false, event: null });
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedTask && !draggedTask.isCalendarEvent && !draggedTask.isHoliday) {
                                  handleDrop(day)(e);
                                }
                              }}
                            >
                              {/* 해당 날짜의 일정들 - 첫 번째 행(0시)에만 표시하고 절대 위치로 배치 */}
                              {hour === 0 && (() => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const events = tasksByDate.get(dateKey) || [];
                                
                                // 공휴일이 아닌 이벤트만 필터링
                                const nonHolidayEvents = events.filter(event => !event.isHoliday);
                                if (nonHolidayEvents.length === 0) return null;
                                
                                const eventsWithPosition = nonHolidayEvents.map((task, i) => {
                                  const start = task.startDate ? new Date(task.startDate) : undefined;
                                  const end = task.endDate ? new Date(task.endDate) : undefined;
                                  
                                  let topPosition = 0;
                                  let height = 64;
                                  let startMinute = 0;
                                  let endMinute = 1440;
                                  
                                  if (start && end) {
                                    const startHour = start.getHours();
                                    const startMin = start.getMinutes();
                                    startMinute = startHour * 60 + startMin;
                                    topPosition = (startHour * 64) + (startMin * 64 / 60);
                                    
                                    const endHour = end.getHours();
                                    const endMin = end.getMinutes();
                                    endMinute = endHour * 60 + endMin;
                                    
                                    const durationMinutes = endMinute - startMinute;
                                    height = Math.max(24, (durationMinutes / 60) * 64);
                                  } else if (task.dueDate) {
                                    topPosition = 4;
                                    height = 20;
                                    startMinute = 0;
                                    endMinute = 30;
                                  }
                                  
                                  return {
                                    ...task,
                                    originalIndex: i,
                                    topPosition,
                                    height,
                                    startMinute,
                                    endMinute,
                                    column: 0,
                                    totalColumns: 1
                                  };
                                });
                                
                                // 시간 순으로 정렬
                                const sortedEvents = [...eventsWithPosition].sort((a, b) => {
                                  if (a.startMinute !== b.startMinute) {
                                    return a.startMinute - b.startMinute;
                                  }
                                  return a.endMinute - b.endMinute;
                                });
                                
                                // 겹침 처리 알고리즘 - 개선된 버전
                                const finalEvents: Array<any> = [];
                                
                                // 시간 순으로 정렬된 이벤트들을 순차적으로 처리
                                for (let i = 0; i < sortedEvents.length; i++) {
                                  const currentEvent = sortedEvents[i];
                                  
                                  // 현재 이벤트와 겹치는 이미 배치된 이벤트들 찾기
                                  const conflictingEvents = finalEvents.filter(placedEvent => {
                                    // 겹침 조건: 시간대가 겹치는 경우
                                    return (currentEvent.startMinute < placedEvent.endMinute && 
                                            currentEvent.endMinute > placedEvent.startMinute);
                                  });
                                  
                                  // 사용 중인 컬럼 번호들 수집
                                  const usedColumns = new Set(conflictingEvents.map(event => event.column));
                                  
                                  // 사용되지 않은 가장 작은 컬럼 번호 찾기
                                  let column = 0;
                                  while (usedColumns.has(column)) {
                                    column++;
                                  }
                                  
                                  // 이벤트에 컬럼 정보 할당
                                  const eventWithColumn = {
                                    ...currentEvent,
                                    column,
                                    totalColumns: 1 // 임시로 1로 설정, 나중에 업데이트
                                  };
                                  
                                  finalEvents.push(eventWithColumn);
                                }
                                
                                // 겹치는 이벤트 그룹별로 totalColumns 업데이트
                                finalEvents.forEach(event => {
                                  // 현재 이벤트와 겹치는 모든 이벤트 찾기
                                  const overlappingEvents = finalEvents.filter(otherEvent => 
                                    event.startMinute < otherEvent.endMinute && 
                                    event.endMinute > otherEvent.startMinute
                                  );
                                  
                                  const maxColumn = Math.max(...overlappingEvents.map(e => e.column));
                                  event.totalColumns = maxColumn + 1;
                                });
                                
                                return finalEvents.map((processedTask) => {
                                  const { column, totalColumns, topPosition, height } = processedTask;
                                  
                                  const columnWidth = totalColumns > 1 ? `${95 / totalColumns}%` : '95%';
                                  const leftOffset = totalColumns > 1 ? `${(column * 95) / totalColumns + 2.5}%` : '2.5%';
                                  
                                  const start = processedTask.startDate ? new Date(processedTask.startDate) : undefined;
                                  const end = processedTask.endDate ? new Date(processedTask.endDate) : undefined;
                                  
                                  const timeStr = (start && end)
                                    ? `${start.getHours().toString().padStart(2,'0')}:${start.getMinutes().toString().padStart(2,'0')}`
                                    : processedTask.dueDate ? '마감' : '';
                                  
                                  return (
                                    <div
                                      key={processedTask.id + '' + processedTask.originalIndex}
                                      className={`absolute rounded px-1 py-0.5 text-xs font-medium border shadow-sm ${
                                        !processedTask.isCalendarEvent ? 'cursor-move' : 'cursor-pointer'
                                      } ${
                                        processedTask.isCalendarEvent ? getCalendarEventClasses() : getKanbanTaskClasses()
                                      }`}
                                      style={{
                                        top: `${topPosition}px`,
                                        height: `${height}px`,
                                        left: leftOffset,
                                        width: columnWidth,
                                        zIndex: 10 + column,
                                        minHeight: '20px',
                                        overflow: 'hidden',
                                        marginRight: totalColumns > 1 ? '2px' : '0px'
                                      }}
                                      onClick={() => handleEventClick(processedTask)}
                                      draggable={!processedTask.isCalendarEvent && !processedTask.isHoliday}
                                      onDragStart={!processedTask.isCalendarEvent && !processedTask.isHoliday ? handleDragStart(processedTask) : undefined}
                                      onDragEnd={!processedTask.isCalendarEvent && !processedTask.isHoliday ? handleDragEnd : undefined}
                                      title={!processedTask.isCalendarEvent ? "드래그하여 일정 변경" : "클릭하여 수정"}
                                    >
                                      <div className="font-semibold truncate text-[10px]">{processedTask.title}</div>
                                      {timeStr && height > 24 && (
                                        <div className="text-[9px] opacity-75">{timeStr}</div>
                                      )}
                                    </div>
                                  );
                                });
                              })()}
                              
                              {/* 현재 시간 표시선 (해당 시간대에만) */}
                              {hour === new Date().getHours() && isCurrentDay && (() => {
                                const now = new Date();
                                const currentMinute = now.getMinutes();
                                const currentTimePosition = (currentMinute / 60) * 100;
                                
                                return (
                                  <div
                                    className="absolute left-0 right-0 border-t-2 border-red-500 z-20"
                                    style={{ top: `${currentTimePosition}%` }}
                                  >
                                    <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                                  </div>
                                );
                              })()}
                            </td>
                          );
                        });
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {calendarView === 'day' && (
          <div className="bg-card text-card-foreground rounded-lg shadow border border-border overflow-hidden w-full h-full flex flex-col">
            <div className="border-b border-border text-center text-sm font-medium bg-muted text-muted-foreground py-2 flex items-center justify-center gap-2">
              <span>{format(selectedDate || currentDate, 'yyyy년 MM월 dd일 (E)', {locale:ko})}</span>
              {(() => {
                const dateKey = format(selectedDate || currentDate, 'yyyy-MM-dd');
                const events = tasksByDate.get(dateKey) || [];
                const holidayEvent = events.find(event => event.isHoliday);
                return holidayEvent ? (
                  <span 
                    className="text-red-500 text-sm"
                    title={holidayEvent.title}
                  >
                    {holidayEvent.title}
                  </span>
                ) : null;
              })()}
            </div>
            <div className="flex-1 overflow-y-auto day-view-scroll">
              {/* 시간대별 일정 표시 */}
              <div className="flex">
                {/* 시간 표시 열 */}
                <div className="w-16 border-r border-border bg-muted/30">
                  {Array.from({length: 24}).map((_, hour) => (
                    <div key={hour} className="h-16 border-b border-border flex items-start justify-center pt-1">
                      <span className="text-xs text-muted-foreground">
                        {hour.toString().padStart(2, '0')}:00
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* 일정 표시 영역 */}
                {(() => {
                  // 현재 날짜의 최대 겹치는 일정 수 계산
                  const dateKey = format(selectedDate || currentDate, 'yyyy-MM-dd');
                  const events = tasksByDate.get(dateKey) || [];
                  
                  let maxColumns = 1;
                  // 공휴일이 아닌 이벤트만 필터링
                  const nonHolidayEvents = events.filter(event => !event.isHoliday);
                  if (nonHolidayEvents.length > 0) {
                    const eventsWithTime = nonHolidayEvents.map(task => {
                      const start = task.startDate ? new Date(task.startDate) : undefined;
                      const end = task.endDate ? new Date(task.endDate) : undefined;
                      
                      let startMinute = 0;
                      let endMinute = 1440;
                      
                      if (start && end) {
                        startMinute = start.getHours() * 60 + start.getMinutes();
                        endMinute = startMinute + (end.getTime() - start.getTime()) / (1000 * 60);
                      }
                      
                      return { ...task, startMinute, endMinute };
                    });
                    
                    const timePoints: number[] = [];
                    eventsWithTime.forEach(event => {
                      timePoints.push(event.startMinute);
                      timePoints.push(event.endMinute);
                    });
                    
                    let maxOverlapping = 0;
                    timePoints.forEach(timePoint => {
                      const overlappingCount = eventsWithTime.filter(event => 
                        event.startMinute <= timePoint && event.endMinute > timePoint
                      ).length;
                      maxOverlapping = Math.max(maxOverlapping, overlappingCount);
                    });
                    
                    maxColumns = Math.max(1, maxOverlapping);
                  }
                  
                  // 일별뷰 컨테이너 너비는 고정
                  const containerStyle = {};
                  
                  return (
                    <div 
                      className="flex-1 relative"
                      style={containerStyle}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedTask && !draggedTask.isCalendarEvent && !draggedTask.isHoliday) {
                          handleDrop(selectedDate || currentDate)(e);
                        }
                      }}
                    >
                  {/* 시간 격자 */}
                  {Array.from({length: 24}).map((_, hour) => (
                    <div 
                      key={hour} 
                      className="h-16 border-b border-border hover:bg-muted/20 transition-colors"
                      onDoubleClick={() => {
                        const clickedDate = selectedDate || currentDate;
                        const dateTimeString = format(clickedDate, 'yyyy-MM-dd') + `T${hour.toString().padStart(2, '0')}:00`;
                        setActiveTab('addEvent');
                        setAddFormDate(format(clickedDate, 'yyyy-MM-dd'));
                        setNewEvent({ 
                          ...newEvent, 
                          startDate: dateTimeString,
                          endDate: format(clickedDate, 'yyyy-MM-dd') + `T${(hour + 1).toString().padStart(2, '0')}:00`
                        });
                        setEditEventDialog({ show: false, event: null });
                      }}
                    />
                  ))}
                  
                  {/* 일정 표시 */}
                  {(() => {
                    const dateKey = format(selectedDate || currentDate, 'yyyy-MM-dd');
                    const events = tasksByDate.get(dateKey) || [];
                    
                    // 시간대별로 일정들을 그룹화하고 겹침 처리 (공휴일 제외)
                    const processedEvents = (() => {
                      // 공휴일이 아닌 이벤트만 필터링
                      const nonHolidayEvents = events.filter(event => !event.isHoliday);
                      if (nonHolidayEvents.length === 0) return [];
                      
                      const eventsWithPosition = nonHolidayEvents.map((task, i) => {
                        const start = task.startDate ? new Date(task.startDate) : undefined;
                        const end = task.endDate ? new Date(task.endDate) : undefined;
                        
                        let topPosition = 0;
                        let height = 64;
                        let startMinute = 0;
                        let endMinute = 1440; // 하루 끝
                        
                        if (start && end) {
                          const startHour = start.getHours();
                          const startMin = start.getMinutes();
                          startMinute = startHour * 60 + startMin;
                          topPosition = (startHour * 64) + (startMin * 64 / 60);
                          
                          const endHour = end.getHours();
                          const endMin = end.getMinutes();
                          endMinute = endHour * 60 + endMin;
                          
                          const durationMinutes = endMinute - startMinute;
                          height = Math.max(32, (durationMinutes / 60) * 64);
                          
                          console.log(`[일별뷰] 일정 "${task.title}": ${startHour}:${startMin.toString().padStart(2,'0')} - ${endHour}:${endMin.toString().padStart(2,'0')} (${startMinute}-${endMinute}분)`);
                        } else if (task.dueDate) {
                          topPosition = 0;
                          height = 24 * 64; // 전체 하루
                          startMinute = 0;
                          endMinute = 1440; // 하루 종일
                        }
                        
                        return {
                          ...task,
                          originalIndex: i,
                          topPosition,
                          height,
                          startMinute,
                          endMinute,
                          column: 0,
                          totalColumns: 1
                        };
                      });
                      
                      // 시간 순으로 정렬
                      const sortedEvents = [...eventsWithPosition].sort((a, b) => {
                        if (a.startMinute !== b.startMinute) {
                          return a.startMinute - b.startMinute;
                        }
                        return a.endMinute - b.endMinute;
                      });
                      
                      // 간단한 겹침 처리 알고리즘으로 변경 (일별뷰)
                      const finalEvents: Array<any> = [];
                      
                      // 시간 순으로 정렬된 이벤트들을 순차적으로 처리
                      for (let i = 0; i < sortedEvents.length; i++) {
                        const currentEvent = sortedEvents[i];
                        
                        // 현재 이벤트와 겹치는 이미 배치된 이벤트들 찾기
                        const conflictingEvents = finalEvents.filter(placedEvent => {
                          // 겹침 조건: 시간대가 겹치는 경우
                          return (currentEvent.startMinute < placedEvent.endMinute && 
                                  currentEvent.endMinute > placedEvent.startMinute);
                        });
                        
                        // 사용 중인 컬럼 번호들 수집
                        const usedColumns = new Set(conflictingEvents.map(event => event.column));
                        
                        // 사용되지 않은 가장 작은 컬럼 번호 찾기
                        let column = 0;
                        while (usedColumns.has(column)) {
                          column++;
                        }
                        
                        // 이벤트에 컬럼 정보 할당
                        const eventWithColumn = {
                          ...currentEvent,
                          column,
                          totalColumns: 1 // 임시로 1로 설정, 나중에 업데이트
                        };
                        
                        finalEvents.push(eventWithColumn);
                      }
                      
                      // 겹치는 이벤트 그룹별로 totalColumns 업데이트
                      finalEvents.forEach(event => {
                        // 현재 이벤트와 겹치는 모든 이벤트 찾기
                        const overlappingEvents = finalEvents.filter(otherEvent => 
                          event.startMinute < otherEvent.endMinute && 
                          event.endMinute > otherEvent.startMinute
                        );
                        
                        const maxColumn = Math.max(...overlappingEvents.map(e => e.column));
                        event.totalColumns = maxColumn + 1;
                      });
                      
                      return finalEvents;
                    })();
                    
                    return processedEvents.map((processedTask) => {
                      const { column, totalColumns, topPosition, height } = processedTask;
                      
                      // 디버깅용 로그
                      if (totalColumns > 1) {
                        console.log(`일정 "${processedTask.title}": column=${column}, totalColumns=${totalColumns}`);
                      }
                      
                      // 컬럼 너비 계산 (겹치는 일정이 있으면 나누어서 표시)
                      const columnWidth = totalColumns > 1 ? `${85 / totalColumns}%` : '85%';
                      const leftOffset = totalColumns > 1 ? `${(column * 85) / totalColumns + 7.5}%` : '7.5%';
                      
                      const start = processedTask.startDate ? new Date(processedTask.startDate) : undefined;
                      const end = processedTask.endDate ? new Date(processedTask.endDate) : undefined;
                      
                      const timeStr = (start && end)
                        ? `${start.getHours().toString().padStart(2,'0')}:${start.getMinutes().toString().padStart(2,'0')}~${end.getHours().toString().padStart(2,'0')}:${end.getMinutes().toString().padStart(2,'0')}`
                        : processedTask.dueDate ? '하루 종일' : '';
                      
                      return (
                        <div
                          key={processedTask.id + '' + processedTask.originalIndex}
                          className={`absolute rounded px-2 py-1 text-xs font-medium border-2 shadow-sm ${
                            processedTask.isHoliday ? 'cursor-default' : 
                            !processedTask.isCalendarEvent ? 'cursor-move' : 'cursor-pointer'
                          } ${
                            processedTask.isCalendarEvent ? getCalendarEventClasses() : getKanbanTaskClasses()
                          }`}
                          style={{
                            top: `${topPosition}px`,
                            height: `${height}px`,
                            left: leftOffset,
                            width: columnWidth,
                            zIndex: 10 + column,
                            minHeight: '32px',
                            overflow: 'hidden',
                            marginRight: totalColumns > 1 ? '4px' : '0px'
                          }}
                          onClick={() => handleEventClick(processedTask)}
                          draggable={!processedTask.isCalendarEvent && !processedTask.isHoliday}
                          onDragStart={!processedTask.isCalendarEvent && !processedTask.isHoliday ? handleDragStart(processedTask) : undefined}
                          onDragEnd={!processedTask.isCalendarEvent && !processedTask.isHoliday ? handleDragEnd : undefined}
                          title={processedTask.isHoliday ? "공휴일" : !processedTask.isCalendarEvent ? "드래그하여 일정 변경" : "클릭하여 수정"}
                        >
                          <div className="font-semibold truncate">{processedTask.title}</div>
                          {timeStr && (
                            <div className="text-[10px] opacity-75 mt-0.5">{timeStr}</div>
                          )}
                          {processedTask.description && height > 48 && (
                            <div className="text-[10px] opacity-60 mt-1 line-clamp-2">
                              {processedTask.description}
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                  
                  {/* 현재 시간 표시선 (오늘인 경우에만) */}
                  {isToday(selectedDate || currentDate) && (() => {
                    const now = new Date();
                    const currentHour = now.getHours();
                    const currentMinute = now.getMinutes();
                    const currentTimePosition = (currentHour * 64) + (currentMinute * 64 / 60);
                    
                    return (
                      <div
                        className="absolute left-0 right-0 border-t-2 border-red-500 z-20"
                        style={{ top: `${currentTimePosition}px` }}
                      >
                        <div className="absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full"></div>
                        <div className="absolute right-2 -top-3 text-xs text-red-500 font-medium">
                          {now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}
                        </div>
                      </div>
                    );
                  })()}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 우측 패널 */}
      <aside className="w-80 border-l border-border bg-card text-card-foreground flex flex-col p-4 overflow-y-auto">
        {/* 일정 추가 폼: activeTab이 'addEvent'일 때만 표시 */}
        {activeTab === 'addEvent' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-foreground">새 일정 추가</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setActiveTab('none');
                setNewEvent({ title: '', description: '', startDate: '', endDate: '', projectId: '' });
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">제목</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                  placeholder="일정 제목을 입력하세요"
                  required
                />
              </div>
              
              {/* 설명 */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">설명</label>
                <textarea
                  value={newEvent.description}
                  onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground resize-none"
                  rows={3}
                  placeholder="일정 설명을 입력하세요"
                />
              </div>
              
              {/* 시작 시간 */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">시작 시간</label>
                <input
                  type="datetime-local"
                  value={newEvent.startDate}
                  onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              
              {/* 종료 시간 */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">종료 시간</label>
                <input
                  type="datetime-local"
                  value={newEvent.endDate}
                  onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              
              {/* 버튼 */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={() => {
                  addCalendarEvent(newEvent);
                  setActiveTab('none');
                  setNewEvent({ title: '', description: '', startDate: '', endDate: '', projectId: '' });
                }}>
                  추가
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  setActiveTab('none');
                  setNewEvent({ title: '', description: '', startDate: '', endDate: '', projectId: '' });
                }}>
                  취소
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* 일정 수정 폼: activeTab이 'editEvent'일 때만 표시 */}
        {activeTab === 'editEvent' && editEventDialog.event && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-foreground">일정 수정</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setEditEventDialog({ show: false, event: null });
                setActiveTab('none');
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">제목</label>
                <input
                  type="text"
                  value={editingEvent.title}
                  onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
                  placeholder="일정 제목을 입력하세요"
                  required
                />
              </div>
              
              {/* 설명 */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">설명</label>
                <textarea
                  value={editingEvent.description}
                  onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground resize-none"
                  rows={3}
                  placeholder="일정 설명을 입력하세요"
                />
              </div>
              
              {/* 시작 시간 */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">시작 시간</label>
                <input
                  type="datetime-local"
                  value={editingEvent.startDate}
                  onChange={e => setEditingEvent({ ...editingEvent, startDate: e.target.value })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              
              {/* 종료 시간 */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">종료 시간</label>
                <input
                  type="datetime-local"
                  value={editingEvent.endDate}
                  onChange={e => setEditingEvent({ ...editingEvent, endDate: e.target.value })}
                  className="w-full bg-transparent border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              
              {/* 버튼 */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1" onClick={() => updateCalendarEvent(editingEvent)}>
                  수정
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                  setEditEventDialog({ show: false, event: null });
                  setActiveTab('none');
                }}>
                  취소
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleDeleteClick(editingEvent.id)}>
                  삭제
                </Button>
              </div>
              
              {/* 일정 생성자 정보 표시 */}
              <div className="pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  {editEventDialog.event?.user ? (
                    <>
                      <span className="font-medium">생성자:</span> {editEventDialog.event.user.name}
                    </>
                  ) : editEventDialog.event?.userId ? (
                    <>
                      <span className="font-medium">생성자 ID:</span> {editEventDialog.event.userId}
                    </>
                  ) : (
                    <span className="font-medium">생성자 정보 없음</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* 태스크 상세 정보: activeTab이 'taskDetail'일 때만 표시 */}
        {activeTab === 'taskDetail' && selectedTask && (
          <div className="mb-6 border-b pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">태스크 상세 정보</h3>
              <Button variant="ghost" size="sm" onClick={() => {
                setActiveTab('none');
                setSelectedTask(null);
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-4">
              {/* 제목 */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">제목</label>
                <div className="mt-1 text-base font-semibold">{selectedTask.title}</div>
              </div>
              
              {/* 설명 */}
              {selectedTask.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">설명</label>
                  <div className="mt-1 text-sm text-foreground whitespace-pre-wrap">{selectedTask.description}</div>
                </div>
              )}
              
              {/* 상태 */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">상태</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    !mounted ? 'bg-gray-100 text-gray-700' : theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {selectedTask.status === 'todo' ? '할 일' : 
                     selectedTask.status === 'in-progress' ? '진행 중' : 
                     selectedTask.status === 'done' ? '완료' : '검토'}
                  </span>
                </div>
              </div>
              
              {/* 우선순위 */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">우선순위</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    !mounted ? (
                      selectedTask.priority === 'high' ? 'bg-red-100 text-red-700' :
                      selectedTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    ) : (
                      selectedTask.priority === 'high' ? 
                        (theme === 'dark' ? 'bg-red-900/20 text-red-400' : 'bg-red-100 text-red-700') :
                      selectedTask.priority === 'medium' ? 
                        (theme === 'dark' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700') :
                        (theme === 'dark' ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                    )
                  }`}>
                    {selectedTask.priority === 'high' ? '높은 우선순위' : 
                     selectedTask.priority === 'medium' ? '중간 우선순위' : '낮은 우선순위'}
                  </span>
                </div>
              </div>
              
              {/* 마감일 */}
              {selectedTask.dueDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">마감일</label>
                  <div className="mt-1 text-sm">{format(new Date(selectedTask.dueDate), 'yyyy년 MM월 dd일 (E)', { locale: ko })}</div>
                </div>
              )}
              
              {/* 생성일 */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">생성일</label>
                <div className="mt-1 text-sm">{format(new Date(selectedTask.createdAt), 'yyyy년 MM월 dd일 (E)', { locale: ko })}</div>
              </div>
              
              {/* 프로젝트 */}
              {selectedTask.project && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">프로젝트</label>
                  <div className="mt-1 text-sm">{selectedTask.project.name}</div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* 기존 우측 안내/예정된 회의/단축키 안내 - 탭이 활성화되지 않았을 때만 표시 */}
        {activeTab === 'none' && (
          <>
            <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground mb-3">예정된 회의</h3>
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                오늘 예정된 회의가 없습니다
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground mb-3">캘린더 기능</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">날짜에 메뉴</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border text-muted-foreground">더블클릭</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">일정 편집 메뉴</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border text-muted-foreground">클릭</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">칸반일정 이동</span>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border text-muted-foreground">드래그</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">월별 뷰</span>
                  {/* <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border text-muted-foreground">M</kbd>
                  </div> */}
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">주별 뷰</span>
                  {/* <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border text-muted-foreground">W</kbd>
                  </div> */}
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">일별 뷰</span>
                  {/* <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border text-muted-foreground">D</kbd>
                  </div> */}
                </div>
              </div>
            </div>
            
            {/* <div className="mb-6">
              <h3 className="text-sm font-medium text-foreground mb-3">캘린더 기능</h3>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground py-1">
                  • 프로젝트별 일정 관리
                </div>
                <div className="text-xs text-muted-foreground py-1">
                  • 예약되지 않은 업무 관리
                </div>
                <div className="text-xs text-muted-foreground py-1">
                  • 테마별 색상 구분
                </div>
                <div className="text-xs text-muted-foreground py-1">
                  • 드래그 앤 드롭 일정 이동
                </div>
                <div className="text-xs text-muted-foreground py-1">
                  • 월/주/일 뷰 전환
                </div>
              </div>
            </div> */}
            
            {/* <div className="p-3 bg-muted/20 rounded-lg border-l-2 border-primary/50"></div> */}
            <div className="p-3 bg-muted/20 rounded-lg border-primary/50 ">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">팁:</span> 시간 설정 없이 일정을 만들면 현재 시간으로 자동 설정됩니다
              </p>
            </div>
          </>
        )}
      </aside>

      {/* 예약되지 않은 업무 사이드바 (드래그 앤 드롭) */}
      {activeTab === 'unscheduled' && (
        <div 
          className="fixed top-0 bottom-0 right-0 w-80 bg-card text-card-foreground shadow-lg border-l border-border p-4 transition-transform duration-300 z-20 mt-0 flex flex-col"
          style={{marginTop:0}}
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.classList.add('bg-muted'); // 드래그 오버 시 배경색 변경
          }}
          onDragLeave={(e) => {
            e.currentTarget.classList.remove('bg-muted');
          }}
          onDrop={(e) => {
            e.currentTarget.classList.remove('bg-muted');
            handleDropToSidebar(e);
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-foreground">예약되지 않은 업무</h3>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab('none')}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* 드래그 안내 메시지 */}
          <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              💡 업무를 클릭하여 상세 정보를 보거나, 캘린더의 날짜로 드래그하여 일정을 설정하세요
            </p>
          </div>
          
          {/* 스크롤 가능한 업무 목록 */}
          <div className="flex-1 overflow-y-auto unscheduled-tasks-scrollbar">
            <div className="space-y-2">
              {sidebarTasks.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">
                  예약되지 않은 업무가 없습니다
                </div>
              ) : (
                sidebarTasks.map(task => {
                  // 테마에 따른 칸반 태스크 색상 적용
                  const taskClasses = getKanbanTaskClasses();
                  const statusBg = !mounted ? 'bg-gray-100' : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100';
                  const statusText = !mounted ? 'text-gray-700' : theme === 'dark' ? 'text-gray-300' : 'text-gray-700';
                  const priorityText = 'text-muted-foreground';

                  return (
                    <div
                      key={task.id}
                      className={`${taskClasses} rounded-md p-3 shadow-sm cursor-move border transition-all duration-200 hover:shadow-md`}
                      draggable
                      onDragStart={handleDragStart(task)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        // 드래그 시작 후 클릭 이벤트가 발생하지 않도록 방지
                        if (!e.defaultPrevented) {
                          handleEventClick(task);
                        }
                      }}
                      title="클릭하여 상세 정보 보기 또는 캘린더로 드래그하여 일정 설정"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${statusBg} ${statusText}`}>
                          {task.status === 'todo' ? '할 일' : 
                           task.status === 'in-progress' ? '진행 중' : 
                           task.status === 'done' ? '완료' : '검토'}
                        </span>
                      </div>
                      <div className={`text-xs ${priorityText}`}>
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
      )}

      {/* 삭제 확인 모달 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setEventToDelete(null);
        }}
        onDelete={handleConfirmDelete}
        title="일정을 삭제하시겠습니까?"
        description="삭제된 일정은 복구할 수 없습니다."
      />

      {/* 예약되지 않은 업무 사이드바 스크롤바 스타일 */}
      <style jsx global>{`
        /* 예약되지 않은 업무 스크롤바 스타일 */
        html.dark .unscheduled-tasks-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        html:not(.dark) .unscheduled-tasks-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        html.dark .unscheduled-tasks-scrollbar::-webkit-scrollbar-track {
          background: #1f2937; /* gray-800 */
          border-radius: 3px;
        }
        html:not(.dark) .unscheduled-tasks-scrollbar::-webkit-scrollbar-track {
          background: #f3f4f6; /* gray-100 */
          border-radius: 3px;
        }
        html.dark .unscheduled-tasks-scrollbar::-webkit-scrollbar-thumb {
          background-color: #4b5563; /* gray-600 */
          border-radius: 3px;
          border: 1px solid #1f2937; /* gray-800, creates padding */
        }
        html:not(.dark) .unscheduled-tasks-scrollbar::-webkit-scrollbar-thumb {
          background-color: #d1d5db; /* gray-300 */
          border-radius: 3px;
          border: 1px solid #f3f4f6; /* gray-100, creates padding */
        }
        html.dark .unscheduled-tasks-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #6b7280; /* gray-500 */
        }
        html:not(.dark) .unscheduled-tasks-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #9ca3af; /* gray-400 */
        }
        html.dark .unscheduled-tasks-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #4b5563 #1f2937; /* thumb track for Firefox */
        }
        html:not(.dark) .unscheduled-tasks-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db #f3f4f6; /* thumb track for Firefox */
        }
      `}</style>
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

// CalendarPageContent 컴포넌트를 Suspense로 감싸는 기본 export
export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center flex flex-col items-center">
          <div className="relative w-24 h-24 text-blue-500">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-current border-solid rounded-full opacity-20 border-blue-500"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-current border-solid rounded-full animate-spin border-t-transparent"></div>
            </div>
          </div>
          <p className="text-lg font-medium mt-4">캘린더 로딩 중...</p>
          <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
        </div>
      </div>
    }>
      <CalendarPageContent />
    </Suspense>
  );
}