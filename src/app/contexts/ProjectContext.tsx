"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

// 사용자 타입 정의
export type User = {
  id: string;
  name: string;
  email: string;
};

// 프로젝트 멤버 타입 정의
export type ProjectMember = {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  inviteStatus: string;
  createdAt: string;
  updatedAt: string;
  user: User;
};

// 프로젝트 타입 정의
export type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: User;
  members: ProjectMember[];
};

// 프로젝트 컨텍스트 타입 정의
type ProjectContextType = {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  refreshProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  setCurrentProject: (project: Project | null) => void;
  hasProjects: boolean;
  inviteProjectMember: (
    projectId: string,
    email: string,
    role?: string
  ) => Promise<void>;
  removeProjectMember: (projectId: string, memberId: string) => Promise<void>;
  acceptProjectInvitation: (projectId: string) => Promise<void>;
  rejectProjectInvitation: (projectId: string) => Promise<void>;
  getPendingInvitations: () => Promise<Project[]>;
};

// 기본값으로 컨텍스트 생성
const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  fetchProjects: async () => {},
  refreshProjects: async () => {},
  createProject: async () => ({
    id: "",
    name: "",
    createdAt: "",
    updatedAt: "",
    userId: "",
    members: [],
  }),
  setCurrentProject: () => {},
  hasProjects: false,
  inviteProjectMember: async () => {},
  removeProjectMember: async () => {},
  acceptProjectInvitation: async () => {},
  rejectProjectInvitation: async () => {},
  getPendingInvitations: async () => [],
});

// 프로젝트 컨텍스트 제공자 컴포넌트
export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true); // 초기 상태를 로딩 중으로 설정
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // 인증 로딩 상태도 가져오기

  // 현재 프로젝트 설정 함수 (localStorage에 저장)
  const handleSetCurrentProject = (project: Project | null) => {
    setCurrentProject(project);
    if (project) {
      localStorage.setItem("currentProjectId", project.id);
    } else {
      localStorage.removeItem("currentProjectId");
    }
  };

  // 모든 프로젝트 가져오기
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/projects", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || "프로젝트를 불러오는 중 오류가 발생했습니다."
        );
      }

      const data = await response.json();

      // 서버에서 이미 현재 사용자의 프로젝트만 필터링됨
      setProjects(data);

      // 초기화 완료 설정
      if (!initialized) {
        setInitialized(true);
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 새 프로젝트 생성
  const createProject = async (
    name: string,
    description?: string
  ): Promise<Project> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, description }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || "프로젝트를 생성하는 중 오류가 발생했습니다."
        );
      }

      const newProject = await response.json();

      // 프로젝트 목록 업데이트
      setProjects((prev) => [newProject, ...prev]);

      // 새 프로젝트를 현재 프로젝트로 설정
      handleSetCurrentProject(newProject);

      return newProject;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 멤버 초대
  const inviteProjectMember = async (
    projectId: string,
    email: string,
    role: string = "member"
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "멤버 초대 중 오류가 발생했습니다.");
      }

      // 프로젝트 목록 새로고침
      await fetchProjects();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 멤버 제거
  const removeProjectMember = async (projectId: string, memberId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/projects/${projectId}/members/${memberId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "멤버 제거 중 오류가 발생했습니다.");
      }

      // 프로젝트 목록 새로고침
      await fetchProjects();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 초대 수락
  const acceptProjectInvitation = async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/projects/${projectId}/invitations/accept`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "초대 수락 중 오류가 발생했습니다.");
      }

      // 프로젝트 목록 새로고침
      await fetchProjects();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 초대 거절
  const rejectProjectInvitation = async (projectId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/projects/${projectId}/invitations/reject`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "초대 거절 중 오류가 발생했습니다.");
      }

      // 프로젝트 목록 새로고침
      await fetchProjects();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 대기 중인 초대 가져오기
  const getPendingInvitations = async (): Promise<Project[]> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/projects/invitations/pending", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          data.error || "초대 목록을 불러오는 중 오류가 발생했습니다."
        );
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 프로젝트 목록 가져오기
  useEffect(() => {
    // 로그인 상태일 때만 프로젝트 가져오기
    if (user && !authLoading) {
      fetchProjects();
    } else if (!authLoading && !user) {
      // 인증 로딩이 끝났고 사용자가 없으면 로딩 상태 해제
      setLoading(false);
    }
  }, [user, authLoading]); // 사용자와 인증 로딩 상태가 변경될 때 실행

  // localStorage에서 현재 프로젝트 ID 로드 및 프로젝트 설정
  useEffect(() => {
    if (!loading && projects.length > 0) {
      const savedProjectId = localStorage.getItem("currentProjectId");

      if (savedProjectId) {
        const foundProject = projects.find((p) => p.id === savedProjectId);

        if (foundProject) {
          setCurrentProject(foundProject);
        } else {
          // 저장된 프로젝트를 찾을 수 없는 경우 첫 번째 프로젝트 선택
          setCurrentProject(projects[0]);
        }
      } else if (!currentProject) {
        // 저장된 프로젝트 ID가 없고 선택된 프로젝트가 없는 경우 첫 번째 프로젝트 선택
        setCurrentProject(projects[0]);
      }
    }
  }, [loading, projects, currentProject]);

  // 사용자의 프로젝트가 없는 경우 리디렉션 로직 개선
  useEffect(() => {
    // 이전에 있던 자동 리디렉션 로직을 제거
    // 이제 각 컴포넌트에서 필요에 따라 리디렉션 처리

    // 상태 초기화 로직만 유지
    if (
      !loading &&
      !authLoading &&
      user &&
      initialized &&
      projects.length === 0
    ) {
      // hasProjects 상태만 업데이트
      // 실제 리디렉션은 필요한 컴포넌트에서 처리
    }
  }, [loading, authLoading, user, initialized, projects.length]);

  // 프로젝트가 있는지 여부
  const hasProjects = projects.length > 0;

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        loading,
        error,
        fetchProjects,
        refreshProjects: fetchProjects,
        createProject,
        setCurrentProject: handleSetCurrentProject,
        hasProjects,
        inviteProjectMember,
        removeProjectMember,
        acceptProjectInvitation,
        rejectProjectInvitation,
        getPendingInvitations,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// 프로젝트 컨텍스트 사용을 위한 훅
export function useProject() {
  return useContext(ProjectContext);
}
