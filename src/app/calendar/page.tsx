"use client";

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns';
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

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
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
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

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

  // 해당 날짜의 태스크 가져오기
  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      const taskCreatedAt = new Date(task.createdAt);
      
      // 마감일이 있는 경우: 생성일부터 마감일까지 표시
      if (task.dueDate) {
        const taskDue = new Date(task.dueDate);
        return date >= taskCreatedAt && date <= taskDue;
      }
      
      // 마감일이 없는 경우: 생성일에만 표시
      return isSameDay(taskCreatedAt, date);
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* 캘린더 헤더 */}
        <div className="flex items-center justify-between mb-6">
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

        {/* 캘린더 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {/* 요일 헤더 */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center py-2 font-semibold text-gray-600"
            >
              {day}
            </div>
          ))}

          {/* 날짜 그리드 */}
          {days.map((day) => {
            const isSelected = selectedDate && isSameDay(selectedDate, day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);
            const dayTasks = getTasksForDate(day);

            return (
              <div
                key={day.toString()}
                className={`
                  min-h-[100px] p-2 border border-gray-200
                  ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
                  ${isSelected ? 'border-blue-500' : ''}
                  ${isCurrentDay ? 'bg-blue-50' : ''}
                `}
                onClick={() => setSelectedDate(day)}
              >
                <div className={`
                  text-sm font-medium
                  ${!isCurrentMonth ? 'text-gray-400' : ''}
                  ${isCurrentDay ? 'text-blue-600' : ''}
                  ${isSelected ? 'text-blue-500' : ''}
                `}>
                  {format(day, 'd')}
                </div>
                
                {/* 태스크 표시 */}
                <div className="mt-1 space-y-1">
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`
                        text-xs p-1 rounded mb-1 cursor-pointer hover:opacity-80
                        ${task.status === 'todo' ? 'bg-gray-100 text-gray-700' :
                          task.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'}
                      `}
                      title={`생성일: ${format(new Date(task.createdAt), 'yyyy-MM-dd')}${
                        task.dueDate ? `\n마감일: ${format(new Date(task.dueDate), 'yyyy-MM-dd')}` : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{task.title}</span>
                        {task.dueDate && isSameDay(new Date(task.dueDate), day) && (
                          <span className="text-red-500 text-[10px] ml-1">마감</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 