"use client";

import { useState, useEffect, useCallback } from "react";
import { Task, TaskStatus } from "@/components/kanban/KanbanBoard";

// Express 백엔드 API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export function useTasks(projectId?: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null | undefined>(projectId);

  // 모든 태스크 가져오기
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);

      // Express 백엔드 API 호출로 변경
      const url = projectId
        ? `${BACKEND_URL}/api/tasks?projectId=${projectId}`
        : `${BACKEND_URL}/api/tasks`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });

      if (!response.ok) {
        throw new Error("태스크를 가져오는데 실패했습니다.");
      }

      const data = await response.json();
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // projectId가 변경될 때만 실행
  useEffect(() => {
    setCurrentProjectId(projectId);
    setTasks([]);
    fetchTasks();
  }, [projectId]);

  // 새 태스크 추가
  const addTask = async (newTask: Omit<Task, "id">) => {
    try {
      setLoading(true);

      // Express 백엔드 API 호출
      const url = `${BACKEND_URL}/api/tasks`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTask),
      });
      
      if (!response.ok) {
        throw new Error("태스크를 추가하는데 실패했습니다.");
      }
      
      const createdTask = await response.json();
      setTasks((prevTasks) => [...prevTasks, createdTask]);
      
      // 작업 생성 이벤트 트리거 (새 작업 알림 용도, 담당자 정보 포함)
      try {
        await fetch("/api/notifications/task-events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: "task_created",
            taskId: createdTask.id,
            projectId: createdTask.projectId,
            newAssignee: createdTask.assignee, // 담당자 정보 추가
          }),
        });
      } catch (notificationError) {
        console.error("작업 생성 알림 전송 실패:", notificationError);
        // 알림 전송 실패해도 작업 추가는 성공한 것으로 처리
      }
      
      setError(null);
      return createdTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 태스크 상태 업데이트
  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      setLoading(true);
      
      // 현재 작업 정보 조회 (변경 전 담당자 확인용)
      const currentTask = tasks.find(task => task.id === taskId);
      
      const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error("태스크 상태를 업데이트하는데 실패했습니다.");
      }
      
      const updatedTask = await response.json();
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === taskId ? updatedTask : task))
      );
      
      // 작업 상태 변경 이벤트 트리거 (상태 변경 알림 용도)
      try {
        await fetch("/api/notifications/task-events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventType: "task_updated",
            taskId: updatedTask.id,
            projectId: updatedTask.projectId,
            newStatus: newStatus,
            assigneeChanged: false, // 상태 변경만이므로 담당자 변경 없음
            previousAssignee: currentTask?.assignee,
            newAssignee: updatedTask.assignee,
          }),
        });
      } catch (notificationError) {
        console.error("작업 상태 변경 알림 전송 실패:", notificationError);
        // 알림 전송 실패해도 작업 업데이트는 성공한 것으로 처리
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 태스크 전체 정보 업데이트
  const updateTask = async (updatedTask: Task) => {
    try {
      setLoading(true);
      
      const response = await fetch(`${BACKEND_URL}/api/tasks/${updatedTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedTask),
      });
      
      if (!response.ok) {
        throw new Error("태스크를 업데이트하는데 실패했습니다.");
      }
      
      const resultTask = await response.json();
      
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === updatedTask.id ? resultTask : task))
      );
      setError(null);
      return resultTask;
    } catch (err) {
      console.error('작업 업데이트 오류:', err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 태스크 삭제
  const deleteTask = async (taskId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("태스크를 삭제하는데 실패했습니다.");
      }
      
      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    addTask,
    updateTaskStatus,
    updateTask,
    deleteTask,
  };
} 