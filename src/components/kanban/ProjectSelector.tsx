"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/app/contexts/ProjectContext";
import { Button } from "@/components/ui/button";
import { Plus, FolderIcon, CheckIcon } from "lucide-react";

interface ProjectSelectorProps {
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
}

export function ProjectSelector({
  selectedProjectId,
  onSelectProject,
}: ProjectSelectorProps) {
  const router = useRouter();
  const { projects, loading, error, createProject } = useProject();
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;

    await createProject(newProjectName, newProjectDescription);
    setNewProjectName("");
    setNewProjectDescription("");
    setIsAddingProject(false);
  };

  const handleSelectProject = (projectId: string | null) => {
    if (projectId === null) {
      console.log("모든 작업 선택 - ProjectSelector");
      window.location.href = '/kanban';
    } else {
      console.log("특정 프로젝트 선택:", projectId);
      onSelectProject(projectId);
    }
  };

  if (loading) {
    return <div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div></div>;
  }

  if (error) {
    return <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">{error}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">프로젝트 선택</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAddingProject(!isAddingProject)}
          className="flex items-center gap-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <Plus className="h-4 w-4" />
          새 프로젝트
        </Button>
      </div>

      {isAddingProject && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md mb-4 border border-gray-200 dark:border-gray-700">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              프로젝트 이름
            </label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-gray-700 dark:text-white"
              placeholder="프로젝트 이름 입력"
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              설명 (선택사항)
            </label>
            <textarea
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none dark:bg-gray-700 dark:text-white"
              rows={2}
              placeholder="프로젝트 설명 입력"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingProject(false)}
              className="dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              취소
            </Button>
            <Button size="sm" onClick={handleAddProject}>
              추가
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div 
          className={`border rounded-md p-3 cursor-pointer transition-colors ${
            selectedProjectId === null 
              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' 
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          onClick={() => handleSelectProject(null)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 mr-3">
                <FolderIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <span className="font-medium">모든 작업</span>
            </div>
            {selectedProjectId === null && (
              <CheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            )}
          </div>
        </div>
        
        {projects.map((project) => (
          <div
            key={project.id}
            className={`border rounded-md p-3 cursor-pointer transition-colors ${
              selectedProjectId === project.id 
                ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' 
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => handleSelectProject(project.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 mr-3">
                  <FolderIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <span className="font-medium truncate">{project.name}</span>
              </div>
              {selectedProjectId === project.id && (
                <CheckIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 