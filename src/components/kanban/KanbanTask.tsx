"use client";

import { Task } from "./KanbanBoard";
import { useDrag } from "./useDragDrop";
import { CalendarIcon, UserIcon, ArrowUp, ArrowDown, Minus, User } from "lucide-react";
import { useState, useEffect } from "react";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { useUsers } from "@/app/contexts/UserContext";

interface KanbanTaskProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

// HTML 태그를 제거하는 함수
const stripHtmlTags = (html: string): string => {
  if (!html) return '';
  
  // HTML 파싱용 임시 요소 생성 (클라이언트 사이드)
  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  
  // 서버 사이드 렌더링 시: 간단한 정규식으로 태그 제거
  return html.replace(/<[^>]*>|&[^;]+;/g, '');
};

export function KanbanTask({ task, onUpdate, onDelete }: KanbanTaskProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { isDragging, setNodeRef } = useDrag({
    id: task.id,
  });
  const { getUserName } = useUsers();
  const [assigneeName, setAssigneeName] = useState<string>("");

  // 담당자 이름 가져오기
  useEffect(() => {
    if (task.assignee) {
      const fetchName = async () => {
        const name = await getUserName(task.assignee as string);
        setAssigneeName(name);
      };
      fetchName();
    }
  }, [task.assignee, getUserName]);

  // 우선순위에 따른 색상 및 아이콘 설정
  const getPriorityIcon = () => {
    switch (task.priority) {
      case 'high':
        return <ArrowUp size={20} className="text-red-500" />;
      case 'medium':
        return <Minus size={20} className="text-yellow-500" />;
      case 'low':
        return <ArrowDown size={20} className="text-green-500" />;
      default:
        return <Minus size={20} className="text-yellow-500" />;
    }
  };

  // 설명에서 HTML 태그 제거
  const cleanDescription = task.description ? stripHtmlTags(task.description) : '';

  const handleClick = () => {
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (onDelete) {
      onDelete(taskId);
      handleCloseDetail();
    }
  };

  return (
    <>
      <div
        ref={setNodeRef}
        onClick={handleClick}
        className={`bg-white p-3 rounded-md border border-gray-200 cursor-pointer hover:shadow-md transition-all mb-2 h-auto min-h-[80px] ${
          isDragging ? "opacity-50 scale-95" : ""
        } ${task.status === 'done' ? 'border-l-4 border-l-green-500' : ''}`}
      >
        <h4 className="font-medium text-gray-800 mb-2 line-clamp-2 text-base">{task.title}</h4>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            {getPriorityIcon()}
            
            {task.assignee ? (
              <div className="flex items-center">
                <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center mr-1.5">
                  <User size={14} className="text-gray-600" />
                </div>
                <span className="text-sm text-gray-600">{assigneeName}</span>
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full border border-dashed border-gray-300 flex items-center justify-center">
                <User size={14} className="text-gray-400" />
              </div>
            )}
            
            {task.dueDate && (
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
              </div>
            )}
          </div>
          
          {task.status === 'done' && (
            <div className="rounded-full bg-green-100 p-1">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      </div>

      <TaskDetailDialog
        task={task}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onUpdate={onUpdate}
        onDelete={handleDeleteTask}
      />
    </>
  );
} 