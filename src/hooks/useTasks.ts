"use client";

import { useState, useEffect, useCallback } from "react";
import { Task, TaskStatus } from "@/components/kanban/KanbanBoard";

export function useTasks(projectId?: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null | undefined>(projectId);

  // 모든 태스크 가져오기
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      // 프로젝트 ID가 있으면 해당 프로젝트의 태스크만 가져오기
      // 프로젝트 ID가 null이면 모든 태스크 가져오기
      const url = projectId 
        ? `/api/projects/${projectId}/tasks` 
        : "/api/tasks";
      
      if (!projectId) {
        console.log("🔄 모든 프로젝트의 작업을 가져오는 중... (projectId:", projectId, ")");
      } else {
        console.log(`🔄 프로젝트 ${projectId}의 작업을 가져오는 중...`);
      }
      
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
      console.log(`✅ ${data.length}개의 작업을 가져왔습니다.`);
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // projectId가 변경될 때마다 현재 프로젝트 ID 업데이트 및 작업 다시 불러오기
  useEffect(() => {
    if (projectId !== currentProjectId) {
      setCurrentProjectId(projectId);
      // 프로젝트 변경 시 이전 작업 데이터 초기화
      setTasks([]);
      fetchTasks();
    }
  }, [projectId, currentProjectId, fetchTasks]);

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

  // 태스크 전체 정보 업데이트
  const updateTask = async (updatedTask: Task) => {
    try {
      setLoading(true);
      console.log('📝 작업 업데이트 요청:', updatedTask);
      
      const response = await fetch(`/api/tasks/${updatedTask.id}`, {
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
      console.log('✅ 작업 업데이트 성공:', resultTask);
      
      setTasks((prevTasks) =>
        prevTasks.map((task) => (task.id === updatedTask.id ? resultTask : task))
      );
      setError(null);
      return resultTask;
    } catch (err) {
      console.error('❌ 작업 업데이트 오류:', err);
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
    updateTask,
    deleteTask,
  };
} 