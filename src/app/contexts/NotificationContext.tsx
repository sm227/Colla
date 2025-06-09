"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 알림 타입 정의
export type Notification = {
  id: string;
  type: "invitation" | "document_update" | "task_assigned" | "generic" | "task_created" | "task_updated";
  title: string;
  message: string;
  link: string;
  createdAt: string;
  isRead?: boolean;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  projectId?: string;
  taskId?: string;
};

interface NotificationContextType {
  notifications: Notification[];
  showNotificationPanel: boolean;
  setShowNotificationPanel: (show: boolean) => void;
  hasNewNotifications: boolean;
  processingInvitation: string | null;
  fetchNotifications: () => void;
  refreshNotifications: () => void;
  markAllAsRead: () => void;
  markAsRead: (notificationId: string) => void;
  acceptInvitation: (invitationId: string, projectId: string, e: React.MouseEvent) => void;
  rejectInvitation: (invitationId: string, projectId: string, e: React.MouseEvent) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  // localStorage에서 읽은 알림 ID들을 가져오는 함수
  const getReadNotificationIds = (): Set<string> => {
    if (typeof window === 'undefined') return new Set();
    try {
      const readIds = localStorage.getItem('readNotificationIds');
      return readIds ? new Set(JSON.parse(readIds)) : new Set();
    } catch (error) {
      console.error('읽은 알림 ID 가져오기 오류:', error);
      return new Set();
    }
  };

  // localStorage에 읽은 알림 ID들을 저장하는 함수
  const saveReadNotificationIds = (readIds: Set<string>) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('readNotificationIds', JSON.stringify(Array.from(readIds)));
    } catch (error) {
      console.error('읽은 알림 ID 저장 오류:', error);
    }
  };

  // 알림 데이터 가져오기
  const fetchNotifications = async () => {
    try {
      console.log("=== 알림 가져오기 시작 ===");
      
      // 읽은 알림 ID 목록 가져오기
      const readNotificationIds = getReadNotificationIds();
      console.log('localStorage에서 읽은 알림 ID:', Array.from(readNotificationIds));

      // 프로젝트 초대 알림 가져오기
      const fetchProjectInvitationsAsNotifications = async (): Promise<Notification[]> => {
        try {
          const response = await fetch("/api/projects/invitations", { 
            method: "GET",
            headers: {
              "Cache-Control": "no-cache",
            },
          });
          if (!response.ok) {
            console.error("Failed to fetch invitations:", response.status);
            return [];
          }
          const invitations: any[] = await response.json();
          
          const invitationNotifications = invitations.map((invitation) => ({
            id: invitation.id,
            type: "invitation" as const,
            title: "프로젝트 초대",
            message: `${invitation.project.name} 프로젝트에 초대되었습니다.`,
            link: "/projects/invitations",
            createdAt: invitation.createdAt,
            isRead: readNotificationIds.has(invitation.id), // localStorage에서 읽음 상태 확인
            projectId: invitation.projectId,
          }));
          
          return invitationNotifications;
        } catch (error) {
          console.error("Error fetching invitations:", error);
          return [];
        }
      };

      // 작업 알림 가져오기
      const fetchTaskNotifications = async (): Promise<Notification[]> => {
        try {
          console.log("=== 작업 알림 가져오기 시작 ===");
          
          const response = await fetch("/api/notifications/tasks", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          
          // 401 Unauthorized 에러인 경우 빈 배열 반환
          if (response.status === 401) {
            console.log("사용자가 인증되지 않았습니다. 작업 알림을 건너뜁니다.");
            return [];
          }
          
          if (!response.ok) {
            console.error("Failed to fetch task notifications:", response.status, await response.text());
            return [];
          }
          
          const taskNotifications: any[] = await response.json();
          console.log(`📋 작업 알림 ${taskNotifications.length}개 조회됨:`, taskNotifications);
          
          return taskNotifications.map((notification) => {
            return {
              id: notification.id,
              type: notification.type,
              title: notification.title,
              message: notification.message,
              link: notification.link,
              createdAt: notification.createdAt,
              isRead: readNotificationIds.has(notification.id), // localStorage에서 읽음 상태 확인
              projectId: notification.projectId,
            };
          });
          
        } catch (error) {
          console.error("작업 알림 가져오기 오류:", error);
          return [];
        }
      };

      // 모든 알림 합치기
      const [invitations, taskNotifications] = await Promise.all([
        fetchProjectInvitationsAsNotifications(),
        fetchTaskNotifications()
      ]);

      const allNotifications = [...invitations, ...taskNotifications];
      
      // 시간순 정렬 (최신이 위에)
      const sortedNotifications = allNotifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log(`총 ${sortedNotifications.length}개의 알림을 가져왔습니다.`);
      
      setNotifications(sortedNotifications);
      setHasNewNotifications(sortedNotifications.some(notification => !notification.isRead));
    } catch (error) {
      console.error('알림을 가져오는 중 오류:', error);
    }
  };

  // 초대 수락
  const acceptInvitation = async (invitationId: string, projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setProcessingInvitation(invitationId);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // 알림 목록에서 제거
        setNotifications(prev => prev.filter(n => n.id !== invitationId));
        
        // 성공 메시지 (선택사항)
        alert('초대를 수락했습니다!');
      } else {
        alert('초대 수락 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('초대 수락 오류:', error);
      alert('초대 수락 중 오류가 발생했습니다.');
    } finally {
      setProcessingInvitation(null);
    }
  };

  // 초대 거절
  const rejectInvitation = async (invitationId: string, projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setProcessingInvitation(invitationId);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // 알림 목록에서 제거
        setNotifications(prev => prev.filter(n => n.id !== invitationId));
        alert('초대를 거절했습니다.');
      } else {
        alert('초대 거절 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('초대 거절 오류:', error);
      alert('초대 거절 중 오류가 발생했습니다.');
    } finally {
      setProcessingInvitation(null);
    }
  };

  // 모든 알림을 읽음 처리하는 함수
  const markAllAsRead = () => {
    // 현재 읽은 알림 ID 목록 가져오기
    const readNotificationIds = getReadNotificationIds();
    
    // 모든 알림 ID를 읽음 목록에 추가
    notifications.forEach(notification => {
      readNotificationIds.add(notification.id);
    });
    
    // localStorage에 저장
    saveReadNotificationIds(readNotificationIds);
    
    // 상태 업데이트
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => ({
        ...notification,
        isRead: true
      }))
    );
    
    // 새 알림 없음으로 설정
    setHasNewNotifications(false);
    
    console.log("✅ 모든 알림을 읽음 처리하고 localStorage에 저장했습니다.");
  };

  // 개별 알림을 읽음 처리하는 함수
  const markAsRead = (notificationId: string) => {
    // 현재 읽은 알림 ID 목록 가져오기
    const readNotificationIds = getReadNotificationIds();
    
    // 해당 알림 ID를 읽음 목록에 추가
    readNotificationIds.add(notificationId);
    
    // localStorage에 저장
    saveReadNotificationIds(readNotificationIds);
    
    // 해당 알림만 읽음 처리
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      )
    );
    
    // 새 알림 여부 재계산
    setHasNewNotifications(prev => {
      const updatedNotifications = notifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      );
      return updatedNotifications.some(notification => !notification.isRead);
    });
    
    console.log(`✅ 알림 ${notificationId}을 읽음 처리했습니다.`);
  };

  // 컴포넌트 마운트 시 알림 가져오기
  useEffect(() => {
    fetchNotifications();
    
    // 5분마다 알림 새로고침
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const value = {
    notifications,
    showNotificationPanel,
    setShowNotificationPanel,
    hasNewNotifications,
    processingInvitation,
    fetchNotifications,
    refreshNotifications: fetchNotifications,
    markAllAsRead,
    markAsRead,
    acceptInvitation,
    rejectInvitation,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 