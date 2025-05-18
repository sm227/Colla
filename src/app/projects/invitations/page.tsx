"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  XIcon,
  ArrowLeftIcon,
  BellIcon,
  FolderIcon,
} from "lucide-react";
import { useProject } from "@/app/contexts/ProjectContext";
import { useAuth } from "@/app/contexts/AuthContext";

// 초대 정보를 위한 타입 정의
type Invitation = {
  id: string;
  projectId: string;
  userId: string;
  role: string;
  inviteStatus: string;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    description?: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  };
};

export default function ProjectInvitationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { acceptProjectInvitation, rejectProjectInvitation } = useProject();

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 초대 목록 가져오기
  const fetchInvitations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/projects/invitations", {
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "초대 목록을 가져오는 데 실패했습니다.");
      }

      const data = await response.json();
      setInvitations(data);
    } catch (err: any) {
      setError(err.message);
      console.error("초대 목록 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 초대 목록 가져오기
  useEffect(() => {
    if (user) {
      fetchInvitations();
    }
  }, [user]);

  // 초대 수락 처리
  const handleAccept = async (projectId: string) => {
    try {
      setProcessingId(projectId);
      setError(null);

      await acceptProjectInvitation(projectId);

      // 목록 새로고침
      await fetchInvitations();
    } catch (err: any) {
      setError(err.message || "초대 수락 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  // 초대 거절 처리
  const handleReject = async (projectId: string) => {
    try {
      setProcessingId(projectId);
      setError(null);

      await rejectProjectInvitation(projectId);

      // 목록 새로고침
      await fetchInvitations();
    } catch (err: any) {
      setError(err.message || "초대 거절 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          뒤로 가기
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">프로젝트 초대</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* 초대 목록 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          대기 중인 초대
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse h-20 bg-gray-200 rounded"
              ></div>
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8">
            <BellIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">대기 중인 초대가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    <div className="bg-blue-100 p-2 rounded-full mr-3">
                      <FolderIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg">
                        {invitation.project.name}
                      </h3>
                      {invitation.project.description && (
                        <p className="text-gray-600 text-sm mt-1">
                          {invitation.project.description}
                        </p>
                      )}
                      {invitation.project.user && (
                        <p className="text-gray-500 text-sm mt-2">
                          초대한 사람: {invitation.project.user.name} (
                          {invitation.project.user.email})
                        </p>
                      )}
                      <div className="mt-2">
                        <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          {invitation.role === "admin" ? "관리자" : "일반 멤버"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleReject(invitation.projectId)}
                      disabled={processingId === invitation.projectId}
                      className="flex items-center justify-center p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-50"
                      title="초대 거절"
                    >
                      <XIcon className="w-5 h-5" />
                    </button>

                    <button
                      onClick={() => handleAccept(invitation.projectId)}
                      disabled={processingId === invitation.projectId}
                      className="flex items-center justify-center p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 disabled:opacity-50"
                      title="초대 수락"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {processingId === invitation.projectId && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                    처리 중...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
