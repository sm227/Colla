"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
}

interface DebugInfo {
  source: string;
  value: string;
  normalized: string;
}

interface DebugRef {
  projectIdParam: string | null;
  selectedProjectId: string | null;
  projectIdFromAPI: string | null;
  projectIdFixed: boolean;
}

interface UseDocumentProjectProps {
  user: User | null;
  isNewDocument: boolean;
}

export function useDocumentProject({ user, isNewDocument }: UseDocumentProjectProps) {
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('projectId');
  
  // 프로젝트 관련 상태들
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>("");
  const [userProjectRole, setUserProjectRole] = useState<string | null>(null);
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  const [projectIdWarning, setProjectIdWarning] = useState(false);
  const [projectIdFixed, setProjectIdFixed] = useState(false);
  const [projectIdDebug, setProjectIdDebug] = useState<DebugInfo>({
    source: '',
    value: '',
    normalized: '' 
  });

  // 디버깅용 참조 객체
  const debugRef = useRef<DebugRef>({
    projectIdParam: null,
    selectedProjectId: null,
    projectIdFromAPI: null,
    projectIdFixed: false
  });

  // URL에서 프로젝트 ID 가져오기
  const getProjectIdFromUrl = () => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlProjectId = urlParams.get('projectId');
        if (urlProjectId && urlProjectId !== '' && urlProjectId !== 'null') {
          return urlProjectId;
        }
      } catch (e) {
        console.error("URL에서 projectId 파싱 오류:", e);
      }
    }
    return null;
  };

  // URL에 프로젝트 ID 업데이트
  const updateUrlWithProjectId = (projectId: string) => {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('projectId', projectId);
      window.history.replaceState({}, '', currentUrl.toString());
    }
  };

  // 프로젝트 ID를 확실히 설정하는 함수
  const forceSetProjectId = (id: string | null) => {
    // 빈 문자열, 'null' 문자열, undefined는 모두 null로 처리
    let normalizedId = id;
    
    // 빈 문자열일 경우 URL 파라미터에서 직접 가져와보기
    if (id === '') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const projectIdFromUrl = urlParams.get('projectId');
        
        // URL에 실제 projectId 값이 있는지 확인
        if (projectIdFromUrl !== null && projectIdFromUrl !== '') {
          normalizedId = projectIdFromUrl;
        } else {
          if (id === '' || id === 'null' || id === undefined) {
            normalizedId = null;
          }
        }
      } catch (error) {
        if (id === '' || id === 'null' || id === undefined) {
          normalizedId = null;
        }
      }
    } else if (id === 'null' || id === undefined) {
      normalizedId = null;
    }
    
    setSelectedProjectId(normalizedId);
    debugRef.current.selectedProjectId = normalizedId;
    
    // 디버깅 정보 업데이트
    setProjectIdDebug({
      source: '직접설정',
      value: id === null ? 'null' : String(id || ''),
      normalized: normalizedId === null ? 'null' : String(normalizedId)
    });
    
    // projectId가 있으면 고정된 것으로 표시
    if (normalizedId) {
      setProjectIdFixed(true);
      debugRef.current.projectIdFixed = true;
    }
  };

  // 프로젝트 정보 가져오기
  const fetchProjectInfo = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const projectData = await response.json();
        setProjectName(projectData.name);
        
        // 프로젝트 소유자 확인
        if (user && projectData.userId === user.id) {
          setIsProjectOwner(true);
          setUserProjectRole('owner');
          console.log('사용자는 이 프로젝트의 소유자입니다.');
        } else {
          setIsProjectOwner(false);
          
          // 멤버인 경우 역할 확인
          if (user && projectData.members) {
            const currentUserMember = projectData.members.find(
              (member: any) => member.userId === user.id && member.inviteStatus === "accepted"
            );
            
            if (currentUserMember) {
              setUserProjectRole(currentUserMember.role);
              console.log(`사용자 역할: ${currentUserMember.role}`);
            } else {
              setUserProjectRole(null);
              console.log('사용자는 이 프로젝트의 멤버가 아닙니다.');
            }
          } else {
            setUserProjectRole(null);
          }
        }
      }
    } catch (error) {
      console.error('프로젝트 정보를 가져오는데 실패했습니다:', error);
      setUserProjectRole(null);
      setIsProjectOwner(false);
    }
  };

  // 프로젝트 ID 검증
  const validateProjectId = async (projectIdToValidate: string) => {
    try {
      // 프로젝트 ID가 유효한지 확인 (API 호출)
      const response = await fetch(`/api/projects/${projectIdToValidate}`);
      
      if (response.ok) {
        // 프로젝트가 존재하고 접근 권한이 있음
        const project = await response.json();
        setSelectedProjectId(projectIdToValidate);
        debugRef.current.projectIdParam = projectIdToValidate;
        debugRef.current.selectedProjectId = projectIdToValidate;
        
        // 프로젝트 이름 설정
        setProjectName(project.name);
        
        // 경고 표시 관련
        if (isNewDocument) {
          setProjectIdWarning(true);
          setTimeout(() => setProjectIdWarning(false), 5000);
        }
        
        return true;
      } else {
        // 이미 유효하지 않은 projectId가 URL에 있는 경우, URL에서 제거
        if (typeof window !== 'undefined') {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete('projectId');
          window.history.replaceState({}, '', currentUrl.toString());
        }
        
        // 프로젝트가 존재하지 않거나 접근 권한이 없음
        console.error("지정된 프로젝트에 접근할 수 없습니다. 기본 프로젝트를 사용합니다.");
        return false;
      }
    } catch (error) {
      console.error("프로젝트 ID 검증 중 오류:", error);
      return false;
    }
  };

  // 기본 프로젝트 가져오기
  const getDefaultProject = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const projects = await response.json();
        if (projects.length > 0) {
          const defaultProjectId = projects[0].id;
          setSelectedProjectId(defaultProjectId);
          updateUrlWithProjectId(defaultProjectId);
          return true;
        } else {
          return await createDefaultProject();
        }
      } else {
        return await createDefaultProject();
      }
    } catch (error) {
      console.error("기본 프로젝트 가져오기 실패:", error);
      return await createDefaultProject();
    }
  };

  // 기본 프로젝트 생성
  const createDefaultProject = async () => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: "내 프로젝트",
          description: "자동으로 생성된 프로젝트입니다."
        })
      });
      
      if (response.ok) {
        const newProject = await response.json();
        setSelectedProjectId(newProject.id);
        updateUrlWithProjectId(newProject.id);
        return true;
      } else {
        console.error("기본 프로젝트 생성 실패");
        return false;
      }
    } catch (error) {
      console.error("기본 프로젝트 생성 중 오류:", error);
      return false;
    }
  };

  // URL 쿼리 파라미터로부터 프로젝트 ID를 가져오고 검증
  useEffect(() => {
    // 값의 우선순위: searchParams > URL > 현재 상태
    const projectIdToUse = projectId || getProjectIdFromUrl() || selectedProjectId;

    if (projectIdToUse && projectIdToUse !== selectedProjectId) {
      console.log("프로젝트 ID 설정:", projectIdToUse);
      
      validateProjectId(projectIdToUse).then((isValid) => {
        if (!isValid) {
          getDefaultProject();
        }
      });
    }
  }, [projectId, isNewDocument, selectedProjectId]);

  // 프로젝트 ID가 변경될 때마다 프로젝트 정보 가져오기
  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectInfo(selectedProjectId);
    } else {
      // 프로젝트 ID가 없는 경우 역할 초기화
      setUserProjectRole(null);
      setIsProjectOwner(false);
    }
  }, [selectedProjectId, user]);

  return {
    // 상태값들
    selectedProjectId,
    projectName,
    userProjectRole,
    isProjectOwner,
    projectIdWarning,
    projectIdFixed,
    projectIdDebug,
    debugRef,
    
    // 함수들
    forceSetProjectId,
    updateUrlWithProjectId,
    fetchProjectInfo,
    validateProjectId,
    getDefaultProject,
    createDefaultProject,
    getProjectIdFromUrl,
    
    // 상태 설정 함수들
    setProjectName,
    setSelectedProjectId,
    setUserProjectRole,
    setIsProjectOwner,
    setProjectIdWarning,
    setProjectIdFixed
  };
} 