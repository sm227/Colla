"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  UserIcon,
  UserPlusIcon,
  CheckIcon,
  XIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "lucide-react";
import { useProject, ProjectMember, User } from "@/app/contexts/ProjectContext";
import { useAuth } from "@/app/contexts/AuthContext";

export default function ProjectMembersPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { user } = useAuth();
  const { currentProject, inviteProjectMember, removeProjectMember } =
    useProject();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // 프로젝트 멤버 가져오기
  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/projects/${projectId}/members`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "멤버 목록을 가져오는 데 실패했습니다.");
      }

      const data = await response.json();
      setMembers(data);

      // 현재 사용자가 프로젝트 소유자인지 확인
      if (currentProject && user) {
        setIsOwner(currentProject.userId === user.id);
      }
    } catch (err: any) {
      setError(err.message);
      console.error("멤버 목록 조회 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 ID가 변경될 때 멤버 목록 가져오기
  useEffect(() => {
    if (projectId) {
      fetchMembers();
    }
  }, [projectId, currentProject]);

  // 멤버 초대 처리
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteEmail.trim()) {
      setError("초대할 사용자의 이메일을 입력하세요.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await inviteProjectMember(projectId, inviteEmail, inviteRole);

      // 초대 후 멤버 목록 새로고침
      await fetchMembers();

      // 폼 초기화
      setInviteEmail("");
      setInviteRole("member");
    } catch (err: any) {
      setError(err.message || "멤버 초대 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 멤버 제거 처리
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("정말 이 멤버를 프로젝트에서 제거하시겠습니까?")) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await removeProjectMember(projectId, memberId);

      // 멤버 제거 후 목록 새로고침
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || "멤버 제거 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 역할 변경
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/projects/${projectId}/members/${memberId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "역할 변경에 실패했습니다.");
      }

      // 멤버 목록 새로고침
      await fetchMembers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 프로젝트 소유자 확인
  const getProjectOwner = (): User | null => {
    if (!currentProject || !currentProject.user) return null;
    return currentProject.user;
  };

  const projectOwner = getProjectOwner();

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

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {currentProject ? currentProject.name : "프로젝트"} 팀원 관리
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* 멤버 초대 폼 */}
      {isOwner && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            새 팀원 초대
          </h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                이메일
              </label>
              <input
                type="email"
                id="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="초대할 사용자의 이메일"
                required
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                역할
              </label>
              <select
                id="role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="member">일반 멤버</option>
                <option value="admin">관리자</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⋯</span>
                  초대 중...
                </>
              ) : (
                <>
                  <UserPlusIcon className="w-4 h-4 mr-2" />
                  초대하기
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 프로젝트 소유자 표시 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          프로젝트 소유자
        </h2>

        {projectOwner ? (
          <div className="flex items-center p-3 border border-gray-200 rounded-lg">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">{projectOwner.name}</p>
              <p className="text-sm text-gray-500">{projectOwner.email}</p>
            </div>
            <span className="ml-auto bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
              소유자
            </span>
          </div>
        ) : loading ? (
          <div className="animate-pulse h-12 bg-gray-200 rounded"></div>
        ) : (
          <p>소유자 정보를 불러올 수 없습니다.</p>
        )}
      </div>

      {/* 멤버 목록 표시 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          프로젝트 팀원
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse h-16 bg-gray-200 rounded"
              ></div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <p className="text-gray-500">이 프로젝트에는 아직 팀원이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center p-3 border border-gray-200 rounded-lg"
              >
                <div className="bg-gray-100 p-2 rounded-full mr-3">
                  <UserIcon className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">{member.user?.name}</p>
                  <p className="text-sm text-gray-500">{member.user?.email}</p>
                </div>
                <div className="ml-auto flex items-center space-x-2">
                  {member.inviteStatus === "pending" ? (
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">
                      초대 대기 중
                    </span>
                  ) : (
                    <>
                      {/* 역할 선택 (소유자만 변경 가능) */}
                      {isOwner && (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleRoleChange(member.id, e.target.value)
                          }
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="member">일반 멤버</option>
                          <option value="admin">관리자</option>
                        </select>
                      )}

                      {/* 역할 표시 (소유자가 아닌 경우) */}
                      {!isOwner && (
                        <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          {member.role === "admin" ? "관리자" : "멤버"}
                        </span>
                      )}
                    </>
                  )}

                  {/* 멤버 제거 버튼 (소유자만 제거 가능) */}
                  {isOwner && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-100"
                      title="팀원 제거"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
