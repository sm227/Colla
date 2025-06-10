"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { 
  ArrowLeftIcon as ArrowLeft, 
  StarIcon, 
  UsersIcon, 
  ShareIcon,
  PlusIcon,
  ImageIcon,
  ListIcon,
  CheckSquareIcon,
  CodeIcon,
  SaveIcon,
  FolderIcon,
  TagIcon,
  Type as TypeIcon,
  Quote as QuoteIcon,
  AlignLeft,
  HomeIcon,
  ChevronDown,
  CheckIcon,
  SparklesIcon,
  // 추가 아이콘
  FileTextIcon,
  ChevronRightIcon,
  SettingsIcon,
  ShieldIcon,
  KeyIcon,
  UserPlusIcon,
  // 사이드바용 추가 아이콘
  LayoutDashboardIcon,
  SearchIcon,
  BellIcon,
  UserIcon,
  CalendarIcon,
  VideoIcon,
  XIcon,
  SunIcon,
  MoonIcon,
  LogOutIcon,
  Trello,
  BarChart3Icon
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/contexts/AuthContext";
import { useProject } from "@/app/contexts/ProjectContext";
import { useTheme } from "next-themes";

// shadcn/ui DropdownMenu 컴포넌트 임포트
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Tiptap 관련 임포트
import { EditorContent, useEditor, Editor, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Heading from '@tiptap/extension-heading';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import Blockquote from '@tiptap/extension-blockquote';
import CodeBlock from '@tiptap/extension-code-block';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
// 협업 관련 임포트 추가
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import PasswordVerification from "@/components/document/PasswordVerification";

// 문서 인터페이스 정의
interface Document {
  id: string;
  title: string;
  emoji: string;
  isStarred: boolean;
  folder: string;
  folderId?: string | null; // DB 컬럼명과 일치
  tags: string[];
  content: string;
  projectId?: string;
}

// 요약 모달 인터페이스
interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: string;
  isLoading: boolean;
}

// 요약 모달 컴포넌트
function SummaryModal({ isOpen, onClose, summary, isLoading }: SummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-[#2a2a2c] rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">AI 문서 요약</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 max-h-[400px] overflow-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-gray-700 dark:text-gray-300">요약 생성 중...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {summary.split('\n').map((line, index) => (
                <p key={index} className="text-gray-700 dark:text-gray-300">
                  {line || <span className="text-gray-400 dark:text-gray-500 italic">내용 없음</span>}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// 커스텀 협업 커서 확장 생성
const CustomCollaborationCursor = CollaborationCursor.extend({
  addNodeView() {
    return (node: any, view: any, getPos: any) => {
      // 커서 요소 생성
      const cursor = document.createElement('div');
      cursor.className = 'collaboration-cursor';
      cursor.contentEditable = 'false';
      cursor.style.position = 'absolute';
      cursor.style.zIndex = '20';
      cursor.style.pointerEvents = 'none';

      // 동적으로 위치 설정
      const update = (view: any, lastState: any) => {
        const { user } = node.attrs;
        
        if (user && getPos) {
          const pos = getPos();
          const coords = view.coordsAtPos(pos);
          
          if (coords) {
            cursor.style.display = 'block';
            cursor.style.left = `${coords.left}px`;
            cursor.style.top = `${coords.top}px`;
          } else {
            cursor.style.display = 'none';
          }
        }
        
        return true;
      };
      
      // 사용자 정보 표시 (간단한 커서만 표시)
      if (node.attrs.user) {
        const { user } = node.attrs;
        
        // 커서 스타일 설정 - 단순한 세로선만 표시
        cursor.style.borderLeft = `2px solid ${user.color || '#1e88e5'}`;
        cursor.style.height = '1.5em';
      }

      return {
        dom: cursor,
        update,
        destroy: () => {
          cursor.remove();
        }
      };
    };
  }
});

// 템플릿 모달 컴포넌트
function TemplateModal({ isOpen, onClose, templates, onSelect, isLoading, selectedTemplate }: {
  isOpen: boolean;
  onClose: () => void;
  templates: { id: string; name: string; description: string }[];
  onSelect: (templateId: string) => void;
  isLoading: boolean;
  selectedTemplate: string | null;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-[#2a2a2c] rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">문서 템플릿 선택</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 max-h-[400px] overflow-auto">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            템플릿을 선택하면 AI가 자동으로 문서 구조를 생성합니다
          </p>
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template.id)}
                disabled={isLoading}
                className={`w-full text-left p-3 rounded-lg border ${
                  selectedTemplate === template.id 
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
                } transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{template.name}</span>
                  {selectedTemplate === template.id && isLoading && (
                    <svg className="animate-spin h-4 w-4 text-blue-600 dark:text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.description}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 mr-2 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            취소
          </button>
          <button
            onClick={() => selectedTemplate && onSelect(selectedTemplate)}
            disabled={!selectedTemplate || isLoading}
            className={`px-4 py-2 rounded-lg text-white ${
              !selectedTemplate || isLoading
                ? 'bg-blue-400 dark:bg-blue-500 cursor-not-allowed opacity-50'
                : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
            }`}
          >
            {isLoading ? '생성 중...' : '템플릿 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 암호 설정 모달 인터페이스
interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPassword: string | null;
  isPasswordProtected: boolean;
  onSave: (password: string | null, isProtected: boolean) => void;
  isLoading: boolean;
}

// 암호 설정 모달 컴포넌트
function PasswordModal({ isOpen, onClose, currentPassword, isPasswordProtected, onSave, isLoading }: PasswordModalProps) {
  const [password, setPassword] = useState(currentPassword || '');
  const [confirmPassword, setConfirmPassword] = useState(currentPassword || '');
  const [enablePassword, setEnablePassword] = useState(isPasswordProtected);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setPassword(currentPassword || '');
      setConfirmPassword(currentPassword || '');
      setEnablePassword(isPasswordProtected);
      setError('');
    }
  }, [isOpen, currentPassword, isPasswordProtected]);

  const handleSave = () => {
    // 기본 검증
    if (enablePassword) {
      if (!password) {
        setError('암호를 입력해주세요.');
        return;
      }
      
      if (password.length < 4) {
        setError('암호는 최소 4자 이상이어야 합니다.');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('암호가 일치하지 않습니다.');
        return;
      }
    }
    
    // 암호 비활성화 시 암호를 null로 설정
    onSave(enablePassword ? password : null, enablePassword);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-[#2a2a2c] rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">문서 암호 설정</h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="enablePassword"
                checked={enablePassword}
                onChange={(e) => setEnablePassword(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
              <label htmlFor="enablePassword" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                문서 암호 보호 사용
              </label>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              암호 보호를 활성화하면 문서 접근 시 암호를 입력해야 합니다.
            </p>
            
            {enablePassword && (
              <>
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    암호
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-2 sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="문서 접근 암호 입력"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400 focus:outline-none"
                      >
                        {showPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    암호 확인
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <KeyIcon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 sm:text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="암호 확인"
                    />
                  </div>
                </div>
              </>
            )}
            
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 mt-2">
                {error}
              </div>
            )}
          </div>
        </div>
        
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 text-right sm:px-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 사이드바 링크 컴포넌트
function SidebarLink({
  icon,
  text,
  href,
  active = false,
  small = false,
  onClick,
  theme = "dark", 
  badgeCount,
  isProject = false
}: {
  icon: React.ReactNode;
  text: string;
  href: string;
  active?: boolean;
  small?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  theme?: "light" | "dark";
  badgeCount?: string | number;
  isProject?: boolean;
}) {
  const activeProjectBg = theme === 'dark' 
    ? 'bg-blue-900 bg-opacity-30' 
    : 'bg-blue-100 bg-opacity-50'; 
    
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-between px-2 py-1.5 ${small ? "text-sm" : "text-[15px]"} rounded-md transition-colors duration-150 ${
        theme === 'dark'
          ? active && isProject
            ? `${activeProjectBg} text-gray-300 hover:bg-gray-700 hover:text-gray-100` 
            : "text-gray-300 hover:bg-gray-700 hover:text-gray-100"
          : active && isProject
            ? `${activeProjectBg} text-gray-600 hover:bg-gray-200 hover:text-gray-900`
            : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
      }`}
    >
      <div className="flex items-center">
        <div className={`mr-2.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{icon}</div>
        <span>{text}</span>
      </div>
      {badgeCount && (
        <span className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${badgeCount === 'new' ? (theme === 'dark' ? 'bg-red-500 text-white' : 'bg-red-500 text-white') : (theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700')}`}>
          {badgeCount === 'new' ? '' : badgeCount}
        </span>
      )}
    </Link>
  );
}

// 편의를 위한 간단한 토스트 함수
const showToast = (title: string, description: string, status: 'success' | 'error' | 'info' | 'warning') => {
  // 토스트 메시지를 표시하는 HTML 요소 생성
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 bg-${status === 'success' ? 'green' : status === 'error' ? 'red' : 'blue'}-50 border-l-4 border-${status === 'success' ? 'green' : status === 'error' ? 'red' : 'blue'}-500 p-4 rounded shadow-lg z-50 transition-opacity duration-500`;
  
  toast.innerHTML = `
    <div class="flex">
      <div class="flex-shrink-0">
        ${status === 'success' 
          ? '<svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>'
          : status === 'error'
            ? '<svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>'
            : '<svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd"></path></svg>'
        }
      </div>
      <div class="ml-3">
        <p class="text-sm font-medium text-${status === 'success' ? 'green' : status === 'error' ? 'red' : 'blue'}-800">${title}</p>
        <p class="text-sm text-${status === 'success' ? 'green' : status === 'error' ? 'red' : 'blue'}-700 mt-1">${description}</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // 3초 후에 토스트 제거
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 500);
  }, 3000);
};

function DocumentPageContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth(); // AuthContext에서 사용자 정보 가져오기
  const { 
    projects, 
    currentProject, 
    setCurrentProject,
    loading: projectLoading,
    hasProjects
  } = useProject();
  
  // 테마 관련
  const { theme: currentTheme, setTheme } = useTheme();
  const theme = (currentTheme || 'dark') as 'light' | 'dark';
  
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  // 사이드바 상태
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isDocumentsSubmenuOpen, setIsDocumentsSubmenuOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // next-themes hydration 처리
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const [title, setTitle] = useState("제목 없음");
  const [emoji, setEmoji] = useState("📄");
  const [isStarred, setIsStarred] = useState(false);
  const [folder, setFolder] = useState("프로젝트 문서");
  const [tags, setTags] = useState<string[]>(["문서"]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('projectId');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [projectIdWarning, setProjectIdWarning] = useState(false);
  const [projectIdFixed, setProjectIdFixed] = useState(false);
  const [projectIdDebug, setProjectIdDebug] = useState({
    source: '',
    value: '',
    normalized: '' 
  });
  
  // 문서 로딩 관련 상태 추가
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  // 프로젝트 정보 상태 추가
  const [projectName, setProjectName] = useState<string | null>(null);
  // 문서 정보 상태 추가
  const [folderId, setFolderId] = useState<string | null>(null);
  // 폴더 목록 상태 추가
  const [availableFolders, setAvailableFolders] = useState<{ id: string; name: string; count: number }[]>([]);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  
  // 폴더 모달 상태 추가
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalName, setFolderModalName] = useState<string>("");
  const [isFolderCreating, setIsFolderCreating] = useState(false);
  
  // 사용자 프로젝트 역할 상태 추가
  const [userProjectRole, setUserProjectRole] = useState<string | null>(null);
  const [isProjectOwner, setIsProjectOwner] = useState(false);
  
  // 읽기 전용 모드 상태 추가
  const [isReadOnlyMode, setIsReadOnlyMode] = useState(false);
  const [isButtonDebouncing, setIsButtonDebouncing] = useState(false);
  
  // 슬래시 커맨드 관련 상태
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  
  // 요약 모달 관련 상태 추가
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [documentSummary, setDocumentSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // 템플릿 관련 상태
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateContent, setTemplateContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // 템플릿 타입
  const templates = [
    { id: 'meeting', name: '회의록', description: '회의 내용과 결정사항을 기록하는 템플릿' },
    { id: 'weekly', name: '주간 보고서', description: '주간 업무 성과와 계획을 정리하는 템플릿' },
    { id: 'project', name: '프로젝트 계획서', description: '프로젝트 목표와 일정을 정리하는 템플릿' },
    { id: 'research', name: '연구 문서', description: '연구 내용과 결과를 정리하는 템플릿' }
  ];
  
  // 템플릿 모달 ref
  const templateMenuRef = useRef<HTMLDivElement | null>(null);
  
  const menuRef = useRef<HTMLDivElement | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);

  // 디버깅용 참조 객체
  const debugRef = useRef({
    projectIdParam: null as string | null,
    selectedProjectId: null as string | null,
    projectIdFromAPI: null as string | null,
    projectIdFixed: false
  });

  // 새 문서 작성 페이지인지 확인
  const [isNewDocument, setIsNewDocument] = useState(params.id === "new");
  
  // 저장된 문서 ID를 추적하기 위한 상태 추가
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(params.id !== "new" ? params.id : null);
  
  // Y.js 문서 및 Hocuspocus 프로바이더 생성
  const [ydoc] = useState(() => new Y.Doc());
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  // Y.js에서 가져온 컨텐츠인지 여부를 추적하는 플래그
  const [contentLoadedFromYjs, setContentLoadedFromYjs] = useState(false);

  // 현재 사용자 정보
  const [currentUser, setCurrentUser] = useState({
    name: "익명 사용자", 
    color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`
  });

  // 문서 접속 사용자 목록
  const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
  
  // Tiptap 에디터 설정 - provider가 설정된 후에만 초기화
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        history: false,
        // StarterKit에서 중복된 확장 비활성화
        bulletList: false,
        orderedList: false, 
        listItem: false,
        blockquote: false,
        codeBlock: false
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Placeholder.configure({
        placeholder: '여기에 내용을 입력하세요...',
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
        emptyEditorClass: 'is-editor-empty',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image,
      BulletList,
      OrderedList,
      ListItem,
      Blockquote,
      CodeBlock,
      Highlight,
      Typography,
      // 협업 확장 기능 추가 - provider가 있을 때만 CollaborationCursor 활성화
      Collaboration.configure({
        document: ydoc,
      }),
      ...(provider ? [
        CustomCollaborationCursor.configure({
          provider: provider,
          user: currentUser,
          render: user => {
            const cursor = document.createElement('span');
            cursor.classList.add('collaboration-cursor');
            
            // 커서 스타일 설정 - 간단한 세로선만 표시
            cursor.style.position = 'absolute';
            cursor.style.pointerEvents = 'none';
            cursor.style.zIndex = '10';
            cursor.style.borderLeft = `2px solid ${user.color}`;
            cursor.style.height = '1.5em';
            
            return cursor;
          },
        })
      ] : []),
    ],
    content: '',
    autofocus: true,
    editable: true,
    injectCSS: false,
    // SSR 경고 해결
    immediatelyRender: false
  }, [provider, currentUser]); // provider와 currentUser가 변경될 때 에디터 다시 초기화
  
  // 프로젝트 ID를 확실히 설정하는 함수
  const forceSetProjectId = (id: string | null) => {
    // 빈 문자열, 'null' 문자열, undefined는 모두 null로 처리
    let normalizedId = id;
    
    // 빈 문자열일 경우 URL 파라미터에서 직접 가져와보기
    if (id === '') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const projectIdFromUrl = urlParams.get('projectId');
        
        // URL에 실제 projectId 값이 있는지 확인
        if (projectIdFromUrl !== null && projectIdFromUrl !== '') {
          normalizedId = projectIdFromUrl;
        } else {
          if (id === '' || id === 'null' || id === undefined) {
            normalizedId = null;
          }
        }
      } catch (error) {
        if (id === '' || id === 'null' || id === undefined) {
          normalizedId = null;
        }
      }
    } else if (id === 'null' || id === undefined) {
      normalizedId = null;
    }
    
    setSelectedProjectId(normalizedId);
    debugRef.current.selectedProjectId = normalizedId;
    
    // 디버깅 정보 업데이트
    setProjectIdDebug({
      source: '직접설정',
      value: id === null ? 'null' : String(id || ''),
      normalized: normalizedId === null ? 'null' : String(normalizedId)
    });
    
    // projectId가 있으면 고정된 것으로 표시
    if (normalizedId) {
      setProjectIdFixed(true);
      debugRef.current.projectIdFixed = true;
    }
  };
  
  // URL 쿼리 파라미터로부터 프로젝트 ID를 가져옴
  useEffect(() => {
    const getProjectIdFromUrl = () => {
      if (typeof window !== 'undefined') {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const urlProjectId = urlParams.get('projectId');
          if (urlProjectId && urlProjectId !== '' && urlProjectId !== 'null') {
            return urlProjectId;
          }
        } catch (e) {
          console.error("URL에서 projectId 파싱 오류:", e);
        }
      }
      return null;
    };

    // 값의 우선순위: searchParams > URL > 현재 상태
    const projectIdToUse = projectId || getProjectIdFromUrl() || selectedProjectId;

    if (projectIdToUse && projectIdToUse !== selectedProjectId) {
      console.log("프로젝트 ID 설정:", projectIdToUse);
      
      // 프로젝트 ID 유효성 확인
      const validateProjectId = async () => {
        try {
          // 프로젝트 ID가 유효한지 확인 (API 호출)
          const response = await fetch(`/api/projects/${projectIdToUse}`);
          
          if (response.ok) {
            // 프로젝트가 존재하고 접근 권한이 있음
            const project = await response.json();
            setSelectedProjectId(projectIdToUse);
            debugRef.current.projectIdParam = projectIdToUse;
            debugRef.current.selectedProjectId = projectIdToUse;
            
            // 프로젝트 이름 설정
            setProjectName(project.name);
            
            // 경고 표시 관련
            if (isNewDocument) {
              setProjectIdWarning(true);
              setTimeout(() => setProjectIdWarning(false), 5000);
            }
          } else {
            // 이미 유효하지 않은 projectId가 URL에 있는 경우, URL에서 제거
            if (typeof window !== 'undefined') {
              const currentUrl = new URL(window.location.href);
              currentUrl.searchParams.delete('projectId');
              window.history.replaceState({}, '', currentUrl.toString());
            }
            
            // 프로젝트가 존재하지 않거나 접근 권한이 없음
            console.error("지정된 프로젝트에 접근할 수 없습니다. 기본 프로젝트를 사용합니다.");
            
            // 첫 번째 프로젝트 가져오기 시도
            getDefaultProject();
          }
        } catch (error) {
          console.error("프로젝트 ID 검증 중 오류:", error);
          getDefaultProject();
        }
      };
      
      // 기본 프로젝트 가져오기 함수
      const getDefaultProject = async () => {
        try {
          const response = await fetch('/api/projects');
          if (response.ok) {
            const projects = await response.json();
            if (projects.length > 0) {
              const defaultProjectId = projects[0].id;
              setSelectedProjectId(defaultProjectId);
              // URL 업데이트
              if (typeof window !== 'undefined') {
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('projectId', defaultProjectId);
                window.history.replaceState({}, '', currentUrl.toString());
              }
            } else {
              createDefaultProject();
            }
          } else {
            createDefaultProject();
          }
        } catch (error) {
          console.error("기본 프로젝트 가져오기 실패:", error);
          createDefaultProject();
        }
      };
      
      // 기본 프로젝트 생성 함수
      const createDefaultProject = async () => {
        try {
          const response = await fetch('/api/projects', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: "내 프로젝트",
              description: "자동으로 생성된 프로젝트입니다."
            })
          });
          
          if (response.ok) {
            const newProject = await response.json();
            setSelectedProjectId(newProject.id);
            // URL 업데이트
            if (typeof window !== 'undefined') {
              const currentUrl = new URL(window.location.href);
              currentUrl.searchParams.set('projectId', newProject.id);
              window.history.replaceState({}, '', currentUrl.toString());
            }
          } else {
            console.error("기본 프로젝트 생성 실패");
          }
        } catch (error) {
          console.error("기본 프로젝트 생성 중 오류:", error);
        }
      };
      
      validateProjectId();
    }
    
    // URL 쿼리스트링에서 폴더 정보 가져오기
    const folderIdParam = searchParams?.get('folderId') || null;
    const folderNameParam = searchParams?.get('folderName') || null;
    
    if (folderIdParam && folderNameParam && isNewDocument) {
      setFolder(folderNameParam);
      setFolderId(folderIdParam);
    }
  }, [projectId, isNewDocument, searchParams, selectedProjectId]);
  
  // 문서 데이터 로드 (실제로는 API 호출)
  useEffect(() => {
    if (isNewDocument) {
      // 새 문서 초기화
      setTitle("제목 없음");
      setEmoji("📄");
      setIsStarred(false);
      
      // URL 쿼리스트링에서 폴더 정보 가져오기
      const folderIdParam = searchParams?.get('folderId') || null;
      const folderNameParam = searchParams?.get('folderName') || null;
      
      if (folderIdParam && folderNameParam) {
        // 전달받은 폴더 정보가 있으면 해당 폴더로 설정
        setFolder(folderNameParam);
        setFolderId(folderIdParam);
      } else {
        // 전달받은 폴더 정보가 없으면 기본 폴더로 설정
        setFolder("기본 폴더");
        setFolderId(null);
      }
      
      // 에디터 내용 초기화
      if (editor) {
        editor.commands.setContent('<p></p>');
      }
      
      // 새 문서에서는 URL의 projectId 파라미터를 설정 (칸반보드와 동일한 패턴)
      if (projectId) {
        setSelectedProjectId(projectId);
      }
    } else if (params.id !== "new") {
      // 로딩 상태 시작
      setIsLoading(true);
      setLoadingError(null);
      
      // 실제 API 호출로 문서 데이터 가져오기
      const fetchDocument = async () => {
        try {
          const response = await fetch(`/api/documents/${params.id}`);
          
          if (!response.ok) {
            throw new Error('문서를 불러오는데 실패했습니다.');
          }
          
          const data = await response.json();
          
          // 문서 데이터 설정
          setDocumentData({
            id: data.id,
            title: data.title || '제목 없음',
            content: data.content || '',
            emoji: data.emoji || '',
            isStarred: data.isStarred || false,
            folder: data.folder || '기본 폴더',
            folderId: data.folderId || null,
            tags: data.tags ? JSON.parse(data.tags) : [],
            projectId: data.projectId || '',
          });

          // 상태 업데이트
          setTitle(data.title);
          setEmoji(data.emoji || "📄");
          setIsStarred(data.isStarred || false);
          setFolder(data.folder || "기본 폴더");
          setFolderId(data.folderId || null);
          
          // 읽기 전용 모드 설정
          setIsReadOnlyMode(data.isReadOnly || false);
          
          // Tags 처리
          if (data.tags) {
            try {
              const parsedTags = JSON.parse(data.tags);
              setTags(Array.isArray(parsedTags) ? parsedTags : ["문서"]);
            } catch {
              setTags(["문서"]);
            }
          } else {
            setTags(["문서"]);
          }

          // 암호 보호 상태 설정
          const isProtected = data.isPasswordProtected || false;
          setIsPasswordProtected(isProtected);
          setDocumentPassword(data.password ? '********' : null);
          
          // 비밀번호 보호된 문서이고 아직 인증되지 않았으면 인증 요구
          if (isProtected && !isPasswordVerified) {
            setNeedsPasswordVerification(true);
            // 로딩 상태 해제하여 인증 화면 표시
            setIsLoading(false);
            return;
          }
          
          // 프로젝트 ID 설정
          let projectIdToUse = null;
          if (projectId) {
            projectIdToUse = projectId;
          } else if (data.projectId) {
            projectIdToUse = data.projectId;
          }
          
          // 디버깅용 참조 업데이트
          debugRef.current.projectIdFromAPI = data.projectId;
          
          // 프로젝트 ID 설정
          forceSetProjectId(projectIdToUse);
          
          // 에디터 내용 설정 (Y.js 콘텐츠가 없을 경우)
          const timeoutId = setTimeout(() => {
            if (!contentLoadedFromYjs && editor && data.content) {
              console.log('Y.js 데이터가 없어 DB 내용을 로드합니다.');
              
              if (editor.isEmpty) {
                editor.commands.setContent(data.content || '<p></p>');
              }
            }
            setIsLoading(false);
          }, 2000);
          
          return () => clearTimeout(timeoutId);
        } catch (error) {
          // 에러 발생 시 샘플 데이터 사용
          setTitle("문서를 불러올 수 없습니다");
          setEmoji("❌");
          if (editor) {
            editor.commands.setContent('<p>문서를 불러오는 중 오류가 발생했습니다.</p>');
          }
          
          setLoadingError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
          setIsLoading(false);
        }
      };
      
      fetchDocument();
    }
  }, [params.id, isNewDocument, editor, projectId, contentLoadedFromYjs, searchParams]);
  
  // Y.js 컨텐츠가 로드되면 로딩 상태 해제
  useEffect(() => {
    if (contentLoadedFromYjs && isLoading) {
      console.log('Y.js에서 컨텐츠를 불러왔습니다.');
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, [contentLoadedFromYjs, isLoading]);
  
  // 바깥 영역 클릭 감지 이벤트
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenu && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      
      if (showSlashMenu && slashMenuRef.current && !slashMenuRef.current.contains(event.target as Node)) {
        setShowSlashMenu(false);
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSlashMenu) {
        // 슬래시 메뉴가 열려있을 때 모든 키 입력에 대해 메뉴 닫기
        // 단, 화살표 키와 Tab, Enter는 제외하여 메뉴 탐색 가능하게 함
        const allowedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
        
        if (!allowedKeys.includes(e.key)) {
          setShowSlashMenu(false);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMenu, showSlashMenu]);
  
  // 메뉴 표시
  const handleShowMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.bottom });
    setShowMenu(true);
  };
  
  // 블록 타입 변경 함수
  const applyBlockType = (type: string) => {
    if (!editor) return;
    
    // 슬래시 메뉴가 열려있을 때만 슬래시 제거
    if (showSlashMenu) {
      // 마지막 슬래시 제거
      editor.commands.deleteRange({
        from: editor.state.selection.from - 1,
        to: editor.state.selection.from
      });
    }
    
    switch (type) {
      case 'paragraph':
        editor.chain().focus().setParagraph().run();
        break;
      case 'heading1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'heading2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'heading3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bulletList':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'orderedList':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'taskList':
        editor.chain().focus().toggleTaskList().run();
        break;
      case 'blockquote':
        editor.chain().focus().toggleBlockquote().run();
        break;
      case 'codeBlock':
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case 'horizontalRule':
        editor.chain().focus().setHorizontalRule().run();
        break;
      case 'image':
        const url = window.prompt('이미지 URL을 입력하세요');
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
        break;
      case 'ai':
        summarizeDocument();
        break;
      case 'template':
        showTemplates();
        break;
    }
    
    setShowSlashMenu(false);
  };
  
  // 문서 요약 함수
  const summarizeDocument = async () => {
    if (!editor) return;
    
    try {
      setIsSummarizing(true);
      setShowSummaryModal(true);
      
      // 에디터 내용 가져오기
      const content = editor.getHTML();
      
      // AI 요약 API 호출
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
      
      if (!response.ok) {
        throw new Error('문서 요약 중 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      setDocumentSummary(data.summary);
    } catch (error) {
      console.error('문서 요약 중 오류:', error);
      setDocumentSummary('문서 요약 중 오류가 발생했습니다.');
    } finally {
      setIsSummarizing(false);
    }
  };
  
  // 템플릿 생성 함수
  const createDocumentTemplate = async (templateType: string) => {
    if (!editor) return;
    
    try {
      setIsCreatingTemplate(true);
      setSelectedTemplate(templateType);
      
      // 회의록 템플릿일 경우 접속 중인 사용자 정보 추가
      let participants = '';
      if (templateType === 'meeting' && connectedUsers.length > 0) {
        participants = connectedUsers
          .map(user => user.name || '익명 사용자')
          .join(', ');
      }
      
      // AI 템플릿 생성 API 호출
      const response = await fetch('/api/ai/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          templateType,
          participants: participants // 참석자 정보 전달
        }),
      });
      
      if (!response.ok) {
        throw new Error('템플릿 생성 중 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      
      // 에디터에 템플릿 내용 삽입 (기존 내용 대체)
      editor.commands.setContent(data.content);
      
      // 문서 제목 설정 (템플릿에 맞게)
      const templateInfo = templates.find(t => t.id === templateType);
      if (templateInfo) {
        // 문서 제목 업데이트
        const titleInput = document.querySelector('input[placeholder="제목 없음"]') as HTMLInputElement;
        if (titleInput) {
          titleInput.value = templateInfo.name;
          // 강제로 change 이벤트 발생시키기
          const event = new Event('input', { bubbles: true });
          titleInput.dispatchEvent(event);
          
          // title 상태 업데이트 (React 상태 동기화)
          setTitle(templateInfo.name);
        }
      }
      
    } catch (error) {
      console.error('템플릿 생성 중 오류:', error);
    } finally {
      setIsCreatingTemplate(false);
      setShowTemplateMenu(false);
      setSelectedTemplate(null);
    }
  };
  
  // 슬래시 메뉴에서 템플릿 보기
  const showTemplates = () => {
    setShowTemplateMenu(true);
  };
  
  // 단축키 핸들러 추가
  useEffect(() => {
    if (!editor) return;
    
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      // 윈도우 키(Meta 키) + '.' 조합은 이모티콘 선택기를 위해 무시
      if (event.key === '.' && (event.metaKey || event.ctrlKey)) {
        return;
      }
      
      // Ctrl(또는 Mac에서 Cmd) 키가 눌려있지 않으면 무시
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      
      if (!modKey) {
        return;
      }
      
      // Ctrl/Cmd + 숫자 키 조합
      if (event.key === '1') {
        event.preventDefault();
        applyBlockType('heading1');
      } else if (event.key === '2') {
        event.preventDefault();
        applyBlockType('heading2');
      } else if (event.key === '3') {
        event.preventDefault();
        applyBlockType('heading3');
      } else if (event.key === '0') {
        event.preventDefault();
        applyBlockType('paragraph');
      }
      
      // Ctrl/Cmd + Shift + 키 조합
      if (event.shiftKey) {
        if (event.key === '8' || event.key === '*') { // 글머리 기호 목록
          event.preventDefault();
          applyBlockType('bulletList');
        } else if (event.key === '7' || event.key === '&') { // 번호 매기기 목록
          event.preventDefault();
          applyBlockType('orderedList');
        } else if (event.key === '9' || event.key === '(') { // 할 일 목록
          event.preventDefault();
          applyBlockType('taskList');
        }
      }
      
      // Ctrl/Cmd + 키 조합 (기능키)
      if (event.key === 'b' && !event.shiftKey) {
        event.preventDefault();
        applyBlockType('blockquote');
      } else if (event.key === 'c' && !event.shiftKey && !event.altKey) { // Ctrl+C(복사)가 아닌 경우에만
        event.preventDefault();
        applyBlockType('codeBlock');
      } else if (event.key === 'l' && !event.shiftKey) {
        event.preventDefault();
        applyBlockType('horizontalRule');
      } else if (event.key === 'i' && !event.shiftKey && !event.altKey) { // Ctrl+I(기울임꼴)가 아닌 경우에만
        event.preventDefault();
        applyBlockType('image');
      }
    };
    
    // 이벤트 리스너는 캡처 단계에서 추가하지 않고 버블링 단계에서만 추가
    document.addEventListener('keydown', handleKeyboardShortcuts, false);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts, false);
    };
  }, [editor]);
  
  // 슬래시 키 입력 감지
  useEffect(() => {
    if (!editor) return;
    
    // Tiptap 에디터에 키 이벤트 리스너 추가
    const handleDOMEvents = () => {
      // 에디터의 DOM 요소 가져오기
      const editorElement = document.querySelector('.ProseMirror');
      if (!editorElement) {
        // DOM 요소가 아직 없으면 짧은 시간 후에 다시 시도
        setTimeout(handleDOMEvents, 100);
        return;
      }
      
      // 키 입력 이벤트 핸들러
      const handleKeyDown = (event: Event) => {
        const keyEvent = event as KeyboardEvent;
        if (keyEvent.key === '/' && !showSlashMenu) {
          try {
            // 현재 커서 위치 계산
            const { view } = editor;
            
            // 먼저 view와 state가 유효한지 확인
            if (!view || !view.state) {
              throw new Error("에디터 view 또는 state가 유효하지 않습니다");
            }
            
            const { state } = view;
            const { selection } = state;
            
            // 선택이 유효하고 ranges가 있는지 확인
            if (!selection || !selection.ranges || selection.ranges.length === 0) {
              throw new Error("에디터 선택 범위가 유효하지 않습니다");
            }
            
            const { ranges } = selection;
            const from = Math.min(...ranges.map(range => range.$from.pos));
            
            // 에디터 DOM 요소 직접 찾기
            const editorElement = document.querySelector('.ProseMirror');
            if (!editorElement) {
              throw new Error("에디터 DOM 요소를 찾을 수 없습니다");
            }
            
            const editorRect = editorElement.getBoundingClientRect();
            
            // 기본 메뉴 위치 (에디터 패딩 고려)
            let menuX = editorRect.left + 16; // 에디터의 px-2 패딩 고려
            let menuY = editorRect.top + 100;
            
            // 커서 좌표 계산 시도
            try {
              if (view.domAtPos && typeof view.domAtPos === 'function' && 
                  from >= 0 && from <= state.doc.content.size) {
                
                // 커서 좌표 가져오기
                const pos = view.coordsAtPos(from);
                
                // 좌표가 유효한지 확인
                if (pos && pos.left >= editorRect.left && pos.top >= editorRect.top) {
                  menuX = pos.left;
                  menuY = pos.bottom + 5;
                } else {
                  // 좌표가 유효하지 않으면 DOM 요소를 직접 찾아서 계산
                  const domPos = view.domAtPos(from);
                  if (domPos && domPos.node) {
                    let targetElement = domPos.node;
                    
                    // 텍스트 노드인 경우 부모 요소 찾기
                    if (targetElement.nodeType === Node.TEXT_NODE) {
                      targetElement = targetElement.parentElement || targetElement;
                    }
                    
                    // 요소가 Element인지 확인
                    if (targetElement instanceof Element) {
                      const rect = targetElement.getBoundingClientRect();
                      // 에디터 내부의 패딩을 고려하여 위치 조정
                      menuX = Math.max(rect.left + 16, editorRect.left + 16);
                      menuY = rect.bottom + 5;
                    } else {
                      // DOM 요소를 찾을 수 없는 경우, 현재 줄의 시작 위치 추정
                      // 에디터 내부 패딩 + 약간의 여백
                      menuX = editorRect.left + 16;
                      
                      // Y 좌표는 현재 스크롤 위치와 커서 위치를 고려하여 추정
                      const scrollTop = editorElement.scrollTop || 0;
                      const lineHeight = 24; // 대략적인 줄 높이 (1.5em * 16px)
                      
                      // 문서에서 현재 위치의 줄 번호 추정
                      const textBeforeCursor = state.doc.textBetween(0, from);
                      const lineNumber = (textBeforeCursor.match(/\n/g) || []).length;
                      
                      menuY = editorRect.top + (lineNumber * lineHeight) + lineHeight + 5 - scrollTop;
                    }
                  }
                }
              }
            } catch (coordError) {
              console.warn("커서 좌표 계산 실패:", coordError);
              // 기본 위치 사용 유지 (이미 위에서 설정됨)
            }
            
            // 화면 경계 확인
            if (menuX + 280 > window.innerWidth) {
              menuX = Math.max(window.innerWidth - 280, 0);
            }
            
            if (menuY + 420 > window.innerHeight) {
              menuY = Math.max(window.innerHeight - 420, 10);
            }
            
            // 위치를 먼저 설정한 후 메뉴 표시
            setSlashMenuPosition({
              x: menuX,
              y: menuY
            });
            
            // 슬래시가 입력될 시간을 주기 위해 약간의 지연 후 메뉴 표시
            setTimeout(() => {
              setShowSlashMenu(true);
            }, 10); // 10ms 지연으로 슬래시가 입력되도록
          } catch (error) {
            console.error("슬래시 메뉴 표시 중 오류 발생:", error);
            // 오류 발생 시 화면 중앙에 메뉴 표시
            setSlashMenuPosition({
              x: Math.max(window.innerWidth / 2 - 140, 10),
              y: window.innerHeight / 3
            });
            
            setTimeout(() => {
              setShowSlashMenu(true);
            }, 10);
          }
        } else if (keyEvent.key === 'Backspace' && showSlashMenu) {
          // 백스페이스 키를 눌렀을 때 슬래시 메뉴가 열려있으면 닫기
          try {
            const { state } = editor.view;
            const { selection } = state;
            const { from } = selection;
            
            // 커서 바로 앞의 문자가 '/'인지 확인
            const textBefore = state.doc.textBetween(Math.max(0, from - 1), from);
            
            if (textBefore === '/') {
              setShowSlashMenu(false);
            }
          } catch (error) {
            // 오류 발생 시 안전하게 메뉴 숨기기
            setShowSlashMenu(false);
          }
        }
      };
      
      // 입력 이벤트 핸들러 - 다른 방법으로 내용이 삭제된 경우 처리
      const handleInput = () => {
        if (showSlashMenu) {
          // 현재 선택 범위의 텍스트 확인
          const { state } = editor.view;
          const { selection } = state;
          const { from } = selection;
          
          // 슬래시 문자가 있는지 확인 (커서 위치 기준으로 최대 5자 앞까지 확인)
          const checkFrom = Math.max(0, from - 5);
          const surroundingText = state.doc.textBetween(checkFrom, from);
          
          // 선택 범위 주변에 슬래시가 없으면 메뉴 닫기
          if (!surroundingText.includes('/')) {
            setShowSlashMenu(false);
          }
        }
      };
      
      // 새 이벤트 리스너 추가 전에 기존 리스너 제거 (중복 방지)
      editorElement.removeEventListener('keydown', handleKeyDown);
      editorElement.removeEventListener('input', handleInput);
      
      // 이벤트 리스너 추가
      editorElement.addEventListener('keydown', handleKeyDown);
      editorElement.addEventListener('input', handleInput);
      
      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        editorElement.removeEventListener('keydown', handleKeyDown);
        editorElement.removeEventListener('input', handleInput);
      };
    };
    
    // 에디터 내용 변경 감지하는 핸들러 추가 (붙여넣기 등 작업 후 호출됨)
    const onEditorUpdate = () => {
      // 에디터 업데이트 시 이벤트 리스너 재등록
      handleDOMEvents();
    };
    
    // 에디터 업데이트 이벤트 구독
    editor.on('update', onEditorUpdate);
    
    // 에디터가 마운트된 후 DOM 이벤트 리스너 설정
    handleDOMEvents();
    
    return () => {
      // 이벤트 구독 해제
      editor.off('update', onEditorUpdate);
      
      // 에디터의 DOM 요소 가져오기
      const editorElement = document.querySelector('.ProseMirror');
      if (editorElement) {
        // 모든 이벤트 리스너 제거 시도
        const newEvent = new Event('keydown');
        const newInputEvent = new Event('input');
        editorElement.removeEventListener('keydown', () => {});
        editorElement.removeEventListener('input', () => {});
      }
    };
  }, [editor, showSlashMenu]);
  
  // 자동저장 관련 상태 추가
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // 자동저장 디바운스 타이머 ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 자동저장 함수
  const autoSave = useCallback(async () => {
    if (!editor || !autoSaveEnabled) return;
    
    try {
      setIsSaving(true);
      setHasUnsavedChanges(false);
      
      // 빈 제목은 "제목 없음"으로 설정
      const documentTitle = title.trim() || "제목 없음";
      
      // 에디터 내용 가져오기 (저장 시에는 HTML 형식으로)
      const content = editor.getHTML();
      
      // 프로젝트 ID 확인 또는 기본 프로젝트 획득
      let finalProjectId = selectedProjectId;
      
      if (!finalProjectId) {
        console.log("프로젝트 ID 검색 중...");
        
        // 1. URL에서 직접 확인 (최우선)
        const urlProjectId = getProjectIdFromUrl();
        
        if (urlProjectId) {
          finalProjectId = urlProjectId;
          setSelectedProjectId(urlProjectId);
          console.log("URL에서 프로젝트 ID 가져옴:", finalProjectId);
        } else {
          // 2. 기본 프로젝트를 가져오거나 생성
          try {
            // 사용자의 프로젝트 목록 가져오기 시도
            const projectsResponse = await fetch('/api/projects');
            
            if (projectsResponse.ok) {
              const projects = await projectsResponse.json();
              
              // 프로젝트가 있으면 첫 번째 프로젝트 ID 사용
              if (projects && projects.length > 0) {
                finalProjectId = projects[0].id;
                setSelectedProjectId(finalProjectId);
                console.log("기존 프로젝트 ID 사용:", finalProjectId);
              } else {
                // 프로젝트가 없으면 새 프로젝트 생성
                const createResponse = await fetch('/api/projects', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    name: "내 프로젝트",
                    description: "자동으로 생성된 프로젝트입니다."
                  })
                });
                
                if (createResponse.ok) {
                  const newProject = await createResponse.json();
                  finalProjectId = newProject.id;
                  setSelectedProjectId(finalProjectId);
                  console.log("새 프로젝트 생성:", finalProjectId);
                } else {
                  throw new Error('프로젝트를 생성할 수 없습니다');
                }
              }
              
              // URL 업데이트 (페이지 새로고침 없이)
              if (finalProjectId) {
                updateUrlWithProjectId(finalProjectId);
              }
            } else {
              throw new Error('프로젝트 목록을 가져올 수 없습니다');
            }
          } catch (error) {
            console.error("프로젝트 ID 획득 실패:", error);
            setProjectIdWarning(true);
            throw new Error('프로젝트 ID를 가져올 수 없습니다');
          }
        }
      }
      
      // 필수 값 검증
      if (!finalProjectId) {
        console.error("프로젝트 ID가 설정되지 않았습니다");
        setProjectIdWarning(true);
        throw new Error('프로젝트 ID가 필요합니다');
      }
      
      const isCreatingNew = !savedDocumentId || savedDocumentId === 'new';
      
      // Y.js 데이터 추출 및 인코딩
      let yjsData = null;
      if (provider) {
        try {
          // @ts-ignore - provider.document 타입 문제 무시
          const yDocState = Y.encodeStateAsUpdate(ydoc);
          yjsData = Buffer.from(yDocState).toString('base64');
          console.log("Y.js 데이터 추출 완료:", yjsData.length, "바이트");
        } catch (error) {
          console.error("Y.js 데이터 추출 중 오류:", error);
        }
      }
      
      // 문서 데이터 구성
      const documentData = {
        title: documentTitle,
        content: content,
        emoji,
        isStarred,
        folder,
        projectId: finalProjectId,
        tags,
        folderId,
        // Y.js 데이터 포함
        ycontent: yjsData,
        // 추가 필드: 이 문서가 Y.js를 사용하는지 여부를 표시
        isCollaborative: true
      };
      
      // API 엔드포인트 설정 (새 문서/기존 문서)
      const endpoint = isCreatingNew 
        ? `/api/documents` 
        : `/api/documents/${savedDocumentId}`;
      
      // HTTP 메서드 설정 (새 문서/기존 문서)
      const method = isCreatingNew ? 'POST' : 'PATCH';
      
      // API 호출
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(documentData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '알 수 없는 오류' }));
        throw new Error(`자동 저장 실패: ${errorData.message || response.statusText}`);
      }
      
      const responseData = await response.json();
      
      // 새 문서 생성 후 ID 저장 및 URL 업데이트
      if (isCreatingNew && responseData.id) {
        setSavedDocumentId(responseData.id);
        setIsNewDocument(false);
        
        // URL 업데이트
        const newUrl = `/documents/${responseData.id}?projectId=${finalProjectId}${
          folderId ? `&folderId=${folderId}&folderName=${encodeURIComponent(folder)}` : ''
        }`;
        window.history.replaceState({}, '', newUrl);
        
        // 새 문서가 생성되면 해당 ID로 Y.js 프로바이더 생성
        initializeProvider(responseData.id);
      }
      
      setLastSaved(new Date());
      
    } catch (error) {
      console.error('자동 저장 중 오류:', error);
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  }, [title, editor, emoji, isStarred, folder, tags, selectedProjectId, savedDocumentId, folderId, autoSaveEnabled, provider]);
  
  // URL에서 프로젝트 ID 가져오기 함수
  const getProjectIdFromUrl = () => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlProjectId = urlParams.get('projectId');
        if (urlProjectId && urlProjectId !== '' && urlProjectId !== 'null') {
          return urlProjectId;
        }
      } catch (e) {
        console.error("URL에서 projectId 파싱 오류:", e);
      }
    }
    return null;
  };
  
  // URL에 프로젝트 ID 업데이트하는 함수
  const updateUrlWithProjectId = (projectId: string) => {
    if (typeof window !== 'undefined') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('projectId', projectId);
      window.history.replaceState({}, '', currentUrl.toString());
    }
  };
  
  // Y.js 프로바이더 초기화 함수
  const initializeProvider = (documentId: string) => {
    // 기존 프로바이더 정리
    if (provider) {
      provider.destroy();
    }
    
    // 새 프로바이더 생성
    const hocuspocusProvider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:1234',
      name: documentId,
      document: ydoc,
      onConnect: () => {
        console.log('협업 서버에 연결되었습니다.');
        // 즉시 사용자 정보 설정
        hocuspocusProvider.setAwarenessField('user', currentUser);
        console.log('초기 사용자 정보 설정:', currentUser.name);
        
        setTimeout(() => {
          setContentLoadedFromYjs(true);
        }, 100);
      },
      onDisconnect: () => {
        console.log('협업 서버와의 연결이 끊어졌습니다.');
      },
      onAwarenessUpdate: ({ states }) => {
        // 접속 중인 사용자 목록 업데이트
        const users = Array.from(states.entries())
          .filter(([_, state]) => state.user)
          .map(([_, state]) => state.user);
        
        setConnectedUsers(users);
        console.log('접속 중인 사용자 목록 업데이트:', users.map(u => u.name).join(', '));
      },
      // Y.js 문서 동기화 이벤트
      onSynced: () => {
        console.log('Y.js 문서가 서버와 동기화되었습니다.');
        // 약간의 지연 후 플래그 설정 (에디터 포커스 문제 방지)
        setTimeout(() => {
          setContentLoadedFromYjs(true);
        }, 100);
      }
    });
    
    // 초기 사용자 정보 설정
    hocuspocusProvider.setAwarenessField('user', currentUser);
    
    setProvider(hocuspocusProvider);
  };
  
  // 현재 사용자 정보 가져오기 - AuthContext 사용
  useEffect(() => {
    if (user) {
      console.log('AuthContext에서 사용자 정보 가져옴:', user);
      
      // 사용자 랜덤 색상 생성
      let idValue = 0;
      try {
        // id가 uuid일 경우 간단한 해시값으로 변환
        idValue = user.id ? 
          user.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 
          Date.now();
      } catch (e) {
        idValue = Date.now();
      }
      
      const userColor = `#${(idValue % 0xffffff).toString(16).padStart(6, '0')}`;
      
      setCurrentUser({
        name: user.name || user.email || '익명 사용자',
        color: userColor,
      });
      
      console.log('사용자 정보 설정 완료:', user.name || user.email);
    } else {
      console.log('로그인된 사용자 정보가 없습니다.');
      
      // 사용자 정보가 없을 경우 직접 API 호출 시도
      const fetchUserDirectly = async () => {
        try {
          console.log('API를 통해 사용자 정보 직접 요청...');
          const response = await fetch('/api/auth/me', {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('API 응답:', data);
            
            if (data.authenticated && data.user) {
              const userColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
              
              setCurrentUser({
                name: data.user.name || data.user.email || '익명 사용자',
                color: userColor,
              });
            }
          } else {
            console.warn('사용자 정보 요청 실패:', response.status);
          }
        } catch (error) {
          console.error('사용자 정보 직접 요청 실패:', error);
        }
      };
      
      fetchUserDirectly();
    }
  }, [user]);

  // 문서 ID가 있을 때 협업 프로바이더 설정
  useEffect(() => {
    if (!savedDocumentId || savedDocumentId === 'new') return;
    
    // 기존 프로바이더 정리
    if (provider) {
      provider.destroy();
    }
    
    // 역할 정보를 포함한 사용자 정보 준비
    const userInfoWithRole = {
      ...currentUser,
      projectRole: userProjectRole,
      isProjectOwner
    };
    
    // 새 프로바이더 생성
    const hocuspocusProvider = new HocuspocusProvider({
      url: process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:1234',
      name: savedDocumentId,
      document: ydoc,
      onConnect: () => {
        console.log('협업 서버에 연결되었습니다.');
        // 즉시 사용자 정보 설정
        hocuspocusProvider.setAwarenessField('user', userInfoWithRole);
        console.log('문서 ID 변경 시 사용자 정보 설정:', userInfoWithRole);
        
        // Y.js에서 데이터가 로드되면 플래그 설정
        setTimeout(() => {
          setContentLoadedFromYjs(true);
        }, 100);
      },
      onDisconnect: () => {
        console.log('협업 서버와의 연결이 끊어졌습니다.');
      },
      onAwarenessUpdate: ({ states }) => {
        // 접속 중인 사용자 목록 업데이트
        const users = Array.from(states.entries())
          .filter(([_, state]) => state.user)
          .map(([_, state]) => state.user);
        
        setConnectedUsers(users);
        console.log('접속 중인 사용자 목록 업데이트:', users.map(u => u.name || '익명').join(', '));
      },
      // Y.js 문서 동기화 이벤트
      onSynced: () => {
        console.log('Y.js 문서가 서버와 동기화되었습니다.');
        // 약간의 지연 후 플래그 설정 (에디터 포커스 문제 방지)
        setTimeout(() => {
          setContentLoadedFromYjs(true);
        }, 100);
      }
    });
    
    // 초기 사용자 정보 설정
    hocuspocusProvider.setAwarenessField('user', userInfoWithRole);
    
    setProvider(hocuspocusProvider);
    
    return () => {
      hocuspocusProvider.destroy();
    };
  }, [savedDocumentId, ydoc, currentUser, userProjectRole, isProjectOwner]);
  
  // 프로바이더 변경 시 에디터 업데이트
  useEffect(() => {
    if (!editor || !provider) return;
      
    // 협업 커서 업데이트 전에 먼저 기본 콘텐츠가 있는지 확인
    if (editor.isEmpty) {
      // 기본 빈 단락을 추가하여 TextSelection 오류 방지
      editor.commands.insertContent('<p></p>');
    }
    
    // 역할 정보를 포함한 사용자 정보 준비
    const userInfoWithRole = {
      ...currentUser,
      projectRole: userProjectRole,
      isProjectOwner
    };
    
    // 명시적으로 사용자 정보 설정
    provider.setAwarenessField('user', userInfoWithRole);
    console.log('협업 프로바이더에 사용자 정보 설정:', userInfoWithRole);
    
    // 이미 확장이 있는지 확인
    const collaborationCursor = editor.extensionManager.extensions.find(
      extension => extension.name === 'collaborationCursor'
    );
    
    if (collaborationCursor) {
      try {
        // 이미 확장이 있으면 옵션 업데이트
        collaborationCursor.options.provider = provider;
        collaborationCursor.options.user = userInfoWithRole;
        console.log('협업 커서 옵션 업데이트 완료:', userInfoWithRole);
      } catch (err) {
        console.error('협업 커서 옵션 업데이트 실패:', err);
      }
    } else {
      try {
        // 확장이 없으면 에디터에 추가
        editor.extensionManager.extensions.push(
          CustomCollaborationCursor.configure({
            provider: provider,
            user: userInfoWithRole,
            render: user => {
              const cursor = document.createElement('span');
              cursor.classList.add('collaboration-cursor');
              
              // 절대 위치 스타일을 직접 설정 (transform 속성 제거)
              cursor.style.position = 'absolute';
              cursor.style.pointerEvents = 'none';
              cursor.style.zIndex = '10';
              cursor.style.borderLeft = `2px solid ${user.color}`;
              cursor.style.height = '1.5em';
              cursor.style.width = '0'; // 0 너비 설정
              
              const label = document.createElement('div');
              label.classList.add('collaboration-cursor-label');
              label.style.position = 'absolute';
              label.style.top = '-1.4em';
              label.style.left = '-3px'; // 위치 조정
              label.style.backgroundColor = user.color;
              label.style.color = 'white';
              label.style.padding = '0.1rem 0.3rem';
              label.style.borderRadius = '3px';
              label.style.fontSize = '0.7rem';
              label.style.whiteSpace = 'nowrap';
              label.style.pointerEvents = 'none';
              
              // 이름 표시 (역할 정보 추가)
              const userLabel = user.name || '익명';
              const roleLabel = user.isProjectOwner ? ' (소유자)' : 
                                (user.projectRole ? ` (${user.projectRole})` : '');
              label.textContent = userLabel + roleLabel;
              
              cursor.appendChild(label);
              return cursor;
            },
          })
        );
        console.log('새 협업 커서 추가 완료:', userInfoWithRole);
      } catch (err) {
        console.error('협업 커서 추가 실패:', err);
      }
    }
  }, [editor, provider, currentUser, userProjectRole, isProjectOwner]);
  
  // 문서 저장
  const saveDocument = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      
      // 빈 제목은 "제목 없음"으로 설정
      const documentTitle = title.trim() || "제목 없음";
      
      // 에디터 내용 가져오기
      const content = editor ? editor.getHTML() : '';
      
      // 프로젝트 ID 확인 - 여러 소스에서 확인
      let finalProjectId = selectedProjectId;
      
      // 1. URL에서 직접 확인 (최우선)
      const urlParams = new URLSearchParams(window.location.search);
      const urlProjectId = urlParams.get('projectId');
      
      if (urlProjectId && urlProjectId !== '' && urlProjectId !== 'null') {
        finalProjectId = urlProjectId;
      }
      
      // 2. 디버깅 참조 객체에서 확인 (백업)
      if (!finalProjectId && debugRef.current.projectIdParam) {
        finalProjectId = debugRef.current.projectIdParam;
      }
      
      // 프로젝트 ID 필수 체크
      if (!finalProjectId) {
        alert("프로젝트 ID가 필요합니다. 문서를 저장할 수 없습니다.");
        setIsSaving(false);
        return;
      }
      
      // API 요청 데이터 구성
      const documentData = {
        title: documentTitle,
        content,
        emoji,
        isStarred,
        isReadOnly: isReadOnlyMode,
        folder,
        tags,
        projectId: finalProjectId,
        folderId
      };
      
      // 저장된 문서가 있으면 업데이트, 없으면 새로 생성
      const isCreatingNew = !savedDocumentId;
      const endpoint = isCreatingNew ? '/api/documents' : `/api/documents/${savedDocumentId}`;
      const method = isCreatingNew ? 'POST' : 'PATCH';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
      });
      
      // 응답이 OK가 아닌 경우 에러 텍스트 확인
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`서버 응답 오류 (${response.status}): ${errorText}`);
      }
      
      const responseData = await response.json();
      
      // 새 문서 생성 후 ID 저장
      if (isCreatingNew && responseData.id) {
        setSavedDocumentId(responseData.id);
        setIsNewDocument(false);
        
        // URL 업데이트
        const newUrl = `/documents/${responseData.id}?projectId=${finalProjectId}`;
        window.history.replaceState({}, '', newUrl);
      }
      
      setSaveSuccess(true);
      
    } catch (error) {
      alert(error instanceof Error ? error.message : '문서 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // 프로젝트 정보 가져오기 함수
  const fetchProjectInfo = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const projectData = await response.json();
        setProjectName(projectData.name);
        
        // 프로젝트 소유자 확인
        if (user && projectData.userId === user.id) {
          setIsProjectOwner(true);
          setUserProjectRole('owner');
          console.log('사용자는 이 프로젝트의 소유자입니다.');
        } else {
          setIsProjectOwner(false);
          
          // 멤버인 경우 역할 확인
          if (user && projectData.members) {
            const currentUserMember = projectData.members.find(
              (member: any) => member.userId === user.id && member.inviteStatus === "accepted"
            );
            
            if (currentUserMember) {
              setUserProjectRole(currentUserMember.role);
              console.log(`사용자 역할: ${currentUserMember.role}`);
            } else {
              setUserProjectRole(null);
              console.log('사용자는 이 프로젝트의 멤버가 아닙니다.');
            }
          } else {
            setUserProjectRole(null);
          }
        }
      }
    } catch (error) {
      console.error('프로젝트 정보를 가져오는데 실패했습니다:', error);
      setUserProjectRole(null);
      setIsProjectOwner(false);
    }
  };

  // 프로젝트 ID가 변경될 때마다 프로젝트 정보 가져오기
  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectInfo(selectedProjectId);
    } else {
      // 프로젝트 ID가 없는 경우 역할 초기화
      setUserProjectRole(null);
      setIsProjectOwner(false);
    }
  }, [selectedProjectId, user]);
  
  // 폴더 목록 가져오기
  const fetchFolders = async () => {
    try {
      // 프로젝트 ID가 있을 경우 해당 프로젝트의 폴더만 가져옴
      const url = selectedProjectId 
        ? `/api/documents/folders?projectId=${selectedProjectId}`
        : '/api/documents/folders';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('폴더 목록을 가져오는데 실패했습니다.');
        return;
      }
      
      const data = await response.json();
      setAvailableFolders(data);
    } catch (error) {
      console.error('폴더 목록을 가져오는 중 오류:', error);
    }
  };

  // 프로젝트 ID가 변경될 때 폴더 목록 가져오기
  useEffect(() => {
    if (selectedProjectId) {
      fetchFolders();
    }
  }, [selectedProjectId]);

  // 폴더 변경 함수
  const handleFolderChange = (newFolderData: { id: string; name: string }) => {
    setFolder(newFolderData.name);
    setFolderId(newFolderData.id);
    setShowFolderDropdown(false);
  };
  
  // 새 폴더 생성 함수
  const createNewFolder = async (folderName: string) => {
    if (!folderName || !folderName.trim() || !selectedProjectId) {
      return;
    }
    
    try {
      const response = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderName.trim(),
          projectId: selectedProjectId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '폴더 생성 실패');
      }
      
      // 새 폴더 생성 성공
      const newFolder = await response.json();
      
      // 폴더 목록 업데이트
      fetchFolders();
      
      // 새 폴더로 설정
      setFolder(newFolder.name);
      setFolderId(newFolder.id);
      setShowFolderDropdown(false);
    } catch (error) {
      console.error('새 폴더 생성 중 오류:', error);
      alert('폴더를 생성하는 중 오류가 발생했습니다.');
    }
  };
  
  // 사이드바에서 폴더 생성 함수
  const createFolderFromSidebar = async () => {
    if (!folderModalName || !folderModalName.trim() || !selectedProjectId) {
      alert('폴더 이름을 입력해주세요.');
      return;
    }
    
    setIsFolderCreating(true);
    
    try {
      const response = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: folderModalName.trim(),
          projectId: selectedProjectId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '폴더 생성 실패');
      }
      
      // 새 폴더 생성 성공
      const newFolder = await response.json();
      
      // 폴더 목록 업데이트
      fetchFolders();
      
      // 모달 닫기 및 상태 초기화
      setShowFolderModal(false);
      setFolderModalName('');
      
      // 성공 메시지
      showToast('폴더 생성 완료', `'${newFolder.name}' 폴더가 생성되었습니다.`, 'success');
      
    } catch (error) {
      console.error('새 폴더 생성 중 오류:', error);
      alert(error instanceof Error ? error.message : '폴더를 생성하는 중 오류가 발생했습니다.');
    } finally {
      setIsFolderCreating(false);
    }
  };

  // 컨텐츠 변경 감지 및 자동저장 트리거
  useEffect(() => {
    if (!editor || !autoSaveEnabled) return;
    
    const handleUpdate = () => {
      setHasUnsavedChanges(true);
      
      // 이전 타이머 제거
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // 타이핑할 때마다 2초 후 자동저장
      autoSaveTimerRef.current = setTimeout(() => {
        autoSave();
      }, 2000); // 2초 지연
    };
    
    editor.on('update', handleUpdate);
    
    return () => {
      editor.off('update', handleUpdate);
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [editor, autoSaveEnabled, autoSave]);
  
  // 제목 변경시 자동저장 트리거
  useEffect(() => {
    if (!autoSaveEnabled || !title) return;
    
    // 이전 타이머 취소
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    setHasUnsavedChanges(true);
    
    // 제목 변경 후 2초 후 자동저장 실행
    autoSaveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 2000); // 2초 지연
  }, [title, autoSaveEnabled, autoSave]);

  // 새 문서 생성 시 즉시 자동저장 트리거
  useEffect(() => {
    if (isNewDocument && editor && autoSaveEnabled && title && selectedProjectId) {
      // 새 문서에서 제목이나 내용이 있으면 즉시 저장
      const timer = setTimeout(() => {
        autoSave();
      }, 1000); // 1초 후 즉시 저장
      
      return () => clearTimeout(timer);
    }
  }, [isNewDocument, editor, autoSaveEnabled, title, selectedProjectId, autoSave]);

  // 폴더, 이모지, 즐겨찾기 변경시 자동저장 트리거
  useEffect(() => {
    if (!autoSaveEnabled || isNewDocument) return;
    
    // 이전 타이머 취소
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    setHasUnsavedChanges(true);
    
    // 메타데이터 변경 후 2초 후 자동저장 실행
    autoSaveTimerRef.current = setTimeout(() => {
      autoSave();
    }, 2000);
  }, [folder, emoji, isStarred, autoSaveEnabled, autoSave, isNewDocument]);

  // 현재 사용자 정보가 변경될 때 provider에 적용
  useEffect(() => {
    if (!provider || !currentUser.name) return;

    console.log('사용자 정보를 협업 프로바이더에 적용:', currentUser.name);
    
    // 역할 정보 추가
    const userInfoWithRole = {
      ...currentUser,
      projectRole: userProjectRole,
      isProjectOwner
    };
    
    // provider의 awareness 데이터 업데이트
    try {
      provider.setAwarenessField('user', userInfoWithRole);
      console.log('프로바이더 사용자 정보 설정 완료', userInfoWithRole);
    } catch (error) {
      console.error('프로바이더 사용자 정보 설정 실패:', error);
    }
  }, [provider, currentUser, userProjectRole, isProjectOwner]);

  // 읽기 전용 모드 변경 시 문서 메타데이터 업데이트 및 전파
  useEffect(() => {
    if (!provider || !ydoc) return;
    
    try {
      // Y.js 문서 메타데이터 업데이트
      const metaData = ydoc.getMap('metaData');
      metaData.set('isReadOnlyMode', isReadOnlyMode);
      
      console.log(`문서 읽기 전용 모드 ${isReadOnlyMode ? '활성화' : '비활성화'} 정보 공유됨`);
    } catch (error) {
      console.error('문서 읽기 전용 모드 정보 공유 실패:', error);
    }
  }, [provider, ydoc, isReadOnlyMode]);
  
  // 다른 사용자의 읽기 전용 모드 변경 감지
  useEffect(() => {
    if (!ydoc) return;
    
    // 문서 메타데이터에서 읽기 전용 모드 상태 가져오기
    const metaData = ydoc.getMap('metaData');
    
    // 초기값 설정
    const initialReadOnlyMode = metaData.get('isReadOnlyMode');
    if (initialReadOnlyMode !== undefined) {
      // Y.js에서 반환되는 타입을 명시적으로 Boolean으로 변환
      const readOnlyValue = typeof initialReadOnlyMode === 'boolean' ? initialReadOnlyMode : false;
      setIsReadOnlyMode(readOnlyValue);
      console.log(`다른 사용자가 설정한 읽기 전용 모드 상태 수신: ${readOnlyValue}`);
    }
    
    // 메타데이터 변경 이벤트 구독
    const handleMetaDataUpdate = () => {
      const updatedReadOnlyMode = metaData.get('isReadOnlyMode');
      if (updatedReadOnlyMode !== undefined) {
        // Y.js에서 반환되는 타입을 명시적으로 Boolean으로 변환
        const readOnlyValue = typeof updatedReadOnlyMode === 'boolean' ? updatedReadOnlyMode : false;
        if (readOnlyValue !== isReadOnlyMode) {
          setIsReadOnlyMode(readOnlyValue);
          console.log(`다른 사용자가 읽기 전용 모드를 ${readOnlyValue ? '활성화' : '비활성화'}했습니다.`);
        }
      }
    };
    
    metaData.observe(handleMetaDataUpdate);
    
    return () => {
      metaData.unobserve(handleMetaDataUpdate);
    };
  }, [ydoc, isReadOnlyMode]);

  // 읽기 전용 모드 변경 시 에디터 편집 가능 여부 업데이트
  useEffect(() => {
    if (!editor) return;
    
    // 읽기 전용 모드에서는 모든 사용자가 편집 불가능
    const editableState = !isReadOnlyMode;
    
    if (editor.isEditable !== editableState) {
      editor.setEditable(editableState);
      console.log(`에디터 편집 가능 상태 변경: ${editableState}, 사용자 역할: ${userProjectRole || '역할 없음'}, 읽기 전용 모드: ${isReadOnlyMode}, 프로젝트 소유자: ${isProjectOwner}`);
    }
  }, [editor, isReadOnlyMode, userProjectRole, isProjectOwner]);

  // 에디터 컨테이너에 별도 레이어 추가
  useEffect(() => {
    if (!editor) return;
    
    const container = document.querySelector('.editor-container');
    if (!container) return;
    
    const cursorLayer = document.createElement('div');
    cursorLayer.className = 'cursor-layer';
    cursorLayer.style.position = 'absolute';
    cursorLayer.style.top = '0';
    cursorLayer.style.left = '0';
    cursorLayer.style.right = '0';
    cursorLayer.style.bottom = '0';
    cursorLayer.style.pointerEvents = 'none';
    cursorLayer.style.zIndex = '10';
    
    container.appendChild(cursorLayer);
    
    // 커서 레이어에 커서 렌더링 로직 구현
    // ...
    
    return () => {
      cursorLayer.remove();
    };
  }, [editor]);

  // 읽기 전용 모드 토글 함수
  const toggleReadOnlyMode = () => {
    if (isButtonDebouncing) return;
    
    // 디바운싱 상태 활성화
    setIsButtonDebouncing(true);
    
    // 읽기 전용 모드 토글
    setIsReadOnlyMode(prev => !prev);
    
    // 1초 후 디바운싱 상태 비활성화
    setTimeout(() => {
      setIsButtonDebouncing(false);
    }, 1000);
    
    // 읽기 전용 모드가 변경되면 문서를 저장하여 DB에 반영
    if (savedDocumentId) {
      saveReadOnlyState(!isReadOnlyMode);
    }
  };
  
  // 읽기 전용 상태만 저장하는 함수
  const saveReadOnlyState = async (newState: boolean) => {
    try {
      if (!savedDocumentId) return;
      
      // API 요청 - 읽기 전용 상태만 업데이트
      await fetch(`/api/documents/${savedDocumentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isReadOnly: newState,
          projectId: selectedProjectId
        })
      });
      
      console.log(`문서 읽기 전용 모드 ${newState ? '활성화' : '비활성화'} 상태가 저장되었습니다.`);
    } catch (error) {
      console.error('읽기 전용 상태 저장 중 오류:', error);
    }
  };

  const [documentData, setDocumentData] = useState<Document>({
    id: params.id,
    title: '',
    emoji: '📄',
    isStarred: false,
    folder: 'Root',
    folderId: null,
    tags: [],
    content: '',
    projectId: '',
  });

  const [showSecurityMenu, setShowSecurityMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [documentPassword, setDocumentPassword] = useState<string | null>(null);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [needsPasswordVerification, setNeedsPasswordVerification] = useState(false);
  
  // 드롭다운 메뉴 토글 함수
  const toggleSecurityMenu = (e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    setShowSecurityMenu(!showSecurityMenu);
  };
  
  // 문서 외부 클릭 감지 이벤트 추가
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSecurityMenu && !target.closest('.security-menu-container')) {
        setShowSecurityMenu(false);
      }
      if (showFolderModal && target.classList.contains('backdrop-blur-sm')) {
        setShowFolderModal(false);
        setFolderModalName('');
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSecurityMenu, showFolderModal]);

  // 문서 비밀번호 업데이트 함수
  const updateDocumentPassword = async (password: string | null, isProtected: boolean) => {
    try {
      setIsPasswordSaving(true);
      
      const response = await fetch(`/api/documents/${params.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          isPasswordProtected: isProtected,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '암호 설정 중 오류가 발생했습니다.');
      }

      // 성공적으로 저장되면 상태 업데이트
      setDocumentPassword(password);
      setIsPasswordProtected(isProtected);
      setShowPasswordModal(false);
      
      // 성공 메시지 표시
      showToast(
        "암호 설정 완료", 
        isProtected ? "문서에 암호가 설정되었습니다." : "문서 암호가 해제되었습니다.", 
        "success"
      );
      
    } catch (error: any) {
      showToast(
        "암호 설정 실패", 
        error.message, 
        "error"
      );
    } finally {
      setIsPasswordSaving(false);
    }
  };

  // 드롭다운 메뉴에서 암호 설정 버튼 클릭 핸들러
  const handleOpenPasswordModal = () => {
    setShowPasswordModal(true);
    setShowSecurityMenu(false);
  };
  
  // 암호 검증 성공 처리
  const handlePasswordVerificationSuccess = () => {
    setIsPasswordVerified(true);
    setNeedsPasswordVerification(false);
  };
  
  // 로딩 중이거나 암호 검증이 필요한 경우 적절한 UI 표시
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-background text-foreground`}>
        <div className="text-center flex flex-col items-center">
          <div className={`relative w-24 h-24 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-16 h-16 border-4 border-current border-solid rounded-full opacity-20 ${theme === 'dark' ? 'border-blue-500' : 'border-blue-600'}`}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`w-16 h-16 border-4 border-current border-solid rounded-full border-t-transparent animate-spin`}></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>C</span>
            </div>
          </div>
          <p className={`mt-6 text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>문서를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  if (needsPasswordVerification) {
    return (
      <PasswordVerification 
        documentId={params.id} 
        onSuccess={handlePasswordVerificationSuccess} 
        onCancel={() => router.push('/documents')}
      />
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#1f1f21]">
      {/* 사이드바 */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-gray-200 bg-white dark:bg-[#2a2a2c] dark:border-gray-700 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:relative md:flex-shrink-0 flex flex-col`}
      >
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-black dark:bg-blue-600 rounded-lg flex items-center justify-center mr-2">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">Colla</span>
          </div>
          <button
            className="md:hidden"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          >
            <XIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        
        <nav className="flex-grow px-4 py-4 space-y-2 overflow-y-auto">
          <SidebarLink
            icon={<SearchIcon className="w-5 h-5" />}
            text="검색"
            href="#" 
            theme={theme}
            onClick={(e) => { e.preventDefault(); alert('검색 기능 구현 예정'); }}
          />
          <SidebarLink
            icon={<LayoutDashboardIcon className="w-5 h-5" />}
            text="대시보드"
            href="/"
            active={pathname === "/"}
            theme={theme}
          />
          
          <div className="pt-4">
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              프로젝트
            </h3>
            <nav className="mt-2 space-y-1">
              {projects.map((project) => (
                <SidebarLink
                  key={project.id}
                  icon={<FolderIcon className="w-5 h-5" />}
                  text={project.name}
                  href={`/documents/${params.id}?projectId=${project.id}`}
                  small
                  active={projectId === project.id}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentProject(project);
                    forceSetProjectId(project.id);
                  }}
                  theme={theme}
                  isProject={true}
                />
              ))}
              <SidebarLink
                icon={<PlusIcon className="w-5 h-5" />}
                text="새 프로젝트"
                href="/projects/new"
                active={pathname === "/projects/new"}
                theme={theme}
                small
                onClick={() => router.push("/projects/new")}
              />
            </nav>
          </div>

          <div className="pt-4">
            <h3 className="px-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              내 작업 공간
            </h3>
            <div className="mt-2 space-y-1">
              <SidebarLink
                icon={<Trello className="w-5 h-5" />}
                text="칸반보드"
                href={currentProject ? `/kanban?projectId=${currentProject.id}` : "/kanban"}
                active={pathname?.startsWith("/kanban")}
                theme={theme}
                small
              />
              <SidebarLink
                icon={<CalendarIcon className="w-5 h-5" />}
                text="캘린더"
                href={currentProject ? `/calendar?projectId=${currentProject.id}` : "/calendar"}
                active={pathname?.startsWith("/calendar")}
                theme={theme}
                small
              />
              
              {/* 문서 섹션 */}
              <div>
                <button
                  onClick={() => setIsDocumentsSubmenuOpen(!isDocumentsSubmenuOpen)}
                  className={`flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md transition-colors duration-150 ${
                    theme === 'dark'
                      ? pathname?.startsWith("/documents")
                        ? "bg-blue-900 bg-opacity-30 text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                        : "text-gray-300 hover:bg-gray-700 hover:text-gray-100"
                      : pathname?.startsWith("/documents")
                        ? "bg-blue-100 bg-opacity-50 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                        : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`mr-2.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      <FileTextIcon className="w-5 h-5" />
                    </div>
                    <span>문서</span>
                  </div>
                  <ChevronRightIcon 
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isDocumentsSubmenuOpen ? 'transform rotate-90' : ''
                    } ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}
                  />
                </button>
                
                {isDocumentsSubmenuOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <SidebarLink
                      icon={<FileTextIcon className="w-4 h-4" />}
                      text="모든 문서"
                      href={projectId ? `/documents?projectId=${projectId}` : "/documents"}
                      active={pathname === "/documents"}
                      theme={theme}
                      small
                    />
                    
                    {/* 폴더 목록 */}
                    {availableFolders.map((folder) => (
                      <SidebarLink
                        key={folder.id}
                        icon={<FolderIcon className="w-4 h-4" />}
                        text={folder.name}
                        href={projectId ? `/documents?projectId=${projectId}&folderId=${folder.id}` : `/documents?folderId=${folder.id}`}
                        active={false}
                        theme={theme}
                        small
                        badgeCount={folder.count}
                      />
                    ))}
                    
                    {/* 새 폴더 만들기 */}
                    <button
                      onClick={() => setShowFolderModal(true)}
                      className={`flex items-center w-full px-2 py-1.5 text-sm rounded-md transition-colors duration-150 ${
                        theme === 'dark'
                          ? "text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                          : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                      }`}
                    >
                      <div className={`mr-2.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        <PlusIcon className="w-4 h-4" />
                      </div>
                      <span>새 폴더</span>
                    </button>
                  </div>
                )}
              </div>
              
              <SidebarLink 
                icon={<UsersIcon className="w-5 h-5"/>} 
                text="팀원 관리" 
                href={currentProject ? `/projects/${currentProject.id}/members` : "/projects"}
                active={pathname?.includes("/projects") && pathname?.includes("/members")}
                theme={theme}
                small 
              />
              <SidebarLink
                icon={<VideoIcon className="w-5 h-5" />}
                text="화상 회의"
                href="/meeting"
                active={pathname?.startsWith("/meeting")}
                theme={theme}
                small
              />
              <SidebarLink
                icon={<BarChart3Icon className="w-5 h-5" />}
                text="보고서"
                href="/reports"
                active={pathname?.startsWith("/reports")}
                theme={theme}
                small
              />
            </div>
          </div>
        </nav>

        <div className="p-4">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center flex-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none">
                  <UserIcon className="w-6 h-6 mr-3 rounded-full bg-gray-200 dark:bg-gray-600 p-0.5 text-gray-700 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{user?.name || user?.email || '사용자'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" sideOffset={5}>
                <DropdownMenuLabel className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push('/mypage')} className="cursor-pointer">
                  <UserIcon className="w-4 h-4 mr-2" />
                  <span>정보 수정</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer">
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  <span>설정</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                  {theme === 'dark' ? <SunIcon className="w-4 h-4 mr-2" /> : <MoonIcon className="w-4 h-4 mr-2" />}
                  <span>{theme === 'dark' ? "라이트 모드" : "다크 모드"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/50 focus:text-red-600 dark:focus:text-red-400">
                  <LogOutIcon className="w-4 h-4 mr-2" />
                  <span>로그아웃</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* 알림 버튼 */}
            <button 
              onClick={() => alert('알림 기능은 대시보드에서 확인해주세요.')}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none outline-none transition-colors"
              title="알림"
            >
              <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* 모바일 사이드바 오버레이 */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

            {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#2a2a2c]">
      {/* 상단 네비게이션 바 */}
        <div className="bg-white dark:bg-[#2a2a2c] py-4 px-6">
          <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
              {/* 모바일 메뉴 버튼 */}
              <button
                className="md:hidden"
                onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <span className="text-gray-900 dark:text-gray-100 font-medium truncate max-w-[200px] sm:max-w-xs">
              {isLoading ? '문서 로딩 중...' : (title || '새 문서')}
              {isLoading && (
                  <span className={`ml-2 inline-block relative w-4 h-4 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className={`w-3 h-3 border border-current border-solid rounded-full opacity-20 ${theme === 'dark' ? 'border-blue-500' : 'border-blue-600'}`}></span>
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className={`w-3 h-3 border border-current border-solid rounded-full border-t-transparent animate-spin`}></span>
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-xs font-bold ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>C</span>
                    </span>
                  </span>
              )}
              
            </span>
            <div className="flex items-center space-x-1 flex-shrink-0">
            <button
              onClick={saveDocument}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={isSaving || isLoading}
              title={isSaving ? "저장 중..." : "저장"}
            >
              {isSaving ? (
                <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <SaveIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            {/* 읽기 전용 모드 버튼 또는 상태 표시 (관리자/소유자는 버튼, 일반 멤버는 상태 표시) */}
            {((userProjectRole && userProjectRole !== 'member') || isProjectOwner) ? (
              <button 
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" 
                onClick={!isLoading && !isButtonDebouncing ? toggleReadOnlyMode : undefined}
                disabled={isLoading}
                title={isReadOnlyMode ? "편집 모드로 전환" : "읽기 전용 모드로 전환"}
              >
                {isReadOnlyMode ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-gray-600 dark:text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-gray-600 dark:text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            ) : (
              isReadOnlyMode && (
                <div className="p-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5 text-gray-600 dark:text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 616 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )
            )}
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" disabled={isLoading}>
                <ShareIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="relative security-menu-container">
              <button 
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center" 
                disabled={isLoading}
                onClick={toggleSecurityMenu}
              >
                  <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-1" />
                  <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              </button>
              
              {showSecurityMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-[#2a2a2c] rounded-xl shadow-lg z-10 border border-gray-100 dark:border-gray-700 py-1 overflow-hidden">
                  <div className="py-1">
                    <button 
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center" 
                      onClick={() => {
                        // 문서 접근 권한 설정
                        setShowSecurityMenu(false);
                      }}
                    >
                      <UsersIcon className="w-4 h-4 mr-2" />
                      <span>접근 권한 설정</span>
                    </button>
                    
                    <button 
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center" 
                      onClick={() => {
                        // 문서 권한 이력
                        setShowSecurityMenu(false);
                      }}
                    >
                      <ShieldIcon className="w-4 h-4 mr-2" />
                      <span>권한 이력 보기</span>
                    </button>
                    
                    <button 
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center" 
                      onClick={() => {
                        // 문서 암호 설정
                        handleOpenPasswordModal();
                      }}
                    >
                      <KeyIcon className="w-4 h-4 mr-2" />
                      <span>{isPasswordProtected ? "암호 변경" : "암호 설정"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(projectId ? `/documents?projectId=${projectId}` : '/documents')}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              돌아가기
            </Button> */}
            
            {/* 접속 중인 사용자 표시 추가 */}
            {connectedUsers.length > 0 && (
                <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                  <UsersIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{connectedUsers.length}명 접속 중</span>
                <div className="flex -space-x-2">
                  {connectedUsers.slice(0, 3).map((user, index) => (
                    <div 
                      key={index}
                        className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-white"
                      style={{ backgroundColor: user.color || '#888' }}
                      title={user.name}
                    >
                      {user.name.charAt(0)}
                    </div>
                  ))}
                  {connectedUsers.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs text-white">
                      +{connectedUsers.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* <div className="relative">
              <button
                onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                  className="flex items-center bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-sm text-gray-700 dark:text-gray-300"
                disabled={isLoading}
              >
                  <FolderIcon className="w-4 h-4 mr-1 text-gray-500 dark:text-gray-400" />
                <span className="truncate max-w-[150px]">{folder || '기본 폴더'}</span>
                <span className="ml-1">
                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </span>
              </button>
              
              {showFolderDropdown && (
                  <div className="absolute left-0 mt-1 w-64 bg-white dark:bg-[#2a2a2c] shadow-lg rounded-xl z-10 border border-gray-200 dark:border-gray-700">
                    <div className="py-2 px-3">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">폴더 선택</div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="새 폴더 이름..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      />
                      <button
                        onClick={() => createNewFolder(newFolderName)}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto py-1">
                    {availableFolders.length > 0 ? (
                      availableFolders.map((f) => (
                        <button
                          key={f.id}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${f.id === folderId ? 'bg-gray-50 dark:bg-gray-700 font-medium text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}
                          onClick={() => handleFolderChange({ id: f.id, name: f.name })}
                        >
                          <div className="flex items-center">
                              <FolderIcon className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                            <span className="truncate">{f.name}</span>
                          </div>
                          {f.id === folderId && (
                              <CheckIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </button>
                      ))
                    ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">폴더가 없습니다</div>
                    )}
                  </div>
                </div>
              )}
            </div> */}
            
          </div>
        </div>
      </div>
        {/* 문서 편집 영역 */}
        <div className="flex-1 overflow-auto">
      
      {/* 로딩 및 오류 상태 표시 */}
      {isLoading && (
            <div className={`min-h-screen flex items-center justify-center bg-background text-foreground`}>
          <div className="text-center flex flex-col items-center">
                <div className={`relative w-24 h-24 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-16 h-16 border-4 border-current border-solid rounded-full opacity-20 ${theme === 'dark' ? 'border-blue-500' : 'border-blue-600'}`}></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-16 h-16 border-4 border-current border-solid rounded-full border-t-transparent animate-spin`}></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>C</span>
                  </div>
                </div>
                <p className={`mt-6 text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>문서를 불러오는 중...</p>
          </div>
        </div>
      )}
      
      {loadingError && (
        <div className="max-w-7xl mx-auto mt-4 px-4">
              <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-500 dark:border-red-400 p-4 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300">
                  {loadingError}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      

      
      {isReadOnlyMode && (
            <div className="fixed top-16 left-1/2 transform -translate-x-1/2 bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 dark:border-blue-400 p-4 rounded-lg shadow-md z-50">
          <div className="flex">
            <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400 dark:text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                {((userProjectRole && userProjectRole !== 'member') || isProjectOwner) ? (
                  <span className="font-bold">읽기 전용입니다</span>
                ) : (
                  <>
                    <span className="font-bold">읽기 전용입니다.</span> 수정하시려면 관리자에게 권한을 요청하세요.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 문서 편집 영역 */}
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-[#2a2a2c] p-6">
          {/* 문서 제목 */}
          <div className="mb-6 flex items-center">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full text-3xl font-bold text-gray-900 dark:text-gray-100 border-none outline-none focus:ring-0 p-0 placeholder-gray-400 dark:placeholder-gray-500 bg-transparent ${isReadOnlyMode ? 'cursor-not-allowed' : ''}`}
              placeholder="제목 없음"
              disabled={isLoading || isReadOnlyMode}
            />
          </div>
          
          {/* 에디터 로딩 표시 */}
          {isLoading && !editor && (
            <div className="min-h-[500px] flex items-center justify-center">
              <div className="text-center flex flex-col items-center">
                <div className={`relative w-24 h-24 ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-16 h-16 border-4 border-current border-solid rounded-full opacity-20 ${theme === 'dark' ? 'border-blue-500' : 'border-blue-600'}`}></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-16 h-16 border-4 border-current border-solid rounded-full border-t-transparent animate-spin`}></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-3xl font-bold ${theme === 'dark' ? 'text-blue-500' : 'text-blue-600'}`}>C</span>
                  </div>
                </div>
                <p className={`mt-6 text-lg font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>에디터 로딩 중...</p>
              </div>
            </div>
          )}
          
          {/* 공통 CSS 스타일 */}
          <style jsx global>{`
            .ProseMirror {
              position: relative; /* 필수: 모든 absolute 포지션의 기준점 */
              outline: none;
              min-height: 100px;
              padding: 0.5rem 0;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              font-size: 1rem;
              line-height: 1.6;
              color: #374151;
            }
            
            .dark .ProseMirror {
              color: #d1d5db;
            }
            
            /* 협업 커서 스타일 수정 */
            .collaboration-cursor {
              position: absolute !important;
              border-left: 2px solid;
              pointer-events: none;
              height: 1.5em;
              width: 0 !important;
              z-index: 10 !important;
            }
            
            /* 커서 레이블 스타일 수정 */
            .collaboration-cursor-label {
              position: absolute !important;
              top: -1.4em;
              left: -3px;
              z-index: 11 !important;
              white-space: nowrap;
              pointer-events: none;
            }
            
            /* 텍스트 줄 높이 일관성 유지 */
            .ProseMirror p {
              min-height: 1.5em;
              line-height: 1.5;
              position: relative;
              margin: 0.5em 0;
            }
            
            .ProseMirror p.is-editor-empty:first-child::before {
              content: attr(data-placeholder);
              float: left;
              color: #9ca3af;
              pointer-events: none;
              height: 0;
              font-style: italic;
            }
            
            .dark .ProseMirror p.is-editor-empty:first-child::before {
              color: #6b7280;
            }
            
            /* 빈 줄과 협업 커서 사이의 간격 조정 */
            .ProseMirror p:empty {
              margin-top: 0;
              margin-bottom: 0;
              padding: 0;
              min-height: 0;
              height: 1.5em;
              line-height: 1.5em;
            }
            
            /* 협업 커서가 포함된 요소의 공백 처리 */
            .ProseMirror p:has(.collaboration-cursor) {
              margin-bottom: 0.5em;
              margin-top: 0;
            }
            
            /* 문단 간격 일관성 유지 */
            .ProseMirror * + p {
              margin-top: 0;
            }
            
            .ProseMirror h1 {
              font-size: 1.875rem;
              font-weight: 700;
              margin: 1.5em 0 0.5em;
              padding-bottom: 0.3em;
              color: #111827;
            }
            
            .dark .ProseMirror h1 {
              color: #f9fafb;
            }
            
            .ProseMirror h2 {
              font-size: 1.5rem;
              font-weight: 600;
              margin: 1.2em 0 0.5em;
              padding-bottom: 0.2em;
              color: #111827;
            }
            
            .dark .ProseMirror h2 {
              color: #f3f4f6;
            }
            
            .ProseMirror h3 {
              font-size: 1.25rem;
              font-weight: 600;
              margin: 1em 0 0.5em;
              color: #111827;
            }
            
            .dark .ProseMirror h3 {
              color: #e5e7eb;
            }
            
            .ProseMirror ul, .ProseMirror ol {
              padding-left: 1.5em;
              margin-bottom: 0.75em;
            }
            
            .ProseMirror li p {
              margin: 0.3em 0;
            }
            
            .ProseMirror blockquote {
              border-left: 3px solid #e5e7eb;
              padding-left: 1em;
              font-style: italic;
              color: #4b5563;
              margin: 1em 0;
              background-color: #f9fafb;
              padding: 0.5em 1em;
              border-radius: 0 0.25em 0.25em 0;
            }
            
            .dark .ProseMirror blockquote {
              border-left-color: #4b5563;
              color: #9ca3af;
              background-color: #374151;
            }
            
            .ProseMirror pre {
              background-color: #f3f4f6;
              padding: 1em;
              border-radius: 0.375em;
              overflow-x: auto;
              margin: 1em 0;
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
              font-size: 0.875em;
            }
            
            .dark .ProseMirror pre {
              background-color: #374151;
              color: #d1d5db;
            }
            
            .ProseMirror code {
              font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
              font-size: 0.875em;
              background-color: #f3f4f6;
              padding: 0.2em 0.4em;
              border-radius: 0.25em;
            }
            
            .dark .ProseMirror code {
              background-color: #374151;
              color: #d1d5db;
            }
            
            .ProseMirror hr {
              border: none;
              border-top: 1px solid #e5e7eb;
              margin: 2em 0;
            }
            
            .ProseMirror img {
              max-width: 100%;
              height: auto;
              border-radius: 0.375em;
              margin: 1em 0;
            }
            
            .ProseMirror a {
              color: #2563eb;
              text-decoration: underline;
              text-decoration-thickness: 1px;
              text-underline-offset: 0.2em;
            }
            
            /* 할 일 목록 스타일 */
            .ProseMirror ul[data-type="taskList"] {
              list-style: none;
              padding: 0;
            }
            
            .ProseMirror ul[data-type="taskList"] li {
              display: flex;
              align-items: flex-start;
              margin-bottom: 0.5em;
            }
            
            .ProseMirror ul[data-type="taskList"] li > label {
              margin-right: 0.5em;
              user-select: none;
            }
            
            .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
              cursor: pointer;
              width: 1em;
              height: 1em;
              margin-right: 0.5em;
              border-radius: 0.25em;
              border: 1px solid #d1d5db;
            }
            
            .ProseMirror ul[data-type="taskList"] li > div {
              flex: 1;
            }
            
            .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
              text-decoration: line-through;
              color: #9ca3af;
            }
            
            /* 선택된 텍스트 스타일 */
            .ProseMirror .selection {
              background-color: rgba(35, 131, 226, 0.14);
            }
            
            .ProseMirror:focus {
              outline: none;
            }
            
            /* ProseMirror 관련 문제 해결 */
            .ProseMirror-separator {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              width: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            
            .ProseMirror-trailingBreak {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              width: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            
            /* 협업 커서 관련 스타일 추가 수정 */
            .collaboration-cursor {
              position: absolute !important;
              pointer-events: none !important;
              z-index: 1000 !important;
              height: 1.2em !important;
              margin: 0 !important;
              padding: 0 !important;
              border-left: 2px solid;
              width: 0 !important;
              contain: layout style paint !important;
            }
            
            .collaboration-cursor-label {
              position: absolute !important;
              top: -1.4em !important;
              left: -3px !important;
              border-radius: 3px !important;
              padding: 0 0.2em !important;
              pointer-events: none !important;
              white-space: nowrap !important;
              font-size: 10px !important;
              z-index: 1001 !important;
            }
          `}</style>
          
          {/* 선택 텍스트에 대한 버블 메뉴 */}
          {editor && (
            <BubbleMenu 
              editor={editor} 
              shouldShow={({ editor, view, state, oldState, from, to }) => {
                // 텍스트가 선택되었을 때만 표시
                return from !== to;
              }}
              tippyOptions={{
                duration: 100,
                placement: 'top',
              }}
            >
              <div className="flex items-center bg-white rounded-md shadow-lg border border-gray-200 p-1">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  title="굵게"
                >
                  <span className="font-bold">B</span>
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  title="기울임"
                >
                  <span className="italic">I</span>
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleHighlight().run()}
                  className={`p-1.5 rounded ${editor.isActive('highlight') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                  title="강조"
                >
                  <span className="bg-yellow-200 px-1">A</span>
                </button>
              </div>
            </BubbleMenu>
          )}
          
          {/* 슬래시 커맨드 메뉴 */}
          {showSlashMenu && (
            <div
              ref={slashMenuRef}
              className="absolute bg-white dark:bg-[#2a2a2c] shadow-xl rounded-xl p-1 z-50 border border-gray-200 dark:border-gray-700 max-h-[420px] overflow-auto w-[280px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-200"
              style={{
                top: slashMenuPosition.y + 15, // 커서 위치보다 더 아래로 위치하도록 15px 추가
                left: slashMenuPosition.x
              }}
            >
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200 p-3 border-b border-slate-100 dark:border-slate-700 sticky top-0 bg-white dark:bg-[#2a2a2c] backdrop-blur-sm">
                <span className="flex items-center gap-1.5">
                  <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-md p-0.5">
                    <span className="text-xs">/</span>
                  </span>
                  블록 선택
                </span>
              </div>
              <div className="grid grid-cols-1 gap-0.5 p-1">
                <button
                  onClick={() => applyBlockType('ai')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 group-hover:bg-purple-200 dark:group-hover:bg-purple-800 transition-colors">
                    <SparklesIcon className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium">문서 요약</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">AI로 문서를 요약합니다</span>
                  </div>
                </button>
                <button
                  onClick={() => applyBlockType('paragraph')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                    <AlignLeft className="w-4 h-4" />
                  </span>
                  <span className="font-medium">본문</span>
                </button>
                <button
                  onClick={() => applyBlockType('heading1')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                    <TypeIcon className="w-4 h-4" />
                  </span>
                  <span className="font-medium">제목 1</span>
                </button>
                <button
                  onClick={() => applyBlockType('heading2')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                    <TypeIcon className="w-4 h-4" />
                  </span>
                  <span className="font-medium">제목 2</span>
                </button>
                <button
                  onClick={() => applyBlockType('heading3')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                    <TypeIcon className="w-4 h-4" />
                  </span>
                  <span className="font-medium">제목 3</span>
                </button>
                <button
                  onClick={() => applyBlockType('bulletList')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                    <ListIcon className="w-4 h-4" />
                  </span>
                  <span className="font-medium">글머리 기호</span>
                </button>
                <button
                  onClick={() => applyBlockType('orderedList')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                    <ListIcon className="w-4 h-4" />
                  </span>
                  <span className="font-medium">번호 매기기</span>
                </button>
                <button
                  onClick={() => applyBlockType('taskList')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-800 transition-colors">
                    <CheckSquareIcon className="w-4 h-4" />
                  </span>
                  <span className="font-medium">할 일 목록</span>
                </button>
                <button
                  onClick={() => applyBlockType('blockquote')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 group-hover:bg-orange-200 dark:group-hover:bg-orange-800 transition-colors">
                    <QuoteIcon className="w-4 h-4" />
                  </span>
                  <span className="font-medium">인용</span>
                </button>
                <button
                  onClick={() => applyBlockType('codeBlock')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800 transition-colors">
                    <CodeIcon className="w-4 h-4" />
                  </span>
                  <span className="font-medium">코드</span>
                </button>
                <button
                  onClick={() => applyBlockType('image')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 group-hover:bg-rose-200 dark:group-hover:bg-rose-800 transition-colors">
                    <ImageIcon className="w-4 h-4" />
                  </span>
                  <span className="font-medium">이미지</span>
                </button>
                <button
                  onClick={() => applyBlockType('template')}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-left text-slate-800 dark:text-slate-200 group transition-colors"
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900 text-teal-600 dark:text-teal-400 group-hover:bg-teal-200 dark:group-hover:bg-teal-800 transition-colors">
                    <FileTextIcon className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="font-medium">문서 템플릿</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">템플릿으로 문서 생성</span>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {/* 템플릿 모달 */}
          <TemplateModal 
            isOpen={showTemplateMenu} 
            onClose={() => setShowTemplateMenu(false)} 
            templates={templates}
            onSelect={createDocumentTemplate}
            isLoading={isCreatingTemplate}
            selectedTemplate={selectedTemplate}
          />
          
          {/* Tiptap 에디터 */}
          <div className="prose max-w-none bg-white dark:bg-[#2a2a2c] rounded-lg">
            <EditorContent 
              editor={editor} 
              className="min-h-[500px] px-2"
              placeholder="여기에 내용을 입력하세요..."
            />
          </div>
          
          {/* 요약 모달 */}
          <SummaryModal 
            isOpen={showSummaryModal} 
            onClose={() => setShowSummaryModal(false)} 
            summary={documentSummary}
            isLoading={isSummarizing}
          />
        </div>
      </div>
      
      {/* 문서 암호 설정 모달 */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        currentPassword={documentPassword}
        isPasswordProtected={isPasswordProtected}
        onSave={updateDocumentPassword}
        isLoading={isPasswordSaving}
      />
      
      {/* 폴더 생성 모달 */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4">
            <div className="rounded-xl shadow-xl bg-card p-6">
              {/* 헤더 */}
              <div className="mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-4">
                    <FolderIcon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">새 폴더 만들기</h3>
                  </div>
                </div>
              </div>
              
              {/* 본문 */}
              <div className="mb-6">
                <label htmlFor="folderName" className="block text-sm font-medium text-foreground mb-2">
                  폴더 이름
                </label>
                <input
                  type="text"
                  id="folderName"
                  value={folderModalName}
                  onChange={(e) => setFolderModalName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                  placeholder="폴더 이름을 입력하세요"
                  disabled={isFolderCreating}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isFolderCreating) {
                      createFolderFromSidebar();
                    }
                  }}
                />
              </div>
              
              {/* 버튼 */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowFolderModal(false);
                    setFolderModalName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                  disabled={isFolderCreating}
                >
                  취소
                </button>
                <button
                  onClick={createFolderFromSidebar}
                  disabled={isFolderCreating || !folderModalName.trim()}
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isFolderCreating ? (
                    <>
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      생성 중...
                    </>
                  ) : (
                    '폴더 만들기'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

// DocumentPageContent 컴포넌트를 Suspense로 감싸는 기본 export
export default function DocumentPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center flex flex-col items-center">
          <div className="relative w-24 h-24 text-blue-500">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-current border-solid rounded-full opacity-20 border-blue-500"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-current border-solid rounded-full animate-spin border-t-transparent"></div>
            </div>
          </div>
          <p className="text-lg font-medium mt-4">문서 에디터 로딩 중...</p>
          <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
        </div>
      </div>
    }>
      <DocumentPageContent params={params} />
    </Suspense>
  );
}