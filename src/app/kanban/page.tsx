"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ProjectSelector } from "@/components/kanban/ProjectSelector";

export default function KanbanPage() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('projectId');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // URL 쿼리 파라미터로부터 프로젝트 ID를 가져옴
  useEffect(() => {
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
    }
  }, [projectIdParam]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">프로젝트 칸반보드</h1>
      
      <ProjectSelector 
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
      />
      
      <KanbanBoard projectId={selectedProjectId} />
    </div>
  );
} 