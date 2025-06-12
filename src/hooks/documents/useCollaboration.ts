import { useState, useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

interface User {
  name: string;
  color: string;
  projectRole?: string | null;
  isProjectOwner?: boolean;
}

interface UseCollaborationProps {
  documentId: string | null;
  user: any;
  userProjectRole: string | null;
  isProjectOwner: boolean;
}

interface UseCollaborationReturn {
  // Y.js 관련
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  contentLoadedFromYjs: boolean;
  
  // 사용자 관련
  currentUser: User;
  connectedUsers: User[];
  
  // 읽기 전용 모드
  isReadOnlyMode: boolean;
  setIsReadOnlyMode: (mode: boolean) => void;
  toggleReadOnlyMode: () => void;
  
  // 초기화 함수
  initializeProvider: (docId: string) => void;
}

export const useCollaboration = ({
  documentId,
  user,
  userProjectRole,
  isProjectOwner
}: UseCollaborationProps): UseCollaborationReturn => {
  // Y.js 문서 및 프로바이더 상태
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [contentLoadedFromYjs, setContentLoadedFromYjs] = useState(false);
  
  // 사용자 관련 상태
  const [currentUser, setCurrentUser] = useState<User>({
    name: "익명 사용자", 
    color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
  });
  const [connectedUsers, setConnectedUsers] = useState<User[]>([]);
  
  // 읽기 전용 모드 상태
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
  const [isButtonDebouncing, setIsButtonDebouncing] = useState(false);

  // 현재 사용자 정보 설정
  useEffect(() => {
    if (user) {
      console.log('AuthContext에서 사용자 정보 가져옴:', user);
      
      // 사용자 랜덤 색상 생성
      let idValue = 0;
      try {
        idValue = user.id ? 
          user.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 
          Date.now();
      } catch (e) {
        idValue = Date.now();
      }
      
      const userColor = `#${(idValue % 0xffffff).toString(16).padStart(6, '0')}`;
      
      setCurrentUser({
        name: user.name || user.email || '익명 사용자',
        color: userColor,
        projectRole: userProjectRole,
        isProjectOwner
      });
      
      console.log('사용자 정보 설정 완료:', user.name || user.email);
    } else {
      console.log('로그인된 사용자 정보가 없습니다.');
      
      // 사용자 정보가 없을 경우 직접 API 호출 시도
      const fetchUserDirectly = async () => {
        try {
          console.log('API를 통해 사용자 정보 직접 요청...');
          const response = await fetch('/api/auth/me', {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('API 응답:', data);
            
            if (data.authenticated && data.user) {
              const userColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
              
              setCurrentUser({
                name: data.user.name || data.user.email || '익명 사용자',
                color: userColor,
                projectRole: userProjectRole,
                isProjectOwner
              });
            }
          } else {
            console.warn('사용자 정보 요청 실패:', response.status);
          }
        } catch (error) {
          console.error('사용자 정보 직접 요청 실패:', error);
        }
      };
      
      fetchUserDirectly();
    }
  }, [user, userProjectRole, isProjectOwner]);

  // Y.js 프로바이더 초기화 함수
  const initializeProvider = (docId: string) => {
    // 기존 프로바이더 정리
    if (provider) {
      provider.destroy();
    }
    
    // 역할 정보를 포함한 사용자 정보 준비
    const userInfoWithRole = {
      ...currentUser,
      projectRole: userProjectRole,
      isProjectOwner
    };
    
    // 새 프로바이더 생성
    const hocuspocusProvider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:1234',
      name: docId,
      document: ydoc,
      onConnect: () => {
        console.log('협업 서버에 연결되었습니다.');
        hocuspocusProvider.setAwarenessField('user', userInfoWithRole);
        console.log('문서 ID 변경 시 사용자 정보 설정:', userInfoWithRole);
        
        setTimeout(() => {
          setContentLoadedFromYjs(true);
        }, 100);
      },
      onDisconnect: () => {
        console.log('협업 서버와의 연결이 끊어졌습니다.');
      },
      onAwarenessUpdate: ({ states }) => {
        const users = Array.from(states.entries())
          .filter(([_, state]) => state.user)
          .map(([_, state]) => state.user);
        
        setConnectedUsers(users);
        console.log('접속 중인 사용자 목록 업데이트:', users.map(u => u.name || '익명').join(', '));
      },
      onSynced: () => {
        console.log('Y.js 문서가 서버와 동기화되었습니다.');
        setTimeout(() => {
          setContentLoadedFromYjs(true);
        }, 100);
      }
    });
    
    hocuspocusProvider.setAwarenessField('user', userInfoWithRole);
    setProvider(hocuspocusProvider);
    
    return () => {
      hocuspocusProvider.destroy();
    };
  };

  // 문서 ID가 있을 때 협업 프로바이더 설정
  useEffect(() => {
    if (!documentId || documentId === 'new') return;
    
    const cleanup = initializeProvider(documentId);
    return cleanup;
  }, [documentId, ydoc, currentUser, userProjectRole, isProjectOwner]);

  // 현재 사용자 정보가 변경될 때 provider에 적용
  useEffect(() => {
    if (!provider || !currentUser.name) return;

    console.log('사용자 정보를 협업 프로바이더에 적용:', currentUser.name);
    
    const userInfoWithRole = {
      ...currentUser,
      projectRole: userProjectRole,
      isProjectOwner
    };
    
    try {
      provider.setAwarenessField('user', userInfoWithRole);
      console.log('프로바이더 사용자 정보 설정 완료', userInfoWithRole);
    } catch (error) {
      console.error('프로바이더 사용자 정보 설정 실패:', error);
    }
  }, [provider, currentUser, userProjectRole, isProjectOwner]);

  // 읽기 전용 모드 변경 시 문서 메타데이터 업데이트 및 전파
  useEffect(() => {
    if (!provider || !ydoc) return;
    
    try {
      const metaData = ydoc.getMap('metaData');
      metaData.set('isReadOnlyMode', isReadOnlyMode);
      
      console.log(`문서 읽기 전용 모드 ${isReadOnlyMode ? '활성화' : '비활성화'} 정보 공유됨`);
    } catch (error) {
      console.error('문서 읽기 전용 모드 정보 공유 실패:', error);
    }
  }, [provider, ydoc, isReadOnlyMode]);
  
  // 다른 사용자의 읽기 전용 모드 변경 감지
  useEffect(() => {
    if (!ydoc) return;
    
    const metaData = ydoc.getMap('metaData');
    
    // 초기값 설정
    const initialReadOnlyMode = metaData.get('isReadOnlyMode');
    if (initialReadOnlyMode !== undefined) {
      const readOnlyValue = typeof initialReadOnlyMode === 'boolean' ? initialReadOnlyMode : false;
      setIsReadOnlyMode(readOnlyValue);
      console.log(`다른 사용자가 설정한 읽기 전용 모드 상태 수신: ${readOnlyValue}`);
    }
    
    // 메타데이터 변경 이벤트 구독
    const handleMetaDataUpdate = () => {
      const updatedReadOnlyMode = metaData.get('isReadOnlyMode');
      if (updatedReadOnlyMode !== undefined) {
        const readOnlyValue = typeof updatedReadOnlyMode === 'boolean' ? updatedReadOnlyMode : false;
        if (readOnlyValue !== isReadOnlyMode) {
          setIsReadOnlyMode(readOnlyValue);
          console.log(`다른 사용자가 읽기 전용 모드를 ${readOnlyValue ? '활성화' : '비활성화'}했습니다.`);
        }
      }
    };
    
    metaData.observe(handleMetaDataUpdate);
    
    return () => {
      metaData.unobserve(handleMetaDataUpdate);
    };
  }, [ydoc, isReadOnlyMode]);

  // 읽기 전용 모드 토글 함수
  const toggleReadOnlyMode = () => {
    if (isButtonDebouncing) return;
    
    setIsButtonDebouncing(true);
    setIsReadOnlyMode(prev => !prev);
    
    setTimeout(() => {
      setIsButtonDebouncing(false);
    }, 1000);
  };

  return {
    // Y.js 관련
    ydoc,
    provider,
    contentLoadedFromYjs,
    
    // 사용자 관련
    currentUser,
    connectedUsers,
    
    // 읽기 전용 모드
    isReadOnlyMode,
    setIsReadOnlyMode,
    toggleReadOnlyMode,
    
    // 초기화 함수
    initializeProvider
  };
}; 