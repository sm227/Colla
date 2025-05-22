"use client";

import { useState, useEffect } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { ClipboardListIcon } from "lucide-react";
import { useTasks } from "@/hooks/useTasks";
import { Alert } from "@/components/ui/alert";
import { TaskDetailDialog } from "./TaskDetailDialog";

// 칸반 보드 상태 타입 정의
export type TaskStatus = "todo" | "in-progress" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: string;
  assignee?: string | null;
  projectId?: string | null;
  epicId?: string | null;
  dueDate?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface KanbanBoardProps {
  projectId: string | null;
  theme?: "light" | "dark";
}

export function KanbanBoard({ projectId, theme = "light" }: KanbanBoardProps) {
  // console.log("KanbanBoard 렌더링 - projectId:", projectId);
  
  const { tasks, loading, error, addTask, updateTaskStatus, updateTask, deleteTask, fetchTasks } = useTasks(projectId);
  const [tasksState, setTasksState] = useState<Task[]>([]);
  
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
    // projectId가 변경되면 UI를 즉시 비우고 로딩 상태로 전환
    setTasksState([]);
    fetchTasks();
  }, [projectId, fetchTasks]);
  
  // tasks가 변경될 때 tasksState 업데이트 및 프로젝트별 필터링
  useEffect(() => {
    if (tasks.length > 0) {
      // 프로젝트 ID가 있을 경우 해당 프로젝트의 작업만 필터링
      if (projectId) {
        const filteredTasks = tasks.filter(task => task.projectId === projectId);
        console.log(`프로젝트 ID ${projectId}에 해당하는 작업 ${filteredTasks.length}개 필터링됨`);
        setTasksState(filteredTasks);
      } else {
        // 프로젝트 ID가 없으면 모든 작업 표시
        console.log(`전체 작업 ${tasks.length}개 로드됨`);
        setTasksState(tasks);
      }
    } else {
      // 작업이 없는 경우 빈 배열로 설정
      setTasksState([]);
    }
  }, [tasks, projectId]);

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

      <div className="flex items-center mb-6">
        <ClipboardListIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'} mr-2`} />
        <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
          {projectId ? "프로젝트 작업" : "모든 작업"}
        </h2>
        {projectId && tasksState.length > 0 && (
          <span className={`ml-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            ({tasksState.length}개)
          </span>
        )}
      </div>

      {loading ? (
        <div className={`flex items-center justify-center h-64 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
          <div className="text-center flex flex-col items-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-14 h-14 border-4 border-current border-solid rounded-full opacity-20`}></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`w-14 h-14 border-4 border-current border-solid rounded-full border-t-transparent animate-spin`}></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-bold`}>C</span>
              </div>
            </div>
            <p className={`mt-4 text-base font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>작업 로딩 중...</p>
          </div>
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
            onAddTask={handleAddTask}
            loading={loading}
            theme={theme}
          />
          <KanbanColumn 
            title="진행 중" 
            tasks={inProgressTasks} 
            status="in-progress" 
            updateTaskStatus={handleUpdateTaskStatus} 
            onTaskClick={handleOpenDialog}
            color="blue"
            onTaskDelete={handleDeleteTask}
            onAddTask={handleAddTask}
            loading={loading}
            theme={theme}
          />
          <KanbanColumn 
            title="검토" 
            tasks={reviewTasks} 
            status="review" 
            updateTaskStatus={handleUpdateTaskStatus} 
            onTaskClick={handleOpenDialog}
            color="yellow"
            onTaskDelete={handleDeleteTask}
            onAddTask={handleAddTask}
            loading={loading}
            theme={theme}
          />
          <KanbanColumn 
            title="완료" 
            tasks={doneTasks} 
            status="done" 
            updateTaskStatus={handleUpdateTaskStatus} 
            onTaskClick={handleOpenDialog}
            color="green"
            onTaskDelete={handleDeleteTask}
            onAddTask={handleAddTask}
            loading={loading}
            theme={theme}
          />
        </div>
      )}

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          theme={theme}
        />
      )}
    </div>
  );
}