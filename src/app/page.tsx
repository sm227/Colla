// app/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { VideoIcon, UsersIcon, Share2Icon } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  const createNewMeeting = () => {
    const newRoomId = uuidv4().substring(0, 8);
    router.push(`/meeting/${newRoomId}`);
  };

  const joinMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/meeting/${roomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            화상 회의 플랫폼
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            안전하고 빠른 화상 회의로 어디서나 함께하세요
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div className="space-y-8">
            <button
              onClick={createNewMeeting}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg text-lg font-semibold transition-colors"
            >
              <VideoIcon className="w-6 h-6" />
              새 회의 시작하기
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gradient-to-b from-blue-50 to-white text-gray-500">
                  또는
                </span>
              </div>
            </div>

            <form onSubmit={joinMeeting} className="space-y-4">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="회의 코드 입력"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 px-6 py-4 rounded-lg text-lg font-semibold transition-colors"
              >
                <UsersIcon className="w-6 h-6" />
                회의 참여하기
              </button>
            </form>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              프리미엄 화상회의 기능
            </h2>
            <div className="space-y-6">
              <Feature
                icon={<VideoIcon className="w-6 h-6 text-blue-600" />}
                title="HD 화질의 영상"
                description="선명한 화질과 깨끗한 음질로 원활한 소통"
              />
              <Feature
                icon={<UsersIcon className="w-6 h-6 text-blue-600" />}
                title="다중 참여자 지원"
                description="여러 명이 동시에 참여 가능한 회의실"
              />
              <Feature
                icon={<Share2Icon className="w-6 h-6 text-blue-600" />}
                title="화면 공유"
                description="문서나 프레젠테이션을 실시간으로 공유"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
}
