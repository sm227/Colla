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
  color?: 'gray' | 'blue' | 'yellow' | 'green' | 'purple' | 'red';
  onTaskDelete?: (taskId: string) => void; 
}

export function KanbanColumn({ 
  title, 
  tasks, 
  status, 
  updateTaskStatus,
  onTaskClick,
  color = 'gray',
  onTaskDelete
}: KanbanColumnProps) {
  // 드롭 영역 설정
  const { isOver, setNodeRef } = useDrop({
    onDrop: (taskId: string) => {
      updateTaskStatus(taskId, status);
    },
  });

  // 컬럼 헤더 색상 설정
  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-800 dark:text-blue-300',
          indicator: 'bg-blue-500 dark:bg-blue-400'
        };
      case 'green':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30',
          text: 'text-green-800 dark:text-green-300',
          indicator: 'bg-green-500 dark:bg-green-400'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30',
          text: 'text-yellow-800 dark:text-yellow-300',
          indicator: 'bg-yellow-500 dark:bg-yellow-400'
        };
      case 'purple':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-800 dark:text-purple-300',
          indicator: 'bg-purple-500 dark:bg-purple-400'
        };
      case 'red':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-800 dark:text-red-300',
          indicator: 'bg-red-500 dark:bg-red-400'
        };
      case 'gray':
      default:
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-800 dark:text-gray-300',
          indicator: 'bg-gray-500 dark:bg-gray-400'
        };
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div
      ref={setNodeRef}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col ${
        isOver ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <div className={`${colorClasses.bg} px-4 py-3 border-b border-gray-200 dark:border-gray-700`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${colorClasses.indicator} mr-2`}></div>
            <h3 className={`font-medium ${colorClasses.text}`}>{title}</h3>
          </div>
          <span className={`${colorClasses.bg} ${colorClasses.text} border border-gray-200 dark:border-gray-700 rounded-full px-2 py-0.5 text-xs font-medium`}>
            {tasks.length}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 p-3 flex-grow overflow-y-auto" style={{ maxHeight: '500px' }}>
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
        
        {tasks.length === 0 && (
          <div className="flex-grow flex items-center justify-center py-8">
            <p className="text-gray-400 dark:text-gray-500 text-sm">작업 없음</p>
          </div>
        )}
      </div>
    </div>
  );
} 