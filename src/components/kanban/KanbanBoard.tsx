"use client";

import { useState, useEffect } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { AddTaskDialog } from "./AddTaskDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { Alert } from "@/components/ui/alert";
import { KanbanTask } from "./KanbanTask";
import { TaskDetailDialog } from "./TaskDetailDialog";

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
  const { tasks, loading, error, addTask, updateTaskStatus, deleteTask } = useTasks(projectId);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [tasksState, setTasksState] = useState<Task[]>(tasks);
  
  // 작업 상세 다이얼로그 관련 상태 추가
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // useEffect로 tasks가 변경될 때 tasksState도 업데이트
  useEffect(() => {
    setTasksState(tasks);
  }, [tasks]);

  // 상태별로 태스크 필터링 - tasksState 사용으로 변경
  const todoTasks = tasksState.filter((task) => task.status === "todo");
  const inProgressTasks = tasksState.filter((task) => task.status === "in-progress");
  const reviewTasks = tasksState.filter((task) => task.status === "review");
  const doneTasks = tasksState.filter((task) => task.status === "done");

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

  // 작업 상세 다이얼로그 관리 함수 수정
  const handleOpenDialog = (task: Task) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    // 즉시 상태 업데이트
    setIsDialogOpen(false);
    setSelectedTask(null);
  };

  // 작업 업데이트 함수
  const handleUpdateTask = (updatedTask: Task) => {
    const updatedTasks = tasksState.map(t => 
      t.id === updatedTask.id ? updatedTask : t
    );
    setTasksState(updatedTasks);
  };

  // 삭제 함수 구현 수정 - useTasks의 deleteTask 함수 사용
  const handleDeleteTask = async (taskId: string) => {
    console.log('handleDeleteTask 함수가 호출되었습니다.', taskId);
    
    try {
      // DB에서 작업 삭제
      await deleteTask(taskId);
      
      // 로컬 상태 업데이트 (deleteTask가 상태를 업데이트하지 않는 경우에만)
      const updatedTasks = tasksState.filter(task => task.id !== taskId);
      setTasksState(updatedTasks);
      
      // 대화상자 닫기
      handleCloseDialog();
      
      console.log('작업이 성공적으로 삭제되었습니다.');
    } catch (error) {
      console.error('작업 삭제 중 오류 발생:', error);
      alert('작업 삭제 중 오류가 발생했습니다.');
    }
  };

  // DB에서 작업 삭제 함수 (hooks/useTasks.ts에 있을 수 있음)
  const deleteTaskFromDatabase = async (taskId: string) => {
    // API 호출로 DB에서 작업 삭제
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('작업 삭제 실패');
    }
    
    return await response.json();
  };

  // 함수 전달 시 검증
  console.log('handleDeleteTask 함수 정의됨:', typeof handleDeleteTask === 'function');

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
            onTaskClick={handleOpenDialog}
          />
          <KanbanColumn 
            title="진행 중" 
            tasks={inProgressTasks} 
            status="in-progress" 
            updateTaskStatus={handleUpdateTaskStatus} 
            onTaskClick={handleOpenDialog}
          />
          <KanbanColumn 
            title="검토" 
            tasks={reviewTasks} 
            status="review" 
            updateTaskStatus={handleUpdateTaskStatus} 
            onTaskClick={handleOpenDialog}
          />
          <KanbanColumn 
            title="완료" 
            tasks={doneTasks} 
            status="done" 
            updateTaskStatus={handleUpdateTaskStatus} 
            onTaskClick={handleOpenDialog}
          />
        </div>
      )}

      <AddTaskDialog 
        isOpen={isAddTaskDialogOpen} 
        onClose={() => setIsAddTaskDialogOpen(false)} 
        onAddTask={handleAddTask} 
      />

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
} 