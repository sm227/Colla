"use client";

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  ReactNode 
} from 'react';
import { useProject } from './ProjectContext';

interface UserInfo {
  id: string;
  name: string;
  email?: string;
}

interface UserContextType {
  users: Record<string, UserInfo>;
  getUserName: (userId: string) => Promise<string>;
  isLoading: boolean;
}

// 캐시 역할을 하는 전역 객체
const usersCache: Record<string, UserInfo> = {};

const UserContext = createContext<UserContextType>({
  users: {},
  getUserName: async () => "",
  isLoading: true
});

export function UserProvider({ children }: { children: ReactNode }) {
  const { projects } = useProject();
  const [users, setUsers] = useState<Record<string, UserInfo>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // 프로젝트 멤버 정보에서 사용자 정보 추출하여 캐싱
  useEffect(() => {
    const extractUsers: Record<string, UserInfo> = {};
    
    // 모든 프로젝트와 그 멤버 순회
    projects.forEach(project => {
      // 프로젝트 소유자 정보
      if (project.userId && project.user) {
        extractUsers[project.userId] = {
          id: project.userId,
          name: project.user.name,
          email: project.user.email
        };
        usersCache[project.userId] = extractUsers[project.userId];
      }
      
      // 프로젝트 멤버 정보
      project.members.forEach(member => {
        if (member.userId && member.user) {
          extractUsers[member.userId] = {
            id: member.userId,
            name: member.user.name,
            email: member.user.email
          };
          usersCache[member.userId] = extractUsers[member.userId];
        }
      });
    });
    
    setUsers(prev => ({ ...prev, ...extractUsers }));
    setIsLoading(false);
  }, [projects]);
  
  // 모든 사용자 데이터 가져오기
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await fetch('/api/users');
        
        if (response.ok) {
          const userData = await response.json();
          const extractUsers: Record<string, UserInfo> = {};
          
          userData.forEach((user: UserInfo) => {
            if (user.id) {
              extractUsers[user.id] = user;
              usersCache[user.id] = user;
            }
          });
          
          setUsers(prev => ({ ...prev, ...extractUsers }));
        }
      } catch (error) {
        console.error('사용자 목록 조회 오류:', error);
      }
    };
    
    fetchAllUsers();
  }, []);
  
  // ID를 이용해 사용자 이름 가져오기
  const getUserName = useCallback(async (userId: string): Promise<string> => {
    // 캐시에 사용자 정보가 있는 경우
    if (usersCache[userId]) {
      return usersCache[userId].name;
    }
    
    // 현재 state에 있는 경우
    if (users[userId]) {
      return users[userId].name;
    }
    
    try {
      // 프로젝트 멤버 API에서 사용자 정보 가져오기
      const response = await fetch(`/api/users?id=${userId}`);
      
      if (!response.ok) {
        // API가 없거나 실패한 경우 ID 반환
        return userId;
      }
      
      const userData = await response.json();
      
      // 사용자 정보를 캐시와 상태에 저장
      const userInfo: UserInfo = {
        id: userId,
        name: userData.name,
        email: userData.email
      };
      
      usersCache[userId] = userInfo;
      setUsers(prev => ({ ...prev, [userId]: userInfo }));
      
      return userData.name;
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
      return userId; // 실패 시 ID 반환
    }
  }, [users]);
  
  return (
    <UserContext.Provider value={{ users, getUserName, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUsers = () => useContext(UserContext); 