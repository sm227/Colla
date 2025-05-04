"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  VideoIcon,
  UsersIcon,
  PlusIcon,
  ClockIcon,
  CalendarIcon,
  SearchIcon,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: number;
  status: "upcoming" | "completed" | "cancelled";
}

export default function MeetingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 임시 데이터 로드
    const loadMeetings = async () => {
      try {
        // TODO: API 연동
        const mockMeetings: Meeting[] = [
          {
            id: "1",
            title: "주간 팀 미팅",
            date: "2024-03-20T10:00:00",
            duration: 60,
            participants: 8,
            status: "upcoming",
          },
          {
            id: "2",
            title: "프로젝트 기획 회의",
            date: "2024-03-19T14:00:00",
            duration: 90,
            participants: 5,
            status: "completed",
          },
          {
            id: "3",
            title: "디자인 리뷰",
            date: "2024-03-18T11:00:00",
            duration: 45,
            participants: 4,
            status: "completed",
          },
        ];
        setMeetings(mockMeetings);
      } catch (error) {
        console.error("회의 목록 로딩 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMeetings();
  }, []);

  const createNewMeeting = () => {
    const newRoomId = uuidv4().substring(0, 8);
    router.push(`/meeting/${newRoomId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 섹션 */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">화상 회의</h1>
            <p className="text-gray-600">회의를 생성하고 관리하세요</p>
          </div>
          <button
            onClick={createNewMeeting}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            새 회의
          </button>
        </div>

        {/* 검색 및 필터 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="회의 검색..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <SearchIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              <option value="all">모든 회의</option>
              <option value="upcoming">예정된 회의</option>
              <option value="completed">완료된 회의</option>
            </select>
          </div>
        </div>

        {/* 회의 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-900">{meeting.title}</h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    meeting.status === "upcoming"
                      ? "bg-blue-100 text-blue-800"
                      : meeting.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {meeting.status === "upcoming"
                    ? "예정됨"
                    : meeting.status === "completed"
                    ? "완료됨"
                    : "취소됨"}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center text-gray-600">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  <span>{formatDate(meeting.date)}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <ClockIcon className="w-4 h-4 mr-2" />
                  <span>{formatDuration(meeting.duration)}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <UsersIcon className="w-4 h-4 mr-2" />
                  <span>{meeting.participants}명 참여</span>
                </div>
              </div>
              {meeting.status === "upcoming" && (
                <button
                  onClick={() => router.push(`/meeting/${meeting.id}`)}
                  className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <VideoIcon className="w-4 h-4 mr-2" />
                  참여하기
                </button>
              )}
            </div>
          ))}
        </div>

        {/* 회의가 없는 경우 */}
        {meetings.length === 0 && (
          <div className="text-center py-12">
            <VideoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              예정된 회의가 없습니다
            </h3>
            <p className="text-gray-600 mb-4">
              새로운 회의를 생성하여 팀원들과 소통하세요
            </p>
            <button
              onClick={createNewMeeting}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              새 회의 생성
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 