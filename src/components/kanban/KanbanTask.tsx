"use client";

import { Task } from "./KanbanBoard";
import { useDrag } from "./useDragDrop";
import { CalendarIcon, UserIcon } from "lucide-react";
import { useState } from "react";
import { TaskDetailDialog } from "./TaskDetailDialog";

interface KanbanTaskProps {
  task: Task;
  onUpdate: (task: Task) => void;
}

export function KanbanTask({ task, onUpdate }: KanbanTaskProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { isDragging, setNodeRef } = useDrag({
    id: task.id,
  });

  // 우선순위에 따른 색상 설정
  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-red-100 text-red-800",
  };

  const handleClick = () => {
    setIsDetailOpen(true);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        onClick={handleClick}
        className={`bg-white p-3 rounded-md shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow ${
          isDragging ? "opacity-50" : ""
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-gray-800">{task.title}</h4>
          <span
            className={`text-xs px-2 py-1 rounded-full ${
              priorityColors[task.priority]
            }`}
          >
            {task.priority}
          </span>
        </div>
        
        <p className="text-sm text-gray-600 mb-3">{task.description}</p>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          {task.assignee && (
            <div className="flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              <span>{task.assignee}</span>
            </div>
          )}
          
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      <TaskDetailDialog
        task={task}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUpdate={onUpdate}
      />
    </>
  );
} 