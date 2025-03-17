"use client";

import { useState } from "react";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { ProjectSelector } from "@/components/kanban/ProjectSelector";

export default function KanbanPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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