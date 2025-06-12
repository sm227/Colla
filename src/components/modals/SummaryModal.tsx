"use client";

import { XIcon } from "lucide-react";
import { useTheme } from "next-themes";

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  isLoading: boolean;
}

export function SummaryModal({ isOpen, onClose, summary, isLoading }: SummaryModalProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-[#1f1f21] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto`}>
        {/* 헤더 */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            📄 문서 요약
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-md hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
          >
            <XIcon className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                AI가 문서를 요약하고 있습니다...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'} leading-relaxed whitespace-pre-wrap`}>
                {summary || '요약 내용이 없습니다.'}
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className={`flex justify-end p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'} transition-colors`}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
} 