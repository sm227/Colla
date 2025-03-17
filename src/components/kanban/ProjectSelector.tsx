"use client";

import { useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
}

export function ProjectSelector({
  selectedProjectId,
  onSelectProject,
}: ProjectSelectorProps) {
  const { projects, loading, error, addProject } = useProjects();
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;

    await addProject(newProjectName, newProjectDescription);
    setNewProjectName("");
    setNewProjectDescription("");
    setIsAddingProject(false);
  };

  if (loading) {
    return <div className="text-gray-500">프로젝트 로딩 중...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">프로젝트</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingProject(!isAddingProject)}
        >
          <Plus className="h-4 w-4 mr-1" />
          새 프로젝트
        </Button>
      </div>

      {isAddingProject && (
        <div className="bg-gray-50 p-4 rounded-md mb-4">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              프로젝트 이름
            </label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="프로젝트 이름 입력"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명 (선택사항)
            </label>
            <textarea
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={2}
              placeholder="프로젝트 설명 입력"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingProject(false)}
            >
              취소
            </Button>
            <Button size="sm" onClick={handleAddProject}>
              추가
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedProjectId === null ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectProject(null)}
        >
          모든 작업
        </Button>
        
        {projects.map((project) => (
          <Button
            key={project.id}
            variant={selectedProjectId === project.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectProject(project.id)}
          >
            {project.name}
          </Button>
        ))}
      </div>
    </div>
  );
} 