"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import Peer from "peerjs";
import { useRouter } from "next/navigation";
import { 
  Share2Icon, 
  UsersIcon, 
  Mic as MicrophoneIcon, 
  MicOff as MicrophoneOffIcon, 
  Video as VideoIcon, 
  VideoOff as VideoOffIcon, 
  PhoneOff as PhoneOffIcon,
  MessageSquare as MessageIcon
} from 'lucide-react';
import SpeechToText from './SpeechToText';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface PeerStream {
  userId: string;
  stream: MediaStream;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
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

function SummaryModal({ isOpen, onClose, summary }: SummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">회의 요약</h2>
        <div className="prose dark:prose-invert max-w-none">
          {summary.split('\n').map((line, index) => (
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

function Toast({ message, isVisible, onHide }: { message: string; isVisible: boolean; onHide: () => void }) {
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

export default function MeetingRoom({ params }: { params: { id: string } }) {
  const router = useRouter();
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
  const [summary, setSummary] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    let localStream: MediaStream | null = null;
    let isComponentMounted = true;

    const initializePeer = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        if (!isComponentMounted) {
          localStream.getTracks().forEach(track => track.stop());
          return;
        }

        setMyStream(localStream);
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = localStream;
        }

        socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        const peer = new Peer({
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        });
        
        peerRef.current = peer;

        peer.on('open', (id) => {
          console.log(`My peer ID is: ${id}`);
          myPeerIdRef.current = id;
          socketRef.current.emit('join-room', params.id, id, {
            isVideoEnabled: true,
            isAudioEnabled: true
          });
        });

        // 다른 참가자의 호출 처리
        peer.on('call', (call) => {
          if (localStream) {
            call.answer(localStream);
            
            call.on('stream', (userVideoStream) => {
              const userId = call.peer;
              addPeerStream(userId, userVideoStream);
            });

            call.on('close', () => {
              setPeerStreams(prev => prev.filter(p => p.userId !== call.peer));
            });

            peersRef.current[call.peer] = call;
          }
        });

        // Socket 이벤트 리스너
        socketRef.current.on('user-connected', (userId: string, userState: any) => {
          console.log('New user connected:', userId);
          connectToNewUser(userId, localStream!, userState);
        });

        socketRef.current.on('user-disconnected', (userId: string) => {
          console.log(`User disconnected: ${userId}`);
          if (peersRef.current[userId]) {
            peersRef.current[userId].close();
            delete peersRef.current[userId];
            setPeerStreams(prev => prev.filter(p => p.userId !== userId));
          }
        });

        socketRef.current.on('user-toggle-video', ({ userId, enabled }: { userId: string; enabled: boolean }) => {
          console.log('Received toggle video event:', { userId, enabled });
          setPeerStreams(prev => prev.map(peer => 
            peer.userId === userId ? { ...peer, isVideoEnabled: enabled } : peer
          ));
        });

        socketRef.current.on('user-toggle-audio', ({ userId, enabled }: { userId: string; enabled: boolean }) => {
          console.log('Received toggle audio event:', { userId, enabled });
          setPeerStreams(prev => prev.map(peer => 
            peer.userId === userId ? { ...peer, isAudioEnabled: enabled } : peer
          ));
        });

        // 메시지 히스토리 수신
        socketRef.current.on('message-history', (messages: Message[]) => {
          console.log('Received message history:', messages);
          setMessages(messages);
        });

        // 새 메시지 수신
        socketRef.current.on('receive-message', (message: Message) => {
          console.log('Received new message:', message);
          setMessages(prev => [...prev, message]);
        });
      } catch (error) {
        console.error('Error initializing peer:', error);
      }
    };

    initializePeer();

    return () => {
      isComponentMounted = false;
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      Object.values(peersRef.current).forEach((call: any) => {
        if (call.close) call.close();
      });
      setPeerStreams([]);
      peersRef.current = {};
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
    };
  }, [params.id]);

  const connectToNewUser = (userId: string, stream: MediaStream, userState: any) => {
    console.log(`Connecting to new user ${userId}`);
    
    // 이미 연결된 피어는 무시
    if (peersRef.current[userId]) {
      console.log(`Already connected to user ${userId}`);
      return;
    }

    try {
      const call = peerRef.current?.call(userId, stream);
      if (call) {
        call.on('stream', (userVideoStream) => {
          console.log(`Received stream from user ${userId}`);
          addPeerStream(userId, userVideoStream, userState);
        });

        call.on('close', () => {
          console.log(`Call closed with user ${userId}`);
          setPeerStreams(prev => prev.filter(p => p.userId !== userId));
          delete peersRef.current[userId];
        });

        peersRef.current[userId] = call;
      }
    } catch (error) {
      console.error(`Error connecting to user ${userId}:`, error);
    }
  };

  const addPeerStream = (userId: string, stream: MediaStream, userState?: any) => {
    console.log(`Adding peer stream for user ${userId}`);
    
    setPeerStreams(prev => {
      const filteredStreams = prev.filter(p => p.userId !== userId);
      
      return [...filteredStreams, {
        userId,
        stream,
        isVideoEnabled: userState?.isVideoEnabled ?? true,
        isAudioEnabled: userState?.isAudioEnabled ?? true
      }];
    });
  };

  const toggleVideo = () => {
    if (myStream) {
      const videoTrack = myStream.getVideoTracks()[0];
      if (videoTrack) {
        const newEnabled = !videoTrack.enabled;
        videoTrack.enabled = newEnabled;
        setIsVideoEnabled(newEnabled);
        
        const toggleEvent: ToggleEvent = {
          roomId: params.id,
          userId: myPeerIdRef.current,
          enabled: newEnabled
        };
        
        console.log('Emitting toggle video event:', toggleEvent);
        socketRef.current?.emit('toggle-video', toggleEvent);

        // 비디오를 다시 켤 때 스트림 재설정
        if (newEnabled && myVideoRef.current) {
          // 현재 스트림을 새로 고침
          navigator.mediaDevices.getUserMedia({ video: true, audio: isAudioEnabled })
            .then(newStream => {
              const audioTrack = myStream.getAudioTracks()[0];
              
              // 기존 비디오 트랙 제거
              myStream.getVideoTracks().forEach(track => {
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
                const sender = call.peerConnection.getSenders().find((s: any) => 
                  s.track.kind === 'video'
                );
                if (sender) {
                  sender.replaceTrack(newVideoTrack);
                }
              });
            })
            .catch(err => {
              console.error('Error getting video stream:', err);
              setIsVideoEnabled(false);
            });
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
        
        const toggleEvent: ToggleEvent = {
          roomId: params.id,
          userId: myPeerIdRef.current,
          enabled: newEnabled
        };
        
        console.log('Emitting toggle audio event:', toggleEvent);
        socketRef.current?.emit('toggle-audio', toggleEvent);

        // 로컬 오디오 트랙 상태 즉시 업데이트
        myStream.getAudioTracks().forEach(track => {
          track.enabled = newEnabled;
        });
      }
    }
  };

  const summarizeMessages = async (messages: Message[]) => {
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

      const messageText = messages.map(msg => 
        `${msg.userId === myPeerIdRef.current ? '나' : '참가자 ' + msg.userId.slice(0, 4)}: ${msg.content}`
      ).join('\n');

      const prompt = `다음은 온라인 회의의 대화 내용입니다. 이 대화 내용을 다음 형식으로 요약해주세요:

1. 주요 논의 사항
2. 결정된 사항
3. 후속 조치 필요 사항

대화 내용:
${messageText}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();
      
      return summary;
    } catch (error) {
      console.error('Error summarizing messages:', error);
      throw error;
    }
  };

  const handleEndCall = async () => {
    if (messages.length > 0) {
      setIsSummarizing(true);
      try {
        const summary = await summarizeMessages(messages);
        setSummary(summary);
        setShowSummary(true);
      } catch (error) {
        console.error('Failed to summarize meeting:', error);
        alert('회의 요약 중 오류가 발생했습니다.');
      } finally {
        setIsSummarizing(false);
      }
    }

    myStream?.getTracks().forEach(track => track.stop());
    
    Object.values(peersRef.current).forEach((call: any) => {
      if (call.close) call.close();
    });
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    if (peerRef.current) {
      peerRef.current.destroy();
    }

    setMyStream(null);
    setPeerStreams([]);
    peersRef.current = {};
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowToast(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    
    // 소켓을 통해 다른 참가자들에게 메시지 전송
    socketRef.current?.emit('new-message', {
      roomId: params.id,
      message
    });
  }, [params.id]);

  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* 메인 비디오 그리드 */}
      <div className="h-screen p-4 flex flex-col">
        <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr">
          {/* 내 비디오 */}
          <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-lg">
            <video
              ref={myVideoRef}
              muted
              autoPlay
              playsInline
              className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center">
                <UsersIcon className="w-20 h-20 text-gray-400" />
              </div>
            )}
            <div className="absolute bottom-4 left-4 text-sm text-white bg-black/50 px-3 py-1.5 rounded-lg">
              나 {!isAudioEnabled && '(음소거)'}
            </div>
          </div>

          {/* 다른 참가자 비디오 */}
          {peerStreams.map((peerStream) => (
            <div key={peerStream.userId} className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden shadow-lg">
              <video
                autoPlay
                playsInline
                ref={(element) => {
                  if (element) element.srcObject = peerStream.stream;
                }}
                className={`w-full h-full object-cover ${!peerStream.isVideoEnabled ? 'hidden' : ''}`}
              />
              {!peerStream.isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <UsersIcon className="w-20 h-20 text-gray-400" />
                </div>
              )}
              <div className="absolute bottom-4 left-4 text-sm text-white bg-black/50 px-3 py-1.5 rounded-lg">
                참가자 {peerStream.userId.slice(0, 4)} {!peerStream.isAudioEnabled && '(음소거)'}
              </div>
            </div>
          ))}
        </div>

        {/* 하단 컨트롤 바 */}
        <div className="flex justify-between items-center py-4 px-6">
          <div className="text-white text-sm">
            {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleAudio}
              className={`p-4 rounded-full transition-all duration-200 ${
                isAudioEnabled 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
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
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              {isVideoEnabled ? (
                <VideoIcon className="w-6 h-6" />
              ) : (
                <VideoOffIcon className="w-6 h-6" />
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
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-4 rounded-full transition-all duration-200 ${
                isSidebarOpen
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
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

      {/* 사이드 패널 - 음성 인식 컴포넌트 */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-gray-800 shadow-xl transform transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <SpeechToText 
          isAudioEnabled={isAudioEnabled}
          userId={myPeerIdRef.current}
          userName="나"
          messages={messages}
          onNewMessage={handleNewMessage}
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
          router.push('/');
        }}
        summary={summary}
      />
    </div>
  );
}
