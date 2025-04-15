"use client";

import { useState, useEffect } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { AddTaskDialog } from "./AddTaskDialog";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardListIcon } from "lucide-react";
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
  startDate?: Date;
  dueDate?: Date;
  projectId?: string;
  createdAt?: string;
}

interface KanbanBoardProps {
  projectId: string | null;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  console.log("KanbanBoard 렌더링 - projectId:", projectId);
  
  const { tasks, loading, error, addTask, updateTaskStatus, updateTask, deleteTask, fetchTasks } = useTasks(projectId);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [tasksState, setTasksState] = useState<Task[]>(tasks);
  
  // 작업 상세 다이얼로그 관련 상태 추가
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // projectId가 변경될 때마다 태스크를 다시 불러옵니다.
  useEffect(() => {
    console.log("KanbanBoard - 프로젝트 ID 변경됨:", projectId);
    if (projectId === null) {
      console.log("KanbanBoard - 모든 프로젝트 작업 표시");
    } else {
      console.log("KanbanBoard - 특정 프로젝트 작업 표시:", projectId);
    }
    fetchTasks();
  }, [projectId, fetchTasks]);
  
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

  // 작업 업데이트 함수 - 서버에 변경사항 저장하도록 수정
  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      console.log('작업 업데이트 시작:', updatedTask);
      
      // 로컬 상태 즉시 업데이트
      const updatedTasks = tasksState.map(t => 
        t.id === updatedTask.id ? updatedTask : t
      );
      setTasksState(updatedTasks);
      
      // 서버에 업데이트 요청 - DB에 저장
      const result = await updateTask(updatedTask);
      
      if (result) {
        console.log('작업 업데이트 성공:', result);
      } else {
        console.error('작업 업데이트 실패');
        // 실패 시 로컬 상태 복구를 위해 다시 서버에서 데이터 가져오기
        fetchTasks();
      }
    } catch (error) {
      console.error('작업 업데이트 오류:', error);
      alert('작업 업데이트 중 오류가 발생했습니다.');
      // 오류 발생 시 최신 데이터로 복구
      fetchTasks();
    }
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

  return (
    <div className="flex flex-col">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <p>{error}</p>
        </Alert>
      )}

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <ClipboardListIcon className="h-5 w-5 text-gray-700 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">
            {projectId ? "프로젝트 작업" : "모든 작업"}
          </h2>
        </div>
        <Button 
          onClick={() => setIsAddTaskDialogOpen(true)}
          className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          새 작업
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="ml-3 text-gray-600">작업 로딩 중...</p>
        </div>
      ) : tasksState.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-gray-50 rounded-lg p-8 border border-gray-200">
          <ClipboardListIcon className="h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">작업이 없습니다</h3>
          <p className="text-gray-500 mb-4 text-center">이 프로젝트에 아직 작업이 추가되지 않았습니다.</p>
          <Button 
            onClick={() => setIsAddTaskDialogOpen(true)}
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            첫 작업 추가하기
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KanbanColumn 
            title="할 일" 
            tasks={todoTasks} 
            status="todo" 
            updateTaskStatus={handleUpdateTaskStatus} 
            onTaskClick={handleOpenDialog}
            color="gray"
            onTaskDelete={handleDeleteTask}
          />
          <KanbanColumn 
            title="진행 중" 
            tasks={inProgressTasks} 
            status="in-progress" 
            updateTaskStatus={handleUpdateTaskStatus} 
            onTaskClick={handleOpenDialog}
            color="blue"
            onTaskDelete={handleDeleteTask}
          />
          <KanbanColumn 
            title="검토" 
            tasks={reviewTasks} 
            status="review" 
            updateTaskStatus={handleUpdateTaskStatus} 
            onTaskClick={handleOpenDialog}
            color="yellow"
            onTaskDelete={handleDeleteTask}
          />
          <KanbanColumn 
            title="완료" 
            tasks={doneTasks} 
            status="done" 
            updateTaskStatus={handleUpdateTaskStatus} 
            onTaskClick={handleOpenDialog}
            color="green"
            onTaskDelete={handleDeleteTask}
          />
        </div>
      )}

      <AddTaskDialog 
        isOpen={isAddTaskDialogOpen} 
        onClose={() => setIsAddTaskDialogOpen(false)} 
        onAddTask={handleAddTask}
        projectId={projectId}
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