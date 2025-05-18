"use client";

import { useState, useEffect } from "react";

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tasks: any[];
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 모든 프로젝트 가져오기
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects");
      
      if (!response.ok) {
        throw new Error("프로젝트를 가져오는데 실패했습니다.");
      }
      
      const data = await response.json();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 새 프로젝트 추가
  const addProject = async (name: string, description?: string) => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description }),
      });
      
      if (!response.ok) {
        throw new Error("프로젝트를 추가하는데 실패했습니다.");
      }
      
      const createdProject = await response.json();
      setProjects((prevProjects) => [...prevProjects, createdProject]);
      setError(null);
      return createdProject;
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 업데이트
  const updateProject = async (
    projectId: string,
    data: { name?: string; description?: string }
  ) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("프로젝트를 업데이트하는데 실패했습니다.");
      }
      
      const updatedProject = await response.json();
      setProjects((prevProjects) =>
        prevProjects.map((project) =>
          project.id === projectId ? updatedProject : project
        )
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 삭제
  const deleteProject = async (projectId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("프로젝트를 삭제하는데 실패했습니다.");
      }
      
      setProjects((prevProjects) =>
        prevProjects.filter((project) => project.id !== projectId)
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 프로젝트 가져오기
  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    addProject,
    updateProject,
    deleteProject,
  };
} 