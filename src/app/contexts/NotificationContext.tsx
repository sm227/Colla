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
  processingInvitation: string;
  fetchNotifications: () => void;
  refreshNotifications: () => void;
  acceptInvitation: (invitationId: string, projectId: string, e: React.MouseEvent) => void;
  rejectInvitation: (invitationId: string, projectId: string, e: React.MouseEvent) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [processingInvitation, setProcessingInvitation] = useState("");

  // 새로운 알림이 있는지 확인
  const hasNewNotifications = notifications.some(notification => !notification.isRead);

  // 알림 데이터 가져오기
  const fetchNotifications = async () => {
    try {
      // 프로젝트 초대 알림 가져오기
      const fetchProjectInvitationsAsNotifications = async (): Promise<Notification[]> => {
        try {
          const response = await fetch("/api/invitations", { method: "GET" });
          if (!response.ok) {
            console.error("Failed to fetch invitations:", response.status);
            return [];
          }
          const invitations: any[] = await response.json();
          return invitations.map((invitation) => ({
            id: invitation.id,
            type: "invitation" as const,
            title: "프로젝트 초대",
            message: `${invitation.project.name} 프로젝트에 초대되었습니다.`,
            link: "/",
            createdAt: invitation.createdAt,
            isRead: false,
            projectId: invitation.projectId,
          }));
        } catch (error) {
          console.error("Error fetching project invitations:", error);
          return [];
        }
      };

      // 작업 알림 가져오기
      const fetchTaskNotifications = async (): Promise<Notification[]> => {
        try {
          const response = await fetch("/api/notifications/tasks", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });
          
          if (!response.ok) {
            console.error("Failed to fetch task notifications:", response.status, await response.text());
            return [];
          }
          
          const taskNotifications: any[] = await response.json();
          
          return taskNotifications.map((notification) => {
            const createdDate = new Date(notification.createdAt);
            const now = new Date();
            const diffInHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
            
            return {
              id: notification.id,
              type: (notification.type || "generic") as Notification["type"],
              title: notification.title || "작업 알림",
              message: notification.content || "새로운 작업 알림이 있습니다.",
              link: notification.link || `/`,
              createdAt: notification.createdAt,
              isRead: notification.isRead || false,
              projectId: notification.projectId,
              taskId: notification.taskId,
            };
          });
        } catch (error) {
          console.error("Error fetching or processing task notifications:", error);
          return [];
        }
      };

      // 모든 알림 합치기
      const invitationNotifications = await fetchProjectInvitationsAsNotifications();
      const taskNotifications = await fetchTaskNotifications();
      const allNotifications = [...invitationNotifications, ...taskNotifications];

      // 생성일시 기준으로 정렬 (최신순)
      const sortedNotifications = allNotifications.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(sortedNotifications);
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
      const response = await fetch(`/api/notifications/${invitationId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
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
      setProcessingInvitation("");
    }
  };

  // 초대 거절
  const rejectInvitation = async (invitationId: string, projectId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setProcessingInvitation(invitationId);
    
    try {
      const response = await fetch(`/api/notifications/${invitationId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId }),
      });
      
      if (response.ok) {
        // 알림 목록에서 제거
        setNotifications(prev => prev.filter(n => n.id !== invitationId));
      } else {
        alert('초대 거절 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('초대 거절 오류:', error);
      alert('초대 거절 중 오류가 발생했습니다.');
    } finally {
      setProcessingInvitation("");
    }
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