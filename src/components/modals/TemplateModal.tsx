"use client";

import { XIcon, FileTextIcon } from "lucide-react";
import { useTheme } from "next-themes";

interface Template {
  id: string;
  name: string;
  description: string;
}

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: Template[];
  onSelect: (templateId: string) => void;
  isLoading: boolean;
  selectedTemplate: string | null;
}

export function TemplateModal({ 
  isOpen, 
  onClose, 
  templates, 
  onSelect, 
  isLoading, 
  selectedTemplate 
}: TemplateModalProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-[#1f1f21] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg max-w-lg w-full mx-4`}>
        {/* 헤더 */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            📝 템플릿 선택
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-md hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
            disabled={isLoading}
          >
            <XIcon className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4 space-y-3">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              disabled={isLoading}
              className={`w-full p-4 text-left rounded-lg border transition-all duration-200 group ${
                selectedTemplate === template.id && isLoading
                  ? isDarkMode 
                    ? 'bg-blue-900/20 border-blue-500' 
                    : 'bg-blue-50 border-blue-500'
                  : isDarkMode
                    ? 'bg-[#2a2a2c] border-gray-600 hover:bg-gray-700 hover:border-gray-500'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
              } ${isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-md ${
                  selectedTemplate === template.id && isLoading
                    ? 'bg-blue-500 text-white'
                    : isDarkMode
                      ? 'bg-gray-600 text-gray-300 group-hover:bg-gray-500'
                      : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
                }`}>
                  {selectedTemplate === template.id && isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <FileTextIcon className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {template.name}
                    {selectedTemplate === template.id && isLoading && (
                      <span className="ml-2 text-sm text-blue-500">생성 중...</span>
                    )}
                  </h3>
                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {template.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 푸터 */}
        <div className={`flex justify-end p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md transition-colors ${
              isLoading 
                ? 'cursor-not-allowed opacity-50' 
                : ''
            } ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
} 