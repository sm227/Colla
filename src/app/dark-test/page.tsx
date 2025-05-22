"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { SunIcon, MoonIcon } from "lucide-react";

export default function DarkTest() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // next-themes hydration 처리
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* 테마 토글 버튼 */}
        <div className="flex justify-end mb-8">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg bg-primary text-primary-foreground"
          >
            {theme === "dark" ? (
              <SunIcon className="w-6 h-6" />
            ) : (
              <MoonIcon className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* 테스트 컨텐츠 */}
        <div className="space-y-8">
          {/* 카드 예시 */}
          <div className="p-6 rounded-lg bg-card text-card-foreground border border-border">
            <h2 className="text-2xl font-bold mb-4">카드 컴포넌트</h2>
            <p className="text-muted-foreground">
              이것은 카드 컴포넌트입니다. 다크모드에서 어떻게 보이는지 테스트해보세요.
            </p>
          </div>

          {/* 버튼 예시들 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4">버튼 스타일</h2>
            <div className="space-x-4">
              <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground">
                Primary 버튼
              </button>
              <button className="px-4 py-2 rounded-md bg-secondary text-secondary-foreground">
                Secondary 버튼
              </button>
              <button className="px-4 py-2 rounded-md bg-accent text-accent-foreground">
                Accent 버튼
              </button>
              <button className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground">
                Destructive 버튼
              </button>
            </div>
          </div>

          {/* 텍스트 스타일 예시 */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">텍스트 스타일</h2>
            <p className="text-foreground">기본 텍스트 스타일입니다.</p>
            <p className="text-muted-foreground">뮤티드 텍스트 스타일입니다.</p>
            <p className="text-primary">프라이머리 텍스트 스타일입니다.</p>
            <p className="text-secondary">세컨더리 텍스트 스타일입니다.</p>
          </div>

          {/* 현재 테마 정보 */}
          <div className="p-4 rounded-lg bg-muted text-muted-foreground">
            <p>현재 테마: {theme}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
