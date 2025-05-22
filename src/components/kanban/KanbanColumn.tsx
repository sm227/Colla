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
  loading: boolean;
  theme?: "light" | "dark";
}

export function KanbanColumn({ 
  title, 
  tasks, 
  status, 
  updateTaskStatus,
  onTaskClick,
  color = 'gray',
  onTaskDelete,
  onAddTask,
  loading,
  theme = "light"
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
    // 로딩이 완료되고 tasks가 있을 때만 실행
    if (!loading && tasks.length > 0) {
      setTasksLength(tasks.length);
      
      // 첫 마운트 시에는 실행하지 않음
      if (isFirstMount.current) {
        isFirstMount.current = false;
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
          if (wasTaskAdded && !isFirstMount.current) {
            setIsAddingTask(true);
          }
        }, 100);
      }
    }
  }, [tasks, loading, tasksLength, lastScrollPosition, columnElementId]);

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
    // 다크 모드에서는 모두 동일한 헤더 배경(어두운 회색)
    if (theme === 'dark') {
      return {
        bg: 'bg-[#353538]',
        text: 'text-gray-300',
        indicator: color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : color === 'purple' ? 'bg-purple-500' : color === 'red' ? 'bg-red-500' : 'bg-gray-500'
      };
    } else {
      // 라이트 모드에서는 모두 흰색 헤더
      return {
        bg: 'bg-white',
        text: 'text-gray-800',
        indicator: color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-green-500' : color === 'yellow' ? 'bg-yellow-500' : color === 'purple' ? 'bg-purple-500' : color === 'red' ? 'bg-red-500' : 'bg-gray-500'
      };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div
      ref={setNodeRef}
      id={columnElementId}
      className={`${theme === 'dark' ? 'bg-[#353538] border-gray-700' : 'bg-white border-gray-200'} rounded-lg border shadow-sm overflow-hidden flex flex-col ${
        isOver ? "ring-2 ring-blue-500" : ""
      }`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className={`${colorClasses.bg} px-4 py-3 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${colorClasses.indicator} mr-2`}></div>
            <h3 className={`font-medium ${colorClasses.text}`}>{title}</h3>
          </div>
          <span className={`${colorClasses.bg} ${colorClasses.text} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} rounded-full px-2 py-0.5 text-xs font-medium`}>
            {tasks.length}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col gap-1 p-3 flex-grow">
        {/* 작업 목록 */}
        {tasks.map((task) => (
          <div key={task.id} onClick={() => onTaskClick(task)}>
            <KanbanTask 
              task={task} 
              onUpdate={(updatedTask) => {
                // 업데이트 로직
              }}
              onDelete={onTaskDelete}
              theme={theme}
            />
          </div>
        ))}
        
        {/* 작업 추가 입력창 (하단에 배치) */}
        {isAddingTask ? (
          <div 
            ref={inputContainerRef}
            className={`mt-2 border ${theme === 'dark' ? 'border-blue-700 bg-[#2A2A2C]' : 'border-blue-300 bg-white'} rounded-md shadow-sm focus-within:border-blue-500`}
          >
            <input
              ref={inputRef}
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="새 작업을 입력하세요"
              className={`w-full px-3 py-2 rounded-md outline-none ${theme === 'dark' ? 'bg-[#2A2A2C] text-gray-200 placeholder:text-gray-500' : 'bg-white'}`}
            />
            <div className="flex justify-end p-2 border-t">
              <button
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskTitle("");
                }}
                className={`mr-2 px-3 py-1 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} rounded`}
              >
                취소
              </button>
              <button
                onClick={handleQuickAddTask}
                className={`px-3 py-1 text-sm text-white ${newTaskTitle.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'} rounded`}
                disabled={!newTaskTitle.trim()}
              >
                추가
              </button>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setIsAddingTask(true)}
            variant="ghost"
            size="sm"
            className={`w-full mt-2 justify-start text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Plus className="h-4 w-4 mr-1" />
            작업 추가
          </Button>
        )}
      </div>
    </div>
  );
}