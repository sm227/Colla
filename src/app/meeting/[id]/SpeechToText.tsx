"use client";
import { useEffect, useState, useCallback } from 'react';

interface Message {
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

interface SpeechToTextProps {
  isAudioEnabled: boolean;
  userId: string;
  userName: string;
  messages: Message[];
  onNewMessage: (message: Message) => void;
}

export default function SpeechToText({ 
  isAudioEnabled, 
  userId, 
  userName, 
  messages,
  onNewMessage 
}: SpeechToTextProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ko-KR';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            }
          }
          if (finalTranscript) {
            const newMessage: Message = {
              userId,
              userName,
              content: finalTranscript.trim(),
              timestamp: Date.now()
            };
            onNewMessage(newMessage);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
        };

        setRecognition(recognition);
      }
    }
  }, [userId, userName, onNewMessage]);

  useEffect(() => {
    if (recognition && isAudioEnabled && !isListening) {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
      }
    } else if (recognition && (!isAudioEnabled || !isListening)) {
      try {
        recognition.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }, [isAudioEnabled, recognition, isListening]);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">회의 내용</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-gray-400">아직 기록된 내용이 없습니다...</p>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className="group">
                <div className="flex items-center space-x-2 text-xs text-gray-400 mb-1">
                  <span>{formatTime(message.timestamp)}</span>
                  <span className={`font-medium ${
                    message.userId === userId 
                      ? 'text-blue-400' 
                      : 'text-emerald-400'
                  }`}>
                    {message.userId === userId ? '나' : `참가자 ${message.userId.slice(0, 4)}`}
                  </span>
                </div>
                <div className="pl-4 border-l-2 border-gray-700 group-hover:border-blue-500 transition-colors">
                  <p className="text-gray-100">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 