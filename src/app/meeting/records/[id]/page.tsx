"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Clock, Users, FileText, CheckCircle, ListTodo } from "lucide-react";

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

export default function MeetingRecordPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary'>('summary');

  useEffect(() => {
    const fetchMeetingRecord = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/meetings/${params.id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.error("회의 기록을 찾을 수 없습니다");
            router.push('/meeting');
            return;
          }
          throw new Error('회의 기록을 불러오는데 실패했습니다');
        }
        
        const result = await response.json();
        setMeeting(result.data);
      } catch (error) {
        console.error("회의 기록 로딩 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetingRecord();
  }, [params.id, router]);

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

  if (!meeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <FileText className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">회의 기록을 찾을 수 없습니다</h2>
        <p className="text-gray-600 mb-6">요청하신 회의 기록이 존재하지 않거나 접근 권한이 없습니다.</p>
        <button
          onClick={() => router.push('/meeting')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          회의 목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 섹션 */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/meeting')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            회의 목록으로 돌아가기
          </button>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{meeting.title || "제목 없음"}</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-600">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                <span>{formatDate(meeting.startTime)}</span>
              </div>
              
              {meeting.endTime && (
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-blue-600" />
                  <span>{formatDuration(meeting.startTime, meeting.endTime)}</span>
                </div>
              )}
              
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                <span>{getParticipantCount(meeting.participants)}명 참여</span>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'summary'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('summary')}
          >
            회의 요약
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'transcript'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('transcript')}
          >
            전체 대화
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {activeTab === 'summary' ? (
            <div className="space-y-6">
              {/* 주요 논의 사항 */}
              {meeting.mainPoints && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    주요 논의 사항
                  </h2>
                  <div className="text-gray-700 whitespace-pre-line pl-7">
                    {meeting.mainPoints}
                  </div>
                </div>
              )}
              
              {/* 결정된 사항 */}
              {meeting.decisions && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    결정된 사항
                  </h2>
                  <div className="text-gray-700 whitespace-pre-line pl-7">
                    {meeting.decisions}
                  </div>
                </div>
              )}
              
              {/* 후속 조치 필요 사항 */}
              {meeting.actionItems && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <ListTodo className="h-5 w-5 mr-2 text-orange-600" />
                    후속 조치 필요 사항
                  </h2>
                  <div className="text-gray-700 whitespace-pre-line pl-7">
                    {meeting.actionItems}
                  </div>
                </div>
              )}
              
              {/* 요약 정보가 없는 경우 */}
              {!meeting.mainPoints && !meeting.decisions && !meeting.actionItems && (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">요약 정보가 없습니다</h3>
                  <p className="text-gray-500">
                    이 회의에 대한 요약 정보가 아직 생성되지 않았습니다.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                회의 전체 대화
              </h2>
              
              {meeting.transcript ? (
                <div className="text-gray-700 whitespace-pre-line p-4 bg-gray-50 rounded-lg border border-gray-200 overflow-auto max-h-[600px]">
                  {meeting.transcript}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">전사 내용이 없습니다</h3>
                  <p className="text-gray-500">
                    이 회의에 대한 대화 기록이 없습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 