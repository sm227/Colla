"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";
import {
  Share2Icon,
  UsersIcon,
  User as UserIcon,
  Mic as MicrophoneIcon,
  MicOff as MicrophoneOffIcon,
  Video as VideoIcon,
  VideoOff as VideoOffIcon,
  PhoneOff as PhoneOffIcon,
  MessageSquare as MessageIcon,
  X as XIcon,
  Monitor as MonitorIcon,
  MonitorOff as MonitorOffIcon,
} from "lucide-react";
import SpeechToText from "./SpeechToText";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";

interface PeerStream {
  userId: string;
  stream: MediaStream;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  userName?: string;
}

interface ToggleEvent {
  roomId: string;
  userId: string;
  enabled: boolean;
}

interface Message {
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
}

interface PreJoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  localStream: MediaStream | null;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  joinMeeting: () => void;
}

function SummaryModal({ isOpen, onClose, summary }: SummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          회의 요약
        </h2>
        <div className="prose dark:prose-invert max-w-none">
          {summary.split("\n").map((line, index) => (
            <p key={index} className="text-gray-700 dark:text-gray-300">
              {line}
            </p>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({
  message,
  isVisible,
  onHide,
}: {
  message: string;
  isVisible: boolean;
  onHide: () => void;
}) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onHide();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-fade-in">
      <div className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <span className="text-green-400">✓</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

function ParticipantsPanel({
  isOpen,
  onClose,
  myPeerId,
  myUserName,
  peerStreams,
  myStream,
  isMyAudioEnabled,
  isMyVideoEnabled,
}: {
  isOpen: boolean;
  onClose: () => void;
  myPeerId: string;
  myUserName: string;
  peerStreams: PeerStream[];
  myStream: MediaStream | null;
  isMyAudioEnabled: boolean;
  isMyVideoEnabled: boolean;
}) {
  if (!isOpen) return null;

  const myHasNoDevices = myStream && myStream.getTracks().length === 0 && !isMyAudioEnabled && !isMyVideoEnabled;
  const totalParticipants = peerStreams.length + 1; // 나 + 다른 참가자들

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-gray-900/95 backdrop-blur-sm shadow-2xl z-50 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">참가자</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <p className="text-sm text-gray-400">총 {totalParticipants}명</p>
      </div>

      {/* 참가자 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* 나 */}
        <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">{myUserName} (나)</p>
                {myHasNoDevices && (
                  <p className="text-xs text-yellow-400">시청 전용</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {!isMyAudioEnabled && (
                <div className="bg-red-500/80 p-1.5 rounded" title="마이크 꺼짐">
                  <MicrophoneOffIcon className="w-3 h-3 text-white" />
                </div>
              )}
              {!isMyVideoEnabled && (
                <div className="bg-red-500/80 p-1.5 rounded" title="카메라 꺼짐">
                  <VideoOffIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 다른 참가자들 */}
        {peerStreams.map((peer) => {
          const hasNoDevices = peer.stream.getTracks().length === 0 && !peer.isAudioEnabled && !peer.isVideoEnabled;

          return (
            <div key={peer.userId} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-gray-300" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{peer.userName || `참가자 ${peer.userId.slice(0, 6)}`}</p>
                    {hasNoDevices && (
                      <p className="text-xs text-yellow-400">시청 전용</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!peer.isAudioEnabled && (
                    <div className="bg-red-500/80 p-1.5 rounded" title="마이크 꺼짐">
                      <MicrophoneOffIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {!peer.isVideoEnabled && (
                    <div className="bg-red-500/80 p-1.5 rounded" title="카메라 꺼짐">
                      <VideoOffIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreJoinModal({
  isOpen,
  onClose,
  localStream,
  isAudioEnabled,
  isVideoEnabled,
  toggleAudio,
  toggleVideo,
  joinMeeting,
}: PreJoinModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (!isOpen) return null;

  const hasNoDevices = !isAudioEnabled && !isVideoEnabled && localStream?.getTracks().length === 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-white">회의 참여 설정</h2>

        {hasNoDevices && (
          <div className="mb-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
            <p className="text-yellow-200 text-sm">
              ⚠️ 카메라와 마이크를 찾을 수 없습니다. 시청 전용 모드로 참여합니다.
            </p>
          </div>
        )}

        <div className="mb-6">
          <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-lg mb-4">
            <video
              ref={videoRef}
              muted
              autoPlay
              playsInline
              className={`w-full h-full object-cover transform scale-x-[-1] ${
                !isVideoEnabled ? "hidden" : ""
              }`}
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                <UsersIcon className="w-20 h-20 text-gray-400" />
                {hasNoDevices && (
                  <p className="text-gray-400 text-sm">디바이스 없음</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center space-x-4 mb-6">
            <button
              onClick={toggleAudio}
              disabled={hasNoDevices}
              className={`p-4 rounded-full transition-all duration-200 ${
                hasNoDevices
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : isAudioEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
              title={hasNoDevices ? "마이크를 찾을 수 없습니다" : ""}
            >
              {isAudioEnabled ? (
                <MicrophoneIcon className="w-6 h-6" />
              ) : (
                <MicrophoneOffIcon className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={toggleVideo}
              disabled={hasNoDevices}
              className={`p-4 rounded-full transition-all duration-200 ${
                hasNoDevices
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : isVideoEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
              title={hasNoDevices ? "카메라를 찾을 수 없습니다" : ""}
            >
              {isVideoEnabled ? (
                <VideoIcon className="w-6 h-6" />
              ) : (
                <VideoOffIcon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            취소
          </button>
          <button
            onClick={joinMeeting}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            회의 참여
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MeetingRoom({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [peerStreams, setPeerStreams] = useState<PeerStream[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<any>(null);
  const peerRef = useRef<Peer>();
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<{ [key: string]: any }>({});
  const myPeerIdRef = useRef<string>("");
  const [showToast, setShowToast] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPreJoinModal, setShowPreJoinModal] = useState(true);
  const [hasJoinedMeeting, setHasJoinedMeeting] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const meetingStartTimeRef = useRef<Date>(new Date());
  const [isCreator, setIsCreator] = useState(false); // 방장 여부

  // 화면 공유 관련 상태
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [sharingUserId, setSharingUserId] = useState<string | null>(null); // 현재 화면을 공유 중인 사용자 ID
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  // 화면 공유 창 크기 및 위치 상태
  const [screenShareSize, setScreenShareSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth - 32 : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight - 160 : 700,
    x: 16,
    y: 16,
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>("");
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0, startX: 0, startY: 0 });

  // 사용자 이름 관리
  const [myUserName, setMyUserName] = useState<string>("익명");

  // 음성 활동 감지 상태
  const [isSpeaking, setIsSpeaking] = useState(false); // 내가 말하고 있는지
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set()); // 말하고 있는 다른 사용자들
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // 연결 정리 함수 (useCallback으로 메모이제이션)
  const cleanupConnections = useCallback(async () => {
    // 1. 서버에 방 나가기 알림 (내 ID 전송)
    if (socketRef.current && socketRef.current.connected) {
      console.log("📤 서버에 leave-room 이벤트 전송:", params.id, myPeerIdRef.current);
      socketRef.current.emit('leave-room', params.id, myPeerIdRef.current);

      // 소켓 이벤트가 전송될 시간을 줌
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 2. 미디어 스트림 종료
    if (myStream) {
      console.log("🎥 미디어 스트림 종료");
      myStream.getTracks().forEach((track) => {
        track.stop();
        console.log("  - 트랙 종료:", track.kind);
      });
    }

    // 2-1. 화면 공유 스트림 종료
    if (screenStream) {
      console.log("🖥️ 화면 공유 스트림 종료");
      screenStream.getTracks().forEach((track) => {
        track.stop();
        console.log("  - 화면 공유 트랙 종료:", track.kind);
      });
    }

    // 3. 모든 Peer 연결 종료
    console.log("🔗 Peer 연결 종료:", Object.keys(peersRef.current).length, "개");
    Object.entries(peersRef.current).forEach(([userId, call]: [string, any]) => {
      console.log("  - Peer 연결 종료:", userId);
      if (call && call.close) {
        call.close();
      }
    });

    // 4. Socket 연결 해제
    if (socketRef.current) {
      console.log("🔌 Socket 연결 해제");
      socketRef.current.disconnect();
    }

    // 5. Peer 인스턴스 제거
    if (peerRef.current) {
      console.log("🗑️ Peer 인스턴스 제거");
      peerRef.current.destroy();
    }

    // 6. 상태 초기화
    console.log("🧹 상태 초기화");
    setMyStream(null);
    setPeerStreams([]);
    setScreenStream(null);
    setIsScreenSharing(false);
    setSharingUserId(null);
    peersRef.current = {};
  }, [myStream, screenStream, params.id]);

  // 음성 활동 감지 함수
  const detectVoiceActivity = useCallback((stream: MediaStream) => {
    try {
      // 기존 분석 중지
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // AudioContext 생성
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // 평균 음량 계산
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // 임계값 설정 (20 이상이면 말하고 있다고 판단)
        const threshold = 20;
        const speaking = average > threshold;

        setIsSpeaking(speaking);

        // 말하는 상태가 변경되면 Socket으로 알림
        if (speaking !== isSpeaking) {
          socketRef.current?.emit('voice-activity', {
            roomId: params.id,
            userId: myPeerIdRef.current,
            isSpeaking: speaking
          });
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (error) {
      console.error("음성 활동 감지 오류:", error);
    }
  }, [params.id, isSpeaking]);

  // 음성 활동 감지 정리
  const cleanupVoiceDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // 스트림이 변경될 때 음성 활동 감지 시작
  useEffect(() => {
    if (myStream && isAudioEnabled) {
      detectVoiceActivity(myStream);
    } else {
      setIsSpeaking(false);
      socketRef.current?.emit('voice-activity', {
        roomId: params.id,
        userId: myPeerIdRef.current,
        isSpeaking: false
      });
    }

    return () => {
      cleanupVoiceDetection();
    };
  }, [myStream, isAudioEnabled, detectVoiceActivity, cleanupVoiceDetection, params.id]);

  // 사용자 정보 로드
  useEffect(() => {
    const loadUserInfo = async () => {
      console.log("👤 AuthContext User:", user);
      console.log("⏳ Loading:", loading);

      if (user?.name) {
        setMyUserName(user.name);
        console.log("✅ 사용자 이름 설정:", user.name);
      } else if (!loading && !user) {
        // 로그인되지 않은 경우, API 직접 호출 시도
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            if (data.authenticated && data.user?.name) {
              setMyUserName(data.user.name);
              console.log("✅ API에서 사용자 이름 가져옴:", data.user.name);
            }
          }
        } catch (error) {
          console.log("⚠️ 사용자 정보 로드 실패, 익명으로 표시");
        }
      }
    };

    loadUserInfo();
  }, [user, loading]);

  useEffect(() => {
    let localStream: MediaStream | null = null;
    let isComponentMounted = true;

    const initializeMedia = async () => {
      try {
        // 먼저 비디오와 오디오 모두 시도
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
        } catch (bothError) {
          // 비디오만 시도
          try {
            localStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            setIsAudioEnabled(false);
          } catch (videoError) {
            // 오디오만 시도
            try {
              localStream = await navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true,
              });
              setIsVideoEnabled(false);
            } catch (audioError) {
              // 둘 다 실패 - 빈 스트림 생성
              localStream = new MediaStream();
              setIsVideoEnabled(false);
              setIsAudioEnabled(false);
            }
          }
        }

        if (!isComponentMounted) {
          localStream?.getTracks().forEach((track) => track.stop());
          return;
        }

        setMyStream(localStream);
        if (myVideoRef.current && localStream) {
          myVideoRef.current.srcObject = localStream;
        }
      } catch (error) {
        console.error("Error accessing media devices:", error);
        // 완전 실패 시에도 빈 스트림으로 계속 진행
        const emptyStream = new MediaStream();
        setMyStream(emptyStream);
        setIsVideoEnabled(false);
        setIsAudioEnabled(false);
      }
    };

    initializeMedia();

    return () => {
      isComponentMounted = false;
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 회의 시작 시 DB에 기본 정보 저장 (또는 기존 회의 불러오기)
  const createMeetingInDatabase = useCallback(async () => {
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: params.id, // URL의 회의 ID 사용
          title: `Meeting ${new Date().toLocaleString("ko-KR")}`,
          startTime: meetingStartTimeRef.current.toISOString(),
          creatorId: myPeerIdRef.current, // 회의 생성자 ID 저장
          // 나머지 필드는 나중에 업데이트됨
        }),
      });

      if (!response.ok) {
        throw new Error("회의 생성에 실패했습니다");
      }

      const data = await response.json();
      setMeetingId(data.data.id);

      if (data.isExisting) {
        console.log("기존 회의를 불러왔습니다:", data.data.id);
        // 기존 회의의 생성자인지 확인
        setIsCreator(data.data.creatorId === myPeerIdRef.current);
      } else {
        console.log("새 회의가 DB에 저장되었습니다:", data.data.id);
        // 새 회의를 만들었으므로 방장임
        setIsCreator(true);
      }
    } catch (error) {
      console.error("회의 생성 중 오류 발생:", error);
    }
  }, [params.id]);

  const initializePeer = useCallback(() => {
    // myStream이 없어도 계속 진행 (빈 스트림도 허용)
    if (!myStream && myStream !== null) return;

    const socketUrl = process.env.NEXT_PUBLIC_MEET_SOCKET_URL || "http://localhost:4000";
    console.log("🔌 Socket.io 서버 연결 시도:", socketUrl);

    socketRef.current = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Socket.io 연결 상태 로그
    socketRef.current.on("connect", () => {
      console.log("✅ Socket.io 연결 성공! Socket ID:", socketRef.current.id);
    });

    socketRef.current.on("connect_error", (error: any) => {
      console.error("❌ Socket.io 연결 실패:", error);
    });

    socketRef.current.on("disconnect", (reason: string) => {
      console.log("🔌 Socket.io 연결 해제:", reason);
    });

    const peer = new Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
    });

    peerRef.current = peer;

    peer.on("open", async (id) => {
      myPeerIdRef.current = id;
      console.log("🆔 내 Peer ID:", id);
      console.log("👤 사용자 이름:", myUserName);

      // Peer ID가 생성된 후 회의를 DB에 저장
      await createMeetingInDatabase();

      console.log("🚪 회의방 참여 요청:", params.id);
      socketRef.current.emit("join-room", params.id, id, {
        isVideoEnabled,
        isAudioEnabled,
        userName: myUserName,
      });
    });

    // 다른 참가자의 호출 처리
    peer.on("call", (call) => {
      const metadata = call.metadata;
      const isScreenShareCall = metadata?.type === 'screen-share';

      console.log(`📞 Call 수신 from ${call.peer}, metadata:`, metadata);

      // 화면 공유 call이면 빈 스트림으로 응답, 일반 call이면 내 비디오로 응답
      if (isScreenShareCall) {
        console.log("🖥️ 화면 공유 call로 인식");
        const emptyStream = new MediaStream();
        call.answer(emptyStream);
      } else {
        call.answer(myStream || undefined);
      }

      call.on("stream", (userVideoStream) => {
        const userId = call.peer;

        // 메타데이터로 화면 공유 확인 (더 정확함)
        if (isScreenShareCall) {
          console.log("🖥️ 화면 공유 스트림 수신:", userId);
          setScreenStream(userVideoStream);
          setSharingUserId(userId);

          // 화면 공유 비디오 엘리먼트에 설정
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = userVideoStream;
            console.log("✅ 화면 공유 비디오 엘리먼트에 설정 완료");
          }
        } else {
          // 일반 비디오 스트림
          console.log("📹 일반 비디오 스트림 수신:", userId);
          addPeerStream(userId, userVideoStream);
        }
      });

      call.on("close", () => {
        console.log("📴 Call 종료:", call.peer);
        if (isScreenShareCall) {
          setScreenStream(null);
          if (sharingUserId === call.peer) {
            setSharingUserId(null);
          }
        } else {
          setPeerStreams((prev) => prev.filter((p) => p.userId !== call.peer));
        }
      });

      // 화면 공유 call은 별도로 저장하지 않음 (peersRef는 비디오 call만)
      if (!isScreenShareCall) {
        peersRef.current[call.peer] = call;
      }
    });

    // Socket 이벤트 리스너
    // 기존 참가자 목록 수신 (방 입장 시)
    socketRef.current.on("existing-participants", (participants: Array<{ userId: string; userState: any }>) => {
      console.log("📋 기존 참가자 목록 수신:", participants.length, "명", participants);
      participants.forEach(({ userId, userState }) => {
        console.log("🔗 기존 참가자와 연결 시도:", userId);
        connectToNewUser(userId, myStream, userState);
      });
    });

    socketRef.current.on("user-connected", (userId: string, userState: any) => {
      console.log("👤 새 참가자 입장:", userId);
      connectToNewUser(userId, myStream, userState);
    });

    socketRef.current.on("user-disconnected", (userId: string) => {
      if (peersRef.current[userId]) {
        peersRef.current[userId].close();
        delete peersRef.current[userId];
        setPeerStreams((prev) => prev.filter((p) => p.userId !== userId));
      }
    });

    socketRef.current.on(
      "user-toggled-video",
      ({ userId, enabled }: { userId: string; enabled: boolean }) => {
        setPeerStreams((prev) =>
          prev.map((peer) =>
            peer.userId === userId ? { ...peer, isVideoEnabled: enabled } : peer
          )
        );
      }
    );

    socketRef.current.on(
      "user-toggled-audio",
      ({ userId, enabled }: { userId: string; enabled: boolean }) => {
        setPeerStreams((prev) =>
          prev.map((peer) =>
            peer.userId === userId ? { ...peer, isAudioEnabled: enabled } : peer
          )
        );
      }
    );

    // 메시지 히스토리 수신
    socketRef.current.on("message-history", (messages: Message[]) => {
      setMessages(messages);
    });

    // 새 메시지 수신
    socketRef.current.on("receive-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    // 방장이 회의를 종료한 경우
    socketRef.current.on("meeting-ended-by-host", async (roomId: string) => {
      console.log("👑 방장이 회의를 종료했습니다.");
      alert("방장이 회의를 종료했습니다.");

      // 연결 정리
      await cleanupConnections();

      // 회의 목록 페이지로 이동
      router.push('/meeting');
    });

    // 마지막 참가자 이벤트 수신 (더 이상 사용하지 않지만 하위 호환성 유지)
    socketRef.current.on("last-participant-leaving", async (roomId: string) => {
      console.log("🏁 마지막 참가자입니다. 회의를 종료하고 요약합니다.");

      // 메시지가 있으면 요약 및 DB 업데이트
      if (messages.length > 0) {
        setIsSummarizing(true);
        try {
          // 마지막 참가자이므로 isLastParticipant = true 전달
          const summary = await summarizeMessages(messages, true);
          setSummary(summary);
          setShowSummary(true);
        } catch (error) {
          console.error("Failed to summarize meeting:", error);
          alert("회의 요약 중 오류가 발생했습니다.");
        } finally {
          setIsSummarizing(false);
        }
      } else {
        // 메시지가 없어도 마지막 참가자이면 회의를 완료 처리
        console.log("📝 메시지가 없지만 마지막 참가자이므로 회의를 완료 처리합니다.");
        try {
          await updateMeetingInDatabase("", {
            mainPoints: "",
            decisions: "",
            actionItems: ""
          }, true);
        } catch (error) {
          console.error("Failed to update meeting:", error);
        }
      }
    });

    // 화면 공유 시작 이벤트 수신
    socketRef.current.on("user-screen-share-started", (userId: string) => {
      console.log(`🖥️ ${userId}가 화면 공유를 시작했습니다`);
      setSharingUserId(userId);
    });

    // 화면 공유 종료 이벤트 수신
    socketRef.current.on("user-screen-share-stopped", (userId: string) => {
      console.log(`🛑 ${userId}가 화면 공유를 종료했습니다`);
      if (sharingUserId === userId) {
        setSharingUserId(null);
        setScreenStream(null);
      }
    });

    // 음성 활동 이벤트 수신
    socketRef.current.on("user-voice-activity", ({ userId, isSpeaking }: { userId: string; isSpeaking: boolean }) => {
      setSpeakingUsers((prev) => {
        const newSet = new Set(prev);
        if (isSpeaking) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    });
  }, [myStream, params.id, isVideoEnabled, isAudioEnabled, messages, router, cleanupConnections, createMeetingInDatabase, sharingUserId]);

  const handleJoinMeeting = async () => {
    // 회의 상태 확인
    const canJoin = await checkMeetingStatus();

    if (!canJoin) {
      alert('이미 종료된 회의입니다. 참여할 수 없습니다.');
      router.push('/meeting');
      return;
    }

    setShowPreJoinModal(false);
    setHasJoinedMeeting(true);

    // initializePeer에서 Peer ID가 생성된 후 회의를 DB에 저장함
    initializePeer();
  };

  const handleCancelJoin = () => {
    router.push("/");
  };

  const connectToNewUser = (
    userId: string,
    stream: MediaStream,
    userState: any
  ) => {
    // 자기 자신은 무시
    if (userId === myPeerIdRef.current) {
      console.log("⚠️ 자기 자신은 연결하지 않음:", userId);
      return;
    }

    // 이미 연결된 피어는 무시
    if (peersRef.current[userId]) {
      console.log("⚠️ 이미 연결된 사용자:", userId);
      return;
    }

    console.log("📞 사용자에게 전화 걸기:", userId, "상태:", userState);

    try {
      const call = peerRef.current?.call(userId, stream);
      if (call) {
        console.log("✅ 통화 연결 성공:", userId);
        call.on("stream", (userVideoStream) => {
          console.log("🎥 스트림 수신:", userId);
          addPeerStream(userId, userVideoStream, userState);
        });

        call.on("close", () => {
          console.log("📴 통화 종료:", userId);
          setPeerStreams((prev) => prev.filter((p) => p.userId !== userId));
          delete peersRef.current[userId];
        });

        peersRef.current[userId] = call;
      } else {
        console.error("❌ 통화 연결 실패 - call이 null:", userId);
      }
    } catch (error) {
      console.error(`❌ 사용자 연결 중 오류 ${userId}:`, error);
    }
  };

  const addPeerStream = (
    userId: string,
    stream: MediaStream,
    userState?: any
  ) => {
    console.log("📝 스트림 추가:", userId, "사용자 상태:", userState);
    setPeerStreams((prev) => {
      const filteredStreams = prev.filter((p) => p.userId !== userId);
      return [
        ...filteredStreams,
        {
          userId,
          stream,
          isVideoEnabled: userState?.isVideoEnabled ?? true,
          isAudioEnabled: userState?.isAudioEnabled ?? true,
          userName: userState?.userName || "익명",
        },
      ];
    });
  };

  const toggleVideo = () => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      if (videoTrack) {
        const newEnabled = !videoTrack.enabled;
        videoTrack.enabled = newEnabled;
        setIsVideoEnabled(newEnabled);

        if (hasJoinedMeeting) {
          socketRef.current?.emit("toggle-video", {
            roomId: params.id,
            userId: myPeerIdRef.current,
            enabled: newEnabled,
          });

          // 비디오를 다시 켤 때 스트림 재설정
          if (newEnabled && myVideoRef.current) {
            // 현재 스트림을 새로 고침
            navigator.mediaDevices
              .getUserMedia({ video: true, audio: isAudioEnabled })
              .then((newStream) => {
                const audioTrack = myStream.getAudioTracks()[0];

                // 기존 비디오 트랙 제거
                myStream.getVideoTracks().forEach((track) => {
                  track.stop();
                  myStream.removeTrack(track);
                });

                // 새 비디오 트랙 추가
                const newVideoTrack = newStream.getVideoTracks()[0];
                myStream.addTrack(newVideoTrack);

                // 오디오 상태 유지
                if (audioTrack) {
                  newVideoTrack.enabled = true;
                  audioTrack.enabled = isAudioEnabled;
                }

                // 비디오 엘리먼트 업데이트
                if (myVideoRef.current) {
                  myVideoRef.current.srcObject = myStream;
                }

                // 피어 연결 업데이트
                Object.values(peersRef.current).forEach((call: any) => {
                  const sender = call.peerConnection
                    .getSenders()
                    .find((s: any) => s.track.kind === "video");
                  if (sender) {
                    sender.replaceTrack(newVideoTrack);
                  }
                });
              })
              .catch((err) => {
                console.error("Error getting video stream:", err);
                setIsVideoEnabled(false);
              });
          }
        }
      }
    }
  };

  const toggleAudio = () => {
    if (myStream) {
      const audioTrack = myStream.getAudioTracks()[0];
      if (audioTrack) {
        const newEnabled = !audioTrack.enabled;
        audioTrack.enabled = newEnabled;
        setIsAudioEnabled(newEnabled);

        if (hasJoinedMeeting) {
          socketRef.current?.emit("toggle-audio", {
            roomId: params.id,
            userId: myPeerIdRef.current,
            enabled: newEnabled,
          });
        }

        // 로컬 오디오 트랙 상태 즉시 업데이트
        myStream.getAudioTracks().forEach((track) => {
          track.enabled = newEnabled;
        });
      }
    }
  };

  // 회의 상태 확인 (완료된 회의는 참여 불가)
  const checkMeetingStatus = async () => {
    try {
      const response = await fetch(`/api/meetings/${params.id}`);

      if (!response.ok) {
        // 회의가 없으면 새로 만들 수 있으므로 true 반환
        return true;
      }

      const data = await response.json();

      if (data.success && data.data) {
        // 회의가 이미 완료되었으면 false 반환
        if (data.data.status === 'completed') {
          console.log("⛔ 회의가 이미 종료되었습니다.");
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("회의 상태 확인 중 오류:", error);
      // 오류 발생 시 일단 참여 허용
      return true;
    }
  };

  // 회의 종료 시 요약 및 전체 대화 내용 업데이트
  const updateMeetingInDatabase = async (
    messageText: string,
    summaryResult: {
      mainPoints: string;
      decisions: string;
      actionItems: string;
    },
    isLastParticipant: boolean = false
  ) => {
    if (!meetingId) {
      console.error("회의 ID가 없습니다");
      return;
    }

    try {
      // 현재 참가자 정보 구성
      const currentParticipants = [
        {
          userId: myPeerIdRef.current,
          userName: myUserName,
          joinTime: meetingStartTimeRef.current.toISOString(),
          leaveTime: new Date().toISOString(),
        },
        ...peerStreams.map((peer) => ({
          userId: peer.userId,
          userName: peer.userName,
          joinTime: meetingStartTimeRef.current.toISOString(),
          leaveTime: new Date().toISOString(),
        })),
      ];

      // API 요청 보내기 (PUT으로 업데이트)
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          transcript: messageText,
          mainPoints: summaryResult.mainPoints,
          decisions: summaryResult.decisions,
          actionItems: summaryResult.actionItems,
          participants: currentParticipants,
          isLastParticipant: isLastParticipant, // 마지막 참가자 여부 전달
        }),
      });

      if (!response.ok) {
        throw new Error("회의 업데이트에 실패했습니다");
      }

      console.log("회의가 성공적으로 업데이트되었습니다", isLastParticipant ? "(완료됨)" : "");
    } catch (error) {
      console.error("회의 업데이트 중 오류 발생:", error);
    }
  };

  const summarizeMessages = async (messages: Message[], isLastParticipant: boolean = false) => {
    try {
      const genAI = new GoogleGenerativeAI(
        process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
      );
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const messageText = messages
        .map(
          (msg) =>
            `${
              msg.userId === myPeerIdRef.current
                ? "나"
                : "참가자 " + msg.userId.slice(0, 4)
            }: ${msg.content}`
        )
        .join("\n");

      const prompt = `다음은 온라인 회의의 대화 내용입니다. 이 대화 내용을 다음 형식으로 요약해주세요:

1. 주요 논의 사항
2. 결정된 사항
3. 후속 조치 필요 사항

각 섹션은 명확하게 구분해서 응답해주세요.

대화 내용:
${messageText}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summaryText = response.text();

      // 요약 내용 파싱
      const mainPointsMatch = summaryText.match(
        /주요 논의 사항[:\n]+([\s\S]+?)(?=결정된 사항|$)/i
      );
      const decisionsMatch = summaryText.match(
        /결정된 사항[:\n]+([\s\S]+?)(?=후속 조치|$)/i
      );
      const actionItemsMatch = summaryText.match(
        /후속 조치 필요 사항[:\n]+([\s\S]+?)(?=$)/i
      );

      const summaryResult = {
        mainPoints: mainPointsMatch ? mainPointsMatch[1].trim() : summaryText,
        decisions: decisionsMatch ? decisionsMatch[1].trim() : "",
        actionItems: actionItemsMatch ? actionItemsMatch[1].trim() : "",
      };

      // 데이터베이스에 업데이트 (회의 종료 시, 마지막 참가자 여부 전달)
      await updateMeetingInDatabase(messageText, summaryResult, isLastParticipant);

      return summaryText;
    } catch (error) {
      console.error("Error summarizing messages:", error);
      throw error;
    }
  };

  const handleEndCall = async () => {
    console.log("🔴 통화 종료 시작 - 내 Peer ID:", myPeerIdRef.current);
    console.log("👑 방장 여부:", isCreator);

    try {
      // 방장이 종료 버튼을 누르면 회의 요약 실행
      if (isCreator) {
        console.log("👑 방장이 회의를 종료합니다. AI 요약을 실행합니다.");

        // 1. 다른 참가자들에게 회의 종료 알림 (방장이 종료)
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('host-ended-meeting', params.id);
        }

        // 2. 메시지가 있으면 AI 요약 실행
        if (messages.length > 0) {
          setIsSummarizing(true);
          try {
            // 방장이 종료하므로 isLastParticipant = true (회의 완료 처리)
            const summary = await summarizeMessages(messages, true);
            setSummary(summary);
            setShowSummary(true);

            // 요약 완료 후 연결 종료
            await cleanupConnections();

            // 요약 모달이 표시되므로 여기서는 페이지 이동 안 함 (모달 닫을 때 이동)
            return;
          } catch (error) {
            console.error("Failed to summarize meeting:", error);
            alert("회의 요약 중 오류가 발생했습니다.");
          } finally {
            setIsSummarizing(false);
          }
        } else {
          // 메시지가 없어도 방장이 종료하면 회의를 완료 처리
          console.log("📝 메시지가 없지만 방장이 종료하므로 회의를 완료 처리합니다.");
          try {
            await updateMeetingInDatabase("", {
              mainPoints: "",
              decisions: "",
              actionItems: ""
            }, true);
          } catch (error) {
            console.error("Failed to update meeting:", error);
          }
        }
      }

      // 일반 참가자 또는 방장(메시지 없음)의 경우 바로 연결 종료
      await cleanupConnections();

      // 회의 목록 페이지로 이동 (캐시를 우회하여 강제 새로고침)
      console.log("🔀 /meeting 페이지로 이동");
      router.push('/meeting?refresh=' + Date.now());

    } catch (error) {
      console.error("❌ 통화 종료 중 오류 발생:", error);
      // 오류가 발생해도 페이지 이동은 시도
      router.push('/meeting?refresh=' + Date.now());
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowToast(true);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // 화면 공유 시작
  const handleStartScreenShare = async () => {
    try {
      console.log("🖥️ 화면 공유 시작 시도");

      // Screen Capture API 사용
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false // 시스템 오디오는 선택적
      } as DisplayMediaStreamOptions);

      console.log("✅ 화면 공유 스트림 획득:", stream.id);
      setScreenStream(stream);
      setIsScreenSharing(true);
      setSharingUserId(myPeerIdRef.current);

      // 화면 공유 스트림을 로컬 비디오에 표시
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      // 다른 참가자들에게 화면 공유 시작 알림
      if (socketRef.current) {
        socketRef.current.emit("screen-share-started", {
          roomId: params.id,
          userId: myPeerIdRef.current,
        });
      }

      // 모든 피어에게 화면 공유 스트림 전송
      Object.keys(peersRef.current).forEach((peerId) => {
        console.log(`📤 화면 공유 스트림을 ${peerId}에게 전송 시도`);
        const call = peerRef.current?.call(peerId, stream, {
          metadata: { type: 'screen-share' }
        });
        if (call) {
          console.log(`✅ 화면 공유 call 생성 완료: ${peerId}`);

          call.on("stream", (remoteStream) => {
            console.log(`📥 화면 공유 응답 스트림 수신: ${peerId}`);
          });

          call.on("error", (err) => {
            console.error(`❌ 화면 공유 call 오류 (${peerId}):`, err);
          });
        }
      });

      // 화면 공유가 사용자에 의해 중단되었을 때 처리
      stream.getVideoTracks()[0].onended = () => {
        console.log("🛑 사용자가 화면 공유를 중단했습니다");
        handleStopScreenShare();
      };

    } catch (error) {
      console.error("❌ 화면 공유 시작 실패:", error);
      alert("화면 공유를 시작할 수 없습니다. 권한을 확인해주세요.");
    }
  };

  // 화면 공유 창 리사이즈 시작
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    resizeStartPos.current = {
      x: screenShareSize.x,
      y: screenShareSize.y,
      width: screenShareSize.width,
      height: screenShareSize.height,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  // 화면 공유 창 리사이즈 중
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const deltaX = e.clientX - resizeStartPos.current.startX;
    const deltaY = e.clientY - resizeStartPos.current.startY;

    let newSize = { ...screenShareSize };

    if (resizeDirection.includes("right")) {
      newSize.width = Math.max(400, resizeStartPos.current.width + deltaX);
    }
    if (resizeDirection.includes("left")) {
      const newWidth = Math.max(400, resizeStartPos.current.width - deltaX);
      if (newWidth !== newSize.width) {
        newSize.x = resizeStartPos.current.x + (resizeStartPos.current.width - newWidth);
        newSize.width = newWidth;
      }
    }
    if (resizeDirection.includes("bottom")) {
      newSize.height = Math.max(300, resizeStartPos.current.height + deltaY);
    }
    if (resizeDirection.includes("top")) {
      const newHeight = Math.max(300, resizeStartPos.current.height - deltaY);
      if (newHeight !== newSize.height) {
        newSize.y = resizeStartPos.current.y + (resizeStartPos.current.height - newHeight);
        newSize.height = newHeight;
      }
    }

    setScreenShareSize(newSize);
  };

  // 화면 공유 창 리사이즈 종료
  const handleResizeEnd = () => {
    setIsResizing(false);
    setResizeDirection("");
  };

  // 리사이즈 이벤트 리스너 등록
  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
      return () => {
        window.removeEventListener("mousemove", handleResizeMove);
        window.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [isResizing, resizeDirection]);

  // 화면 공유 종료
  const handleStopScreenShare = () => {
    console.log("🛑 화면 공유 종료");

    if (screenStream) {
      screenStream.getTracks().forEach((track) => {
        track.stop();
        console.log("  - 화면 공유 트랙 종료:", track.kind);
      });
    }

    setScreenStream(null);
    setIsScreenSharing(false);
    setSharingUserId(null);

    // 다른 참가자들에게 화면 공유 종료 알림
    if (socketRef.current) {
      socketRef.current.emit("screen-share-stopped", {
        roomId: params.id,
        userId: myPeerIdRef.current,
      });
    }
  };

  const handleNewMessage = useCallback(
    (message: Message) => {
      setMessages((prev) => [...prev, message]);

      // 소켓을 통해 다른 참가자들에게 메시지 전송
      socketRef.current?.emit("new-message", {
        roomId: params.id,
        message,
      });
    },
    [params.id]
  );

  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* 사전 참여 모달 */}
      <PreJoinModal
        isOpen={showPreJoinModal}
        onClose={handleCancelJoin}
        localStream={myStream}
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        toggleAudio={toggleAudio}
        toggleVideo={toggleVideo}
        joinMeeting={handleJoinMeeting}
      />

      {/* 화면 공유 표시 영역 */}
      {(sharingUserId || isScreenSharing) && (
        <div
          className="fixed z-20 bg-black/95 rounded-xl overflow-hidden shadow-2xl border-2 border-blue-500"
          style={{
            left: `${screenShareSize.x}px`,
            top: `${screenShareSize.y}px`,
            width: `${screenShareSize.width}px`,
            height: `${screenShareSize.height}px`,
          }}
        >
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />

          {/* 리사이즈 핸들들 */}
          {/* 상단 */}
          <div
            className="absolute top-0 left-0 right-0 h-2 cursor-n-resize hover:bg-blue-500/30 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "top")}
          />
          {/* 하단 */}
          <div
            className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize hover:bg-blue-500/30 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "bottom")}
          />
          {/* 좌측 */}
          <div
            className="absolute top-0 left-0 bottom-0 w-2 cursor-w-resize hover:bg-blue-500/30 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "left")}
          />
          {/* 우측 */}
          <div
            className="absolute top-0 right-0 bottom-0 w-2 cursor-e-resize hover:bg-blue-500/30 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "right")}
          />
          {/* 좌상단 코너 */}
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize hover:bg-blue-500/50 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "topleft")}
          />
          {/* 우상단 코너 */}
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize hover:bg-blue-500/50 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "topright")}
          />
          {/* 좌하단 코너 */}
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize hover:bg-blue-500/50 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "bottomleft")}
          />
          {/* 우하단 코너 */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/50 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, "bottomright")}
          />

          <div className="absolute top-4 left-4 bg-blue-500/90 px-4 py-2 rounded-lg flex items-center gap-2 pointer-events-none">
            <MonitorIcon className="w-5 h-5 text-white" />
            <span className="text-white font-medium">
              {isScreenSharing ? "내가 화면을 공유 중입니다" : `${sharingUserId}님이 화면을 공유 중입니다`}
            </span>
          </div>
          {isScreenSharing && (
            <button
              onClick={handleStopScreenShare}
              className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors z-10"
            >
              <MonitorOffIcon className="w-5 h-5" />
              <span>공유 중지</span>
            </button>
          )}
        </div>
      )}

      {/* 메인 비디오 그리드 */}
      <div className="h-screen p-4 flex flex-col">
        <div className={`flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr ${
          (sharingUserId || isScreenSharing) ? "opacity-30" : ""
        }`}>
          {/* 내 비디오 */}
          <div className={`relative aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${
            isSpeaking ? "ring-4 ring-cyan-400 shadow-cyan-400/50" : ""
          }`}>
            <video
              ref={myVideoRef}
              muted
              autoPlay
              playsInline
              className={`w-full h-full object-cover transform scale-x-[-1] ${
                !isVideoEnabled ? "hidden" : ""
              }`}
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                <UsersIcon className="w-20 h-20 text-gray-400" />
                {myStream && myStream.getTracks().length === 0 && !isAudioEnabled && (
                  <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-3 py-1.5">
                    <p className="text-yellow-200 text-xs">시청 전용</p>
                  </div>
                )}
              </div>
            )}
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <div className="text-sm text-white bg-black/50 px-3 py-1.5 rounded-lg">
                {myUserName} (나)
              </div>
              {!isAudioEnabled && (
                <div className="bg-red-500/80 p-1.5 rounded-lg" title="마이크 꺼짐">
                  <MicrophoneOffIcon className="w-4 h-4 text-white" />
                </div>
              )}
              {!isVideoEnabled && myStream && myStream.getTracks().length > 0 && (
                <div className="bg-red-500/80 p-1.5 rounded-lg" title="카메라 꺼짐">
                  <VideoOffIcon className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </div>

          {/* 다른 참가자 비디오 */}
          {peerStreams.map((peerStream) => {
            const hasNoTracks = peerStream.stream.getTracks().length === 0;
            const hasNoDevices = !peerStream.isVideoEnabled && !peerStream.isAudioEnabled && hasNoTracks;
            const isUserSpeaking = speakingUsers.has(peerStream.userId);

            return (
              <div
                key={peerStream.userId}
                className={`relative aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${
                  isUserSpeaking ? "ring-4 ring-cyan-400 shadow-cyan-400/50" : ""
                }`}
              >
                <video
                  autoPlay
                  playsInline
                  ref={(element) => {
                    if (element) element.srcObject = peerStream.stream;
                  }}
                  className={`w-full h-full object-cover transform scale-x-[-1] ${
                    !peerStream.isVideoEnabled ? "hidden" : ""
                  }`}
                />
                {!peerStream.isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center flex-col gap-3">
                    <UsersIcon className="w-20 h-20 text-gray-400" />
                    {hasNoDevices && (
                      <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg px-3 py-1.5">
                        <p className="text-yellow-200 text-xs">시청 전용</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="text-sm text-white bg-black/50 px-3 py-1.5 rounded-lg">
                    {peerStream.userName || `참가자 ${peerStream.userId.slice(0, 4)}`}
                  </div>
                  {!peerStream.isAudioEnabled && (
                    <div className="bg-red-500/80 p-1.5 rounded-lg" title="마이크 꺼짐">
                      <MicrophoneOffIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {!peerStream.isVideoEnabled && !hasNoDevices && (
                    <div className="bg-red-500/80 p-1.5 rounded-lg" title="카메라 꺼짐">
                      <VideoOffIcon className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 하단 컨트롤 바 */}
        <div className="flex justify-between items-center py-4 px-6">
          <div className="text-white text-sm">
            {new Date().toLocaleTimeString("ko-KR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-all duration-200 ${
                isAudioEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isAudioEnabled ? (
                <MicrophoneIcon className="w-6 h-6" />
              ) : (
                <MicrophoneOffIcon className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-4 rounded-full transition-all duration-200 ${
                isVideoEnabled
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isVideoEnabled ? (
                <VideoIcon className="w-6 h-6" />
              ) : (
                <VideoOffIcon className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={isScreenSharing ? handleStopScreenShare : handleStartScreenShare}
              className={`p-4 rounded-full transition-all duration-200 ${
                isScreenSharing
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              title={isScreenSharing ? "화면 공유 중지" : "화면 공유"}
            >
              {isScreenSharing ? (
                <MonitorOffIcon className="w-6 h-6" />
              ) : (
                <MonitorIcon className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={handleEndCall}
              className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
              disabled={isSummarizing}
            >
              {isSummarizing ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <PhoneOffIcon className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={handleCopyInviteLink}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-all duration-200"
            >
              <Share2Icon className="w-6 h-6" />
            </button>
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={`p-4 rounded-full transition-all duration-200 relative ${
                showParticipants
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              title="참가자 목록"
            >
              <UsersIcon className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {peerStreams.length + 1}
              </span>
            </button>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-4 rounded-full transition-all duration-200 ${
                isSidebarOpen
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-white"
              }`}
            >
              <MessageIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="w-20">
            {/* 시간 표시 영역과 대칭을 위한 빈 공간 */}
          </div>
        </div>
      </div>

      {/* 참가자 패널 */}
      <ParticipantsPanel
        isOpen={showParticipants}
        onClose={() => setShowParticipants(false)}
        myPeerId={myPeerIdRef.current}
        myUserName={myUserName}
        peerStreams={peerStreams}
        myStream={myStream}
        isMyAudioEnabled={isAudioEnabled}
        isMyVideoEnabled={isVideoEnabled}
      />

      {/* 사이드 패널 - 음성 인식 컴포넌트 */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-gray-800 shadow-xl transform transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <SpeechToText
          isAudioEnabled={isAudioEnabled}
          userId={myPeerIdRef.current}
          userName={myUserName}
          messages={messages}
          onNewMessage={handleNewMessage}
          userNames={new Map([
            [myPeerIdRef.current, myUserName],
            ...peerStreams.map(peer => [peer.userId, peer.userName || `참가자 ${peer.userId.slice(0, 4)}`] as [string, string])
          ])}
        />
      </div>

      <Toast
        message="초대 링크가 복사되었습니다!"
        isVisible={showToast}
        onHide={() => setShowToast(false)}
      />

      <SummaryModal
        isOpen={showSummary}
        onClose={() => {
          setShowSummary(false);
          router.push("/meeting?refresh=" + Date.now());
        }}
        summary={summary}
      />
    </div>
  );
}
