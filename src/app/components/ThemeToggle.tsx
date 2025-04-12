"use client";

import { useState, useEffect } from "react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect는 클라이언트 사이드에서만 실행됩니다
  useEffect(() => {
    setMounted(true);
  }, []);

  // 컴포넌트가 마운트되기 전에는 테마 관련 UI를 렌더링하지 않음
  if (!mounted) {
    return <div className="w-[62px] h-[26px]"></div>;
  }

  return (
    <div className="flex items-center">
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        type="button"
        className={`
          relative inline-flex h-[26px] w-[62px] shrink-0 cursor-pointer rounded-full border-2 
          border-transparent transition-colors duration-200 ease-in-out focus:outline-none 
          focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
          ${theme === "dark" ? "bg-[rgb(31,31,33)]" : "bg-gray-200"}
        `}
        role="switch"
        aria-checked={theme === "dark"}
        aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      >
        <span className="sr-only">
          {theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
        </span>
        <span
          className={`
            pointer-events-none flex items-center justify-center
            ${theme === "dark" ? "translate-x-9" : "translate-x-0"}
            relative inline-block h-[22px] w-[22px] rounded-full 
            shadow-lg ring-0 transition duration-200 ease-in-out
            ${theme === "dark" ? "bg-gray-600" : "bg-white"}
          `}
        >
          {theme === "dark" ? (
            <MoonIcon className="h-[14px] w-[14px] text-white" />
          ) : (
            <SunIcon className="h-[14px] w-[14px] text-amber-500" />
          )}
        </span>
        <span
          className={`
            absolute inset-0 flex items-center
            ${theme === "dark" ? "justify-start pl-2" : "justify-end pr-2"}
            pointer-events-none opacity-50
          `}
        >
          {theme === "dark" ? (
            <SunIcon className="h-3.5 w-3.5 text-amber-300" />
          ) : (
            <MoonIcon className="h-3.5 w-3.5 text-gray-600" />
          )}
        </span>
      </button>
    </div>
  );
} 