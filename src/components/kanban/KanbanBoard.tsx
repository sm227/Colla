"use client";

import { useState, useEffect } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { AddTaskDialog } from "./AddTaskDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { Alert } from "@/components/ui/alert";

// 칸반 보드 상태 타입 정의
export type TaskStatus = "todo" | "in-progress" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  assignee?: string;
  dueDate?: Date;
  projectId?: string;
}

interface KanbanBoardProps {
  projectId: string | null;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const { tasks, loading, error, addTask, updateTaskStatus } = useTasks(projectId);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  
  // 상태별로 태스크 필터링
  const todoTasks = tasks.filter((task) => task.status === "todo");
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress");
  const reviewTasks = tasks.filter((task) => task.status === "review");
  const doneTasks = tasks.filter((task) => task.status === "done");

  // 새 태스크 추가 함수
  const handleAddTask = async (newTask: Omit<Task, "id">) => {
    await addTask({
      ...newTask,
      projectId: projectId || undefined,
    });
  };

  // 태스크 상태 변경 함수
  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    await updateTaskStatus(taskId, newStatus);
  };

  return (
    <div className="flex flex-col">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <p>{error}</p>
        </Alert>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">
          {projectId ? "프로젝트 작업" : "모든 작업"}
        </h2>
        <Button 
          onClick={() => setIsAddTaskDialogOpen(true)}
          className="flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          새 작업
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">로딩 중...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KanbanColumn 
            title="할 일" 
            tasks={todoTasks} 
            status="todo" 
            updateTaskStatus={handleUpdateTaskStatus} 
          />
          <KanbanColumn 
            title="진행 중" 
            tasks={inProgressTasks} 
            status="in-progress" 
            updateTaskStatus={handleUpdateTaskStatus} 
          />
          <KanbanColumn 
            title="검토" 
            tasks={reviewTasks} 
            status="review" 
            updateTaskStatus={handleUpdateTaskStatus} 
          />
          <KanbanColumn 
            title="완료" 
            tasks={doneTasks} 
            status="done" 
            updateTaskStatus={handleUpdateTaskStatus} 
          />
        </div>
      )}

      <AddTaskDialog 
        isOpen={isAddTaskDialogOpen} 
        onClose={() => setIsAddTaskDialogOpen(false)} 
        onAddTask={handleAddTask} 
      />
    </div>
  );
} 