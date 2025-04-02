"use client";

import { Task } from "./KanbanBoard";
import { useDrag } from "./useDragDrop";
import { CalendarIcon, UserIcon, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { TaskDetailDialog } from "./TaskDetailDialog";
import { useUsers } from "@/app/contexts/UserContext";

interface KanbanTaskProps {
  task: Task;
  onUpdate: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

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
  const priorityConfig = {
    low: {
      classes: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3 text-green-600 mr-1" />,
      label: "낮은 우선순위"
    },
    medium: {
      classes: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: <Clock className="h-3 w-3 text-yellow-600 mr-1" />,
      label: "중간 우선순위"
    },
    high: {
      classes: "bg-red-50 text-red-700 border-red-200",
      icon: <AlertCircle className="h-3 w-3 text-red-600 mr-1" />,
      label: "높은 우선순위"
    }
  };

  // 해당 작업의 우선순위 설정 가져오기
  const prioritySettings = priorityConfig[task.priority];

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
        className={`bg-white p-3 rounded-md border border-gray-200 cursor-pointer hover:shadow-md transition-all ${
          isDragging ? "opacity-50 scale-95" : ""
        } ${task.status === 'done' ? 'border-l-4 border-l-green-500' : ''}`}
      >
        <div className="mb-2">
          <h4 className="font-medium text-gray-800 mb-1">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">{task.description}</p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border flex items-center ${
              prioritySettings.classes
            }`}
          >
            {prioritySettings.icon}
            {prioritySettings.label}
          </span>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {task.dueDate && (
              <div className="flex items-center">
                <CalendarIcon className="h-3 w-3 mr-1 text-gray-400" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
        
        {task.assignee && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1 text-xs text-gray-500">
            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-[10px]">
              {assigneeName ? assigneeName.charAt(0).toUpperCase() : "?"}
            </div>
            <span>{assigneeName || task.assignee}</span>
          </div>
        )}
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