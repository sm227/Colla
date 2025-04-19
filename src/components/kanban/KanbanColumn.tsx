"use client";

import { useState, KeyboardEvent, useRef, useEffect } from "react";
import { KanbanTask } from "./KanbanTask";
import { Task, TaskStatus } from "./KanbanBoard";
import { useDrop } from "./useDragDrop";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  status: TaskStatus;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
  color?: 'gray' | 'blue' | 'yellow' | 'green' | 'purple' | 'red';
  onTaskDelete?: (taskId: string) => void; 
  onAddTask?: (task: Omit<Task, "id">) => void;
}

export function KanbanColumn({ 
  title, 
  tasks, 
  status, 
  updateTaskStatus,
  onTaskClick,
  color = 'gray',
  onTaskDelete,
  onAddTask
}: KanbanColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isHovering, setIsHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);
  const [tasksLength, setTasksLength] = useState(tasks.length);
  const isFirstMount = useRef(true);
  const isAddingTaskFromButton = useRef(false);
  
  // 고유한 컬럼 ID 생성
  const columnElementId = `kanban-column-${status}`;
  
  // 작업 개수가 변경되면 스크롤 위치 복원 및 작업 추가 버튼 클릭
  useEffect(() => {
    // 첫 마운트 시에는 실행하지 않음
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setTasksLength(tasks.length);
      return;
    }
    
    if (tasks.length !== tasksLength) {
      const wasTaskAdded = tasks.length > tasksLength;
      setTasksLength(tasks.length);
      
      // 스크롤 위치 복원 - UI 업데이트 후 실행되도록 지연
      setTimeout(() => {
        const columnElement = document.getElementById(columnElementId);
        if (columnElement) {
          columnElement.scrollTop = lastScrollPosition;
        }
        
        // 작업이 추가된 직후에 작업 추가 버튼 자동 클릭 복원
        // 단, 첫 마운트가 아닌 경우에만
        if (wasTaskAdded && !isFirstMount.current) {
          setIsAddingTask(true);
        }
      }, 100);
    }
  }, [tasks.length, tasksLength, lastScrollPosition, columnElementId]);

  // 드롭 영역 설정
  const { isOver, setNodeRef } = useDrop({
    onDrop: (taskId: string) => {
      updateTaskStatus(taskId, status);
    },
  });
  
  const handleQuickAddTask = async () => {
    if (!newTaskTitle.trim()) {
      return;
    }
    
    try {
      // 현재 스크롤 위치 저장
      const columnElement = document.getElementById(columnElementId);
      if (columnElement) {
        setLastScrollPosition(columnElement.scrollTop);
      }
      
      if (onAddTask) {
        // onAddTask 함수 호출 (비동기)
        await onAddTask({
          title: newTaskTitle,
          description: "",
          status: status,
          priority: "medium", 
        });
      }
    } catch (error) {
      console.error("작업 추가 중 오류 발생:", error);
    } finally {
      // 입력 필드 초기화
      setNewTaskTitle("");
      
      // 입력창 닫기 (작업 추가 버튼은 useEffect에서 자동 클릭됨)
      setIsAddingTask(false);
    }
  };
  
  // 키보드 이벤트 처리 함수
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAddTask();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAddingTask(false);
      setNewTaskTitle("");
    }
  };
  
  // 보드 밖 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isAddingTask && 
        inputContainerRef.current && 
        !inputContainerRef.current.contains(event.target as Node)
      ) {
        setIsAddingTask(false);
        setNewTaskTitle("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAddingTask]);

  // 입력창이 활성화되면 자동으로 포커스
  useEffect(() => {
    if (isAddingTask && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingTask]);

  // 컴포넌트 마운트 시 isAddingTask를 false로 명시적 설정
  useEffect(() => {
    setIsAddingTask(false);
  }, []);

  // 컬럼 헤더 색상 설정
  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-100',
          text: 'text-blue-800',
          indicator: 'bg-blue-500'
        };
      case 'green':
        return {
          bg: 'bg-green-100',
          text: 'text-green-800',
          indicator: 'bg-green-500'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          indicator: 'bg-yellow-500'
        };
      case 'purple':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          indicator: 'bg-purple-500'
        };
      case 'red':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          indicator: 'bg-red-500'
        };
      case 'gray':
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          indicator: 'bg-gray-500'
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div
      ref={setNodeRef}
      id={columnElementId}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col ${
        isOver ? "ring-2 ring-blue-500" : ""
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className={`${colorClasses.bg} px-4 py-3 border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${colorClasses.indicator} mr-2`}></div>
            <h3 className={`font-medium ${colorClasses.text}`}>{title}</h3>
          </div>
          <span className={`${colorClasses.bg} ${colorClasses.text} border border-gray-200 rounded-full px-2 py-0.5 text-xs font-medium`}>
            {tasks.length}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 p-3 flex-grow">
        {/* 작업 목록 */}
        {tasks.map((task) => (
          <div key={task.id} onClick={() => onTaskClick(task)}>
            <KanbanTask 
              task={task} 
              onUpdate={(updatedTask) => {
                // 업데이트 로직
              }}
              onDelete={onTaskDelete}
            />
          </div>
        ))}
        
        {/* 작업 추가 입력창 (하단에 배치) */}
        {isAddingTask ? (
          <div 
            ref={inputContainerRef}
            className="mt-2 border border-blue-300 bg-white rounded-md shadow-sm focus-within:border-blue-500"
          >
            <input
              ref={inputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="무엇을 완료해야 합니까?"
              className="w-full p-2 text-sm border-none rounded focus:outline-none placeholder-gray-500 font-medium"
              autoFocus
            />
            <div className="px-2 py-1 text-xs text-gray-400 flex items-center justify-between">
              <span className="text-blue-600 cursor-pointer" onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle("");
              }}>
                취소
              </span>
              <span className="inline-flex items-center">
                <svg className="w-3 h-3 mr-1 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M15 6l6 6-6 6" />
                </svg>
                ENTER
              </span>
            </div>
          </div>
        ) : (
          // 작업 추가 버튼 (호버 시에만 표시)
          <div className="mt-2 h-10 flex items-center">
            <Button
              type="button"
              variant="ghost"
              className={`w-full justify-start text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-opacity duration-200 ${
                isHovering ? 'opacity-100' : 'opacity-0'
              }`}
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="text-sm">작업 추가</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}