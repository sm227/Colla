"use client";
import { useEffect, useRef, useState } from "react";
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
  PhoneOff as PhoneOffIcon 
} from 'lucide-react';

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
  const socketRef = useRef<any>(null);
  const peerRef = useRef<Peer>();
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<{ [key: string]: any }>({});
  const myPeerIdRef = useRef<string>("");
  const [showToast, setShowToast] = useState(false);

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

        // Socket.IO 초기화
        socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        // PeerJS 초기화
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
    
    // 중복 스트림 방지를 위한 체크
    setPeerStreams(prev => {
      // 이미 존재하는 스트림 제거
      const filteredStreams = prev.filter(p => p.userId !== userId);
      
      // 새 스트림 추가
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

  const handleEndCall = () => {
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

    router.push('/');
  };

  const handleCopyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowToast(true);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="h-screen flex flex-col">
        <Toast 
          message="초대 링크가 복사되었습니다" 
          isVisible={showToast} 
          onHide={() => setShowToast(false)} 
        />

        <header className="bg-gray-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-white font-medium">
              Meeting: <span className="text-blue-400">{params.id}</span>
            </h1>
            <div className="bg-gray-700 px-3 py-1 rounded-full">
              <p className="text-sm text-gray-300">
                {peerStreams.length + 1} 참가자
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyInviteLink}
              className="text-gray-300 hover:text-white px-3 py-1 rounded-md text-sm flex items-center gap-2 transition-colors duration-200"
            >
              <Share2Icon className="w-4 h-4" />
              초대 링크 복사
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">
            <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg">
              <video
                ref={myVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                      <UsersIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <span className="text-gray-400">카메라 꺼짐</span>
                  </div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-white text-sm">나</p>
                    {!isAudioEnabled && (
                      <div className="bg-red-500 rounded-full p-1">
                        <MicrophoneOffIcon className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {peerStreams.map(({ userId, stream, isVideoEnabled: peerVideoEnabled, isAudioEnabled: peerAudioEnabled }) => (
              <div key={userId} className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden shadow-lg">
                {peerVideoEnabled ? (
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    ref={video => {
                      if (video) {
                        video.srcObject = stream;
                        // 오디오 트랙 상태 설정
                        stream.getAudioTracks().forEach(track => {
                          track.enabled = peerAudioEnabled;
                        });
                      }
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-2">
                        <UsersIcon className="w-10 h-10 text-gray-400" />
                      </div>
                      <span className="text-gray-400">카메라 꺼짐</span>
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="flex items-center justify-between">
                    <p className="text-white text-sm flex items-center gap-2">
                      <span>참가자</span>
                      {!peerAudioEnabled && (
                        <MicrophoneOffIcon className="w-4 h-4 text-red-500" />
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <footer className="bg-gray-800 px-4 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center space-x-4">
            <button
              onClick={toggleAudio}
              className={`${
                isAudioEnabled ? "bg-gray-700" : "bg-red-500"
              } hover:opacity-90 text-white p-4 rounded-full transition-colors`}
            >
              {isAudioEnabled ? (
                <MicrophoneIcon className="w-6 h-6" />
              ) : (
                <MicrophoneOffIcon className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={toggleVideo}
              className={`${
                isVideoEnabled ? "bg-gray-700" : "bg-red-500"
              } hover:opacity-90 text-white p-4 rounded-full transition-colors`}
            >
              {isVideoEnabled ? (
                <VideoIcon className="w-6 h-6" />
              ) : (
                <VideoOffIcon className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={handleEndCall}
              className="bg-red-500 hover:opacity-90 text-white p-4 rounded-full transition-colors"
            >
              <PhoneOffIcon className="w-6 h-6" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
