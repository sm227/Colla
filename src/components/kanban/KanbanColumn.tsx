"use client";

import { KanbanTask } from "./KanbanTask";
import { Task, TaskStatus } from "./KanbanBoard";
import { useDrop } from "./useDragDrop";

interface KanbanColumnProps {
  title: string;
  tasks: Task[];
  status: TaskStatus;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick: (task: Task) => void;
}

export function KanbanColumn({ 
  title, 
  tasks, 
  status, 
  updateTaskStatus,
  onTaskClick
}: KanbanColumnProps) {
  // 드롭 영역 설정
  const { isOver, setNodeRef } = useDrop({
    onDrop: (taskId: string) => {
      updateTaskStatus(taskId, status);
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-100 rounded-lg p-4 min-h-[500px] flex flex-col ${
        isOver ? "border-2 border-blue-500" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-700">{title}</h3>
        <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-1 text-xs">
          {tasks.length}
        </span>
      </div>
      
      <div className="flex flex-col gap-2 flex-grow">
        {tasks.map((task) => (
          <div key={task.id} onClick={() => onTaskClick(task)}>
            <KanbanTask 
              task={task} 
              onUpdate={(updatedTask) => {
                // 업데이트 로직
              }}
            />
          </div>
        ))}
        
        {tasks.length === 0 && (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-gray-400 text-sm">작업 없음</p>
          </div>
        )}
      </div>
    </div>
  );
} 