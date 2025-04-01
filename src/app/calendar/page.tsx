"use client";

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, differenceInDays, getDay, addDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useProject } from "@/app/contexts/ProjectContext";

interface Task {
  id: string;
  title: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
  dueDate?: Date;
  isAllDay?: boolean;
  createdAt: Date;
}

interface CalendarTask extends Task {
  startPosition: number; // 시작 날짜의 위치 (인덱스)
  duration: number;     // 기간 (일수)
  row: number;          // 행 위치 (겹치는 태스크 처리용)
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);
  const { currentProject } = useProject();

  // 태스크 가져오기
  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentProject?.id) return;
      
      try {
        const response = await fetch(`/api/projects/${currentProject.id}/tasks`);
        if (!response.ok) throw new Error('태스크를 가져오는데 실패했습니다.');
        const data = await response.json();
        setTasks(data);
      } catch (error) {
        console.error('태스크 로딩 오류:', error);
      }
    };

    fetchTasks();
  }, [currentProject?.id]);

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
  const calendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  // 캘린더에 표시할 태스크 계산
  useEffect(() => {
    if (tasks.length === 0) return;

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
    setCalendarTasks(tasksWithRows);
  }, [tasks, monthStart, monthEnd, firstDayOfMonth, lastDayOfMonth]);

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

  return (
    <div className="p-4">
      <div className="mx-auto max-w-6xl">
        {/* 캘린더 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">
            {format(currentDate, 'yyyy년 MM월', { locale: ko })}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day, index) => (
            <div
              key={day}
              className={`text-center py-2 font-semibold text-sm
                ${index === 0 ? 'text-red-500' : index === 6 ? 'text-blue-500' : 'text-gray-600'}`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        <div className="relative">
          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 border-b border-l border-gray-200">
            {calendarDays.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const isSelected = selectedDate && isSameDay(selectedDate, day);
              const isWeekend = index % 7 === 0 || index % 7 === 6;

              return (
                <div
                  key={day.toString()}
                  className={`
                    min-h-[90px] p-2 border-r border-t border-gray-200 relative
                    ${!isCurrentMonth ? 'bg-gray-50' : ''}
                    ${isSelected ? 'bg-blue-50' : ''}
                    ${isCurrentDay ? 'ring-2 ring-blue-500 ring-inset' : ''}
                  `}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={`
                    text-sm font-medium
                    ${!isCurrentMonth ? 'text-gray-400' : ''}
                    ${isCurrentDay ? 'text-blue-600' : ''}
                    ${isWeekend && isCurrentMonth ? (index % 7 === 0 ? 'text-red-500' : 'text-blue-500') : ''}
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
                ? 'bg-gray-200' 
                : task.status === 'in-progress' 
                  ? 'bg-blue-200' 
                  : 'bg-green-200';
              
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
                const rowHeight = 24; // 각 태스크 행의 높이
                const top = currentRow * 90 + 30 + task.row * rowHeight;
                
                // 세그먼트 추가
                taskSegments.push(
                  <div 
                    key={`${task.id}-segment-${taskSegments.length}`}
                    className={`absolute ${bgColor} ${textColor} rounded-sm border ${borderColor} px-2 py-0.5 
                      text-xs overflow-hidden shadow-sm pointer-events-auto cursor-pointer`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      top: `${top}px`,
                      height: `${rowHeight - 4}px`,
                      zIndex: 10
                    }}
                    title={`${task.title} (${format(new Date(task.createdAt), 'yyyy-MM-dd')} ~ ${task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''})`}
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
    </div>
  );
}