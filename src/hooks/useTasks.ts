"use client";

import { useState, useEffect, useCallback } from "react";
import { Task, TaskStatus } from "@/components/kanban/KanbanBoard";

export function useTasks(projectId?: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모든 태스크 가져오기
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      // 프로젝트 ID가 있으면 해당 프로젝트의 태스크만 가져오기
      const url = projectId 
        ? `/api/projects/${projectId}/tasks` 
        : "/api/tasks";
      
      const response = await fetch(url);
      
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

  // 새 태스크 추가
  const addTask = async (newTask: Omit<Task, "id">) => {
    try {
      setLoading(true);
      
      // 프로젝트 ID가 있으면 해당 프로젝트에 태스크 추가
      const url = newTask.projectId 
        ? `/api/projects/${newTask.projectId}/tasks` 
        : "/api/tasks";
      
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
      const response = await fetch(`/api/tasks/${taskId}`, {
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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 태스크 삭제
  const deleteTask = async (taskId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks/${taskId}`, {
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

  // 컴포넌트 마운트 시 태스크 가져오기
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    addTask,
    updateTaskStatus,
    deleteTask,
  };
} 