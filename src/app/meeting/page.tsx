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
  FileText,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface Meeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string | null;
  transcript: string | null;
  mainPoints: string | null;
  decisions: string | null;
  actionItems: string | null;
  participants: any;
  createdAt: string;
}

export default function MeetingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    // 실제 회의 데이터 가져오기
    const loadMeetings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/meetings');
        
        if (!response.ok) {
          throw new Error('회의 목록을 불러오는데 실패했습니다');
        }
        
        const result = await response.json();
        setMeetings(result.data);
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

  const calculateDuration = (startTime: string, endTime: string | null) => {
    if (!endTime) return 0;
    
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const durationMs = end - start;
    
    // 밀리초를 분으로 변환
    return Math.round(durationMs / (1000 * 60));
  };

  const formatDuration = (startTime: string, endTime: string | null) => {
    const minutes = calculateDuration(startTime, endTime);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;
  };

  const getParticipantCount = (participants: any) => {
    if (!participants) return 0;
    try {
      // JSON string이라면 파싱
      const parsedParticipants = typeof participants === 'string' 
        ? JSON.parse(participants) 
        : participants;
      
      return Array.isArray(parsedParticipants) ? parsedParticipants.length : 0;
    } catch (error) {
      console.error("참가자 정보 파싱 오류:", error);
      return 0;
    }
  };

  // 회의 상태 판단
  const getMeetingStatus = (startTime: string, endTime: string | null) => {
    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    
    if (endTime) {
      return "completed"; // 종료 시간이 있으면 완료된 회의
    } else if (start > now) {
      return "upcoming"; // 시작 시간이 현재보다 미래면 예정된 회의
    } else {
      return "inprogress"; // 그 외는 진행중
    }
  };

  // 필터링된 회의 목록
  const filteredMeetings = meetings.filter(meeting => {
    // 검색어 필터링
    const meetingTitle = meeting.title || "";
    const searchMatches = 
      meetingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (meeting.mainPoints || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    // 상태 필터링
    const status = getMeetingStatus(meeting.startTime, meeting.endTime);
    const statusMatches = filterStatus === "all" || status === filterStatus;
    
    return searchMatches && statusMatches;
  });

  const viewMeetingDetails = (meetingId: string) => {
    router.push(`/meeting/records/${meetingId}`);
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <SearchIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            </div>
            <select 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">모든 회의</option>
              <option value="upcoming">예정된 회의</option>
              <option value="inprogress">진행 중인 회의</option>
              <option value="completed">완료된 회의</option>
            </select>
          </div>
        </div>

        {/* 회의 목록 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map((meeting) => {
            const status = getMeetingStatus(meeting.startTime, meeting.endTime);
            const participantCount = getParticipantCount(meeting.participants);
            
            return (
              <div
                key={meeting.id}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-gray-900">{meeting.title || "제목 없음"}</h3>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      status === "upcoming"
                        ? "bg-blue-100 text-blue-800"
                        : status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {status === "upcoming"
                      ? "예정됨"
                      : status === "completed"
                      ? "완료됨"
                      : "진행 중"}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    <span>{formatDate(meeting.startTime)}</span>
                  </div>
                  {meeting.endTime && (
                    <div className="flex items-center text-gray-600">
                      <ClockIcon className="w-4 h-4 mr-2" />
                      <span>{formatDuration(meeting.startTime, meeting.endTime)}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600">
                    <UsersIcon className="w-4 h-4 mr-2" />
                    <span>{participantCount}명 참여</span>
                  </div>
                </div>
                
                {status === "upcoming" && (
                  <button
                    onClick={() => router.push(`/meeting/${meeting.id}`)}
                    className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <VideoIcon className="w-4 h-4 mr-2" />
                    참여하기
                  </button>
                )}
                
                {status === "completed" && (
                  <button
                    onClick={() => viewMeetingDetails(meeting.id)}
                    className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    회의록 보기
                  </button>
                )}
                
                {status === "inprogress" && (
                  <button
                    onClick={() => router.push(`/meeting/${meeting.id}`)}
                    className="mt-4 w-full flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    <VideoIcon className="w-4 h-4 mr-2" />
                    참여하기
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 회의가 없는 경우 */}
        {filteredMeetings.length === 0 && (
          <div className="text-center py-12">
            <VideoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery 
                ? "검색 결과가 없습니다" 
                : filterStatus !== "all" 
                  ? `${filterStatus === "upcoming" ? "예정된" : filterStatus === "completed" ? "완료된" : "진행 중인"} 회의가 없습니다`
                  : "회의 기록이 없습니다"}
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