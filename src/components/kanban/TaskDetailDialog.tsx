"use client";

import { Task } from "./KanbanBoard";
import { TaskStatus } from "./KanbanBoard";
import { X, CalendarIcon, UserIcon, Smile, Bold, Italic, List, ListOrdered, Link2, Image, Code, CheckSquare, Clock, Tag, MoreHorizontal, MessageSquare, ChevronDown, ChevronUp, Copy, Trash2, Share2, AlertCircle, Users, UserCheck, ArrowUp, ArrowDown, Minus, User, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import EmojiPicker from 'emoji-picker-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import LinkExtension from '@tiptap/extension-link';
import ImageExtension from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useProject, ProjectMember } from "@/app/contexts/ProjectContext";
import { useUsers } from "@/app/contexts/UserContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal'

interface Comment {
  id: string;
  content: string;
  userId: string;
  taskId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface Epic {
  id: string;
  title: string;
  description?: string;
  color?: string;
  projectId?: string | null;
}

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  theme?: "light" | "dark";
  clickedElement?: HTMLElement;
}

// TipTap 에디터의 HTML 콘텐츠 처리를 위한 함수
const processTiptapContent = (content: string): string => {
  if (!content) return '';
  
  // 빈 콘텐츠인 경우 ('<p></p>')
  if (content === '<p></p>') {
    return '';
  }
  
  return content;
};

const RichTextEditor = ({ content, onChange, theme = "light" }: { 
  content: string | { 
    type: string; 
    content: { 
      type: string; 
      content?: { type: string; text?: string }[] 
    }[] 
  }, 
  onChange: (html: string) => void, 
  theme?: "light" | "dark" 
}) => {
  // JSON 형식의 content 처리
  const processedContent = typeof content === 'object' && content.type === 'doc'
    ? content.content.map(para => 
        para.content ? para.content.map(c => c.text || '').join('') : ''
      ).join('')
    : typeof content === 'string' 
      ? content 
      : '';
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TextStyle,
      Color,
      ListItem,
      BulletList,
      OrderedList,
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list-stable',
        },
      }),
      TaskItem.configure({
        HTMLAttributes: {
          class: 'task-item-stable',
        },
        nested: true,
      }),
      LinkExtension.configure({
        openOnClick: false,
      }),
      ImageExtension,
      Placeholder.configure({
        placeholder: '설명을 입력하세요...',
      }),
    ],
    content: processedContent,
    onUpdate: ({ editor }) => {
      // HTML 변환 처리
      const html = processTiptapContent(editor.getHTML());
      onChange(html);
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return null;
  }

  const editorStyles = getEditorStyles(theme);
  const scrollbarStyles = getScrollbarStyles(theme);

  return (
    <div className="rich-text-editor border rounded-md overflow-hidden flex flex-col">
      <style>{editorStyles}</style>
      <style>{scrollbarStyles}</style>
      
      <div className={`border-b p-2 flex flex-wrap gap-1 h-[48px] items-center flex-shrink-0 ${
        theme === 'dark' ? 'bg-[#353538] border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center ${
            editor.isActive('bold') 
              ? (theme === 'dark' 
                  ? 'bg-blue-900 text-blue-300 border border-blue-800' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200')
              : (theme === 'dark' 
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100 border border-transparent' 
                  : 'text-gray-500 hover:bg-gray-200 border border-transparent')
          }`}
          type="button"
          title="굵게"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center ${
            editor.isActive('italic') 
              ? (theme === 'dark' 
                  ? 'bg-blue-900 text-blue-300 border border-blue-800' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200')
              : (theme === 'dark' 
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100 border border-transparent' 
                  : 'text-gray-500 hover:bg-gray-200 border border-transparent')
          }`}
          type="button"
          title="기울임"
        >
          <Italic size={16} />
        </button>
        <span className="w-px h-6 bg-gray-300 mx-1"></span>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center ${
            editor.isActive('bulletList') 
              ? (theme === 'dark' 
                  ? 'bg-blue-900 text-blue-300 border border-blue-800' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200')
              : (theme === 'dark' 
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100 border border-transparent' 
                  : 'text-gray-500 hover:bg-gray-200 border border-transparent')
          }`}
          type="button"
          title="글머리 기호"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center ${
            editor.isActive('orderedList') 
              ? (theme === 'dark' 
                  ? 'bg-blue-900 text-blue-300 border border-blue-800' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200')
              : (theme === 'dark' 
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100 border border-transparent' 
                  : 'text-gray-500 hover:bg-gray-200 border border-transparent')
          }`}
          type="button"
          title="번호 목록"
        >
          <ListOrdered size={16} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 현재 에디터의 위치 저장
            const editorElement = document.querySelector('.ProseMirror');
            const editorRect = editorElement?.getBoundingClientRect();
            const viewportOffset = editorRect?.top || 0;
            
            editor.chain().focus().toggleTaskList().run();
            
            // 에디터 위치 복원
            requestAnimationFrame(() => {
              const newEditorElement = document.querySelector('.ProseMirror');
              const newEditorRect = newEditorElement?.getBoundingClientRect();
              const newViewportOffset = newEditorRect?.top || 0;
              
              if (viewportOffset !== newViewportOffset) {
                window.scrollBy(0, newViewportOffset - viewportOffset);
              }
            });
          }}
          className={`p-1 rounded hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center ${
            editor.isActive('taskList') 
              ? (theme === 'dark' 
                  ? 'bg-blue-900 text-blue-300 border border-blue-800' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200')
              : (theme === 'dark' 
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100 border border-transparent' 
                  : 'text-gray-500 hover:bg-gray-200 border border-transparent')
          }`}
          type="button"
          title="작업 항목"
        >
          <CheckSquare size={16} />
        </button>
        <span className="w-px h-6 bg-gray-300 mx-1"></span>
        <button
          onClick={() => {
            const url = window.prompt('URL 입력:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={`p-1 rounded hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center ${
            editor.isActive('link') 
              ? (theme === 'dark' 
                  ? 'bg-blue-900 text-blue-300 border border-blue-800' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200')
              : (theme === 'dark' 
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100 border border-transparent' 
                  : 'text-gray-500 hover:bg-gray-200 border border-transparent')
          }`}
          type="button"
          title="링크"
        >
          <Link2 size={16} />
        </button>
        <button
          onClick={() => {
            const url = window.prompt('이미지 URL 입력:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          className={`p-1 rounded hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center ${
            theme === 'dark' 
              ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100 border border-transparent hover:border-blue-800' 
              : 'text-gray-500 hover:bg-gray-200 border border-transparent hover:border-blue-200'
          }`}
          type="button"
          title="이미지"
        >
          <Image size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1 rounded hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center ${
            editor.isActive('codeBlock') 
              ? (theme === 'dark' 
                  ? 'bg-blue-900 text-blue-300 border border-blue-800' 
                  : 'bg-blue-100 text-blue-700 border border-blue-200')
              : (theme === 'dark' 
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100 border border-transparent' 
                  : 'text-gray-500 hover:bg-gray-200 border border-transparent')
          }`}
          type="button"
          title="코드"
        >
          <Code size={16} />
        </button>
        <span className="w-px h-6 bg-gray-300 mx-1"></span>
        <div className="relative inline-block">
          <select
            onChange={(e) => {
              editor.chain().focus().setColor(e.target.value).run();
            }}
            className={`border rounded p-1 text-xs ${
              theme === 'dark' 
                ? 'bg-[#2A2A2C] border-gray-700 text-gray-300 hover:bg-gray-800' 
                : 'bg-white hover:bg-gray-50'
            }`}
            title="텍스트 색상"
          >
            <option 
              value="" 
              className={theme === 'dark' ? 'bg-[#2A2A2C] text-gray-300' : ''}
            >
              색상
            </option>
            <option 
              value="#ff5630" 
              style={{ color: theme === 'dark' ? '#ff5630' : '#ff5630' }}
              className={theme === 'dark' ? 'bg-[#2A2A2C] text-red-400' : ''}
            >
              빨강
            </option>
            <option 
              value="#00b8d9" 
              style={{ color: theme === 'dark' ? '#00b8d9' : '#00b8d9' }}
              className={theme === 'dark' ? 'bg-[#2A2A2C] text-blue-400' : ''}
            >
              파랑
            </option>
            <option 
              value="#36b37e" 
              style={{ color: theme === 'dark' ? '#36b37e' : '#36b37e' }}
              className={theme === 'dark' ? 'bg-[#2A2A2C] text-green-400' : ''}
            >
              초록
            </option>
            <option 
              value="#ff991f" 
              style={{ color: theme === 'dark' ? '#ff991f' : '#ff991f' }}
              className={theme === 'dark' ? 'bg-[#2A2A2C] text-orange-400' : ''}
            >
              주황
            </option>
            <option 
              value="#6554c0" 
              style={{ color: theme === 'dark' ? '#6554c0' : '#6554c0' }}
              className={theme === 'dark' ? 'bg-[#2A2A2C] text-purple-400' : ''}
            >
              보라
            </option>
            <option 
              value="#172b4d" 
              style={{ color: theme === 'dark' ? '#ffffff' : '#172b4d' }}
              className={theme === 'dark' ? 'bg-[#2A2A2C] text-white' : ''}
            >
              검정
            </option>
          </select>
        </div>
        <button
          onClick={() => {
            const emoji = window.prompt('이모지 입력:');
            if (emoji) {
              editor.chain().focus().insertContent(emoji).run();
            }
          }}
          className={`p-1 rounded hover:bg-gray-700 min-w-[32px] min-h-[32px] flex items-center justify-center ${
            theme === 'dark' 
              ? 'text-gray-300 hover:bg-gray-700 hover:text-gray-100 border border-transparent hover:border-blue-800' 
              : 'text-gray-500 hover:bg-gray-200 border border-transparent hover:border-blue-200'
          }`}
          type="button"
          title="이모지"
        >
          <Smile size={16} />
        </button>
      </div>
      <div className="flex-1">
        <EditorContent 
          editor={editor} 
          className={`p-3 min-h-[150px] prose max-w-none ${
            theme === 'dark' ? 'bg-[#2A2A2C]' : ''
          }`} 
        />
      </div>
    </div>
  );
};

// 설명의 HTML 태그를 UI에서 제거하는 함수
const removeHtmlTags = (html: string): string => {
  if (!html) return '';
  
  // HTML 파싱용 임시 요소 생성
  if (typeof document !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
  
  // 서버 사이드 렌더링 시: 간단한 정규식으로 태그 제거
  return html.replace(/<[^>]*>|&[^;]+;/g, '');
};

// 스타일 템플릿을 함수 내부로 이동하고 theme 파라미터 추가
const getEditorStyles = (theme: "light" | "dark") => {
  return `
    .ProseMirror {
      -webkit-user-modify: read-write;
      overflow-wrap: break-word;
      word-break: break-word;
      white-space: pre-wrap;
      outline: none;
      padding: 0;
      margin: 0;
      min-height: 150px;
      ${theme === 'dark' ? `
        background-color: #2A2A2C;
        color: #D1D5DB;
      ` : ''}
    }

    .rich-text-editor {
      position: relative;
    }
    
    /* TaskList 관련 레이아웃 고정 */
    .ProseMirror ul[data-type="taskList"],
    .ProseMirror ul[data-type="taskList"] li {
      margin: 0;
      padding: 0;
    }
    
    .ProseMirror li[data-type="taskItem"] {
      display: flex;
      align-items: flex-start;
      min-height: 1.5em;
      margin: 0.25rem 0;
    }

    .ProseMirror p {
      margin: 0;
      line-height: 1.5;
      ${theme === 'dark' ? 'color: #D1D5DB;' : 'color: #1F2937;'}
    }
    .ProseMirror:focus {
      outline: none;
    }
    .ProseMirror strong {
      font-weight: bold;
      ${theme === 'dark' ? 'color: #F3F4F6;' : 'color: #111827;'}
    }
    .ProseMirror em {
      font-style: italic;
      ${theme === 'dark' ? 'color: #E5E7EB;' : 'color: #1F2937;'}
    }
    .ProseMirror ul, .ProseMirror ol {
      padding-left: 20px;
      ${theme === 'dark' ? 'color: #D1D5DB;' : 'color: #1F2937;'}
    }
    .ProseMirror li {
      margin-bottom: 4px;
      ${theme === 'dark' ? 'color: #D1D5DB;' : 'color: #1F2937;'}
    }
    .ProseMirror ul li {
      list-style-type: disc;
    }
    .ProseMirror ol li {
      list-style-type: decimal;
    }
    .ProseMirror a {
      color: ${theme === 'dark' ? '#60A5FA' : '#2563EB'};
      text-decoration: underline;
    }
    .ProseMirror code {
      background-color: ${theme === 'dark' ? '#3F3F46' : '#F3F4F6'};
      color: ${theme === 'dark' ? '#E5E7EB' : '#111827'};
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
    }
    .ProseMirror blockquote {
      border-left: 4px solid ${theme === 'dark' ? '#4B5563' : '#9CA3AF'};
      padding-left: 10px;
      margin-left: 0;
      font-style: italic;
      color: ${theme === 'dark' ? '#9CA3AF' : '#4B5563'};
    }

    /* TaskList 및 TaskItem 안정성 개선 */
    .task-list-stable {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    
    .task-item-stable {
      display: flex;
      align-items: center;
      margin: 0.25rem 0;
      min-height: 1.5em;
    }
    
    .task-item-stable > * {
      margin: 0;
      padding: 0;
    }
    
    .task-item-stable input[type="checkbox"] {
      margin-right: 0.5rem;
      margin-left: 0;
    }
  `;
};

// 스크롤바 스타일 함수 유지
const getScrollbarStyles = (theme: "light" | "dark") => {
  return `
    ${theme === 'dark' ? `
      .dark-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: #4A4A4E #2A2A2C;
      }
      .dark-scrollbar::-webkit-scrollbar {
        width: 10px;
        background-color: #2A2A2C;
      }
      .dark-scrollbar::-webkit-scrollbar-track {
        background: #2A2A2C;
        border-left: 1px solid #353538;
      }
      .dark-scrollbar::-webkit-scrollbar-thumb {
        background: #4A4A4E;
        border-left: 1px solid #353538;
        border-radius: 4px;
      }
      .dark-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #5A5A5E;
      }
    ` : ''}
  `;
};

// Badge component for status, priority, etc.
const StatusBadge = ({ status, theme }: { status: string; theme: "light" | "dark" }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
      case 'in-progress': return theme === 'dark' ? 'bg-blue-700 text-blue-300' : 'bg-blue-100 text-blue-800';
      case 'review': return theme === 'dark' ? 'bg-purple-700 text-purple-300' : 'bg-purple-100 text-purple-800';
      case 'done': return theme === 'dark' ? 'bg-green-700 text-green-300' : 'bg-green-100 text-green-800';
      default: return theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'todo': return '할 일';
      case 'in-progress': return '진행 중';
      case 'review': return '검토';
      case 'done': return '완료';
      default: return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {getStatusText(status)}
    </span>
  );
};

// Priority icon component
const PriorityIcon = ({ priority }: { priority: string }) => {
  switch (priority) {
    case 'high':
      return <ArrowUp className="w-4 h-4 text-red-500" />;
    case 'medium':
      return <ArrowDown className="w-4 h-4 text-yellow-500" />;
    case 'low':
      return <Minus className="w-4 h-4 text-green-500" />;
    default:
      return <Minus className="w-4 h-4 text-gray-500" />;
  }
};

// Type icon component
const TypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'story':
      return <User className="w-4 h-4 text-green-600" />;
    case 'bug':
      return <Bug className="w-4 h-4 text-red-600" />;
    case 'task':
      return <CheckSquare className="w-4 h-4 text-blue-600" />;
    default:
      return <CheckSquare className="w-4 h-4 text-gray-600" />;
  }
};

// Avatar component
const UserAvatar = ({ user, size = "w-8 h-8" }: { user: { name: string; initials?: string }; size?: string }) => {
  const initials = user.initials || user.name.charAt(0).toUpperCase();
  return (
    <div className={`${size} bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm`}>
      {initials}
    </div>
  );
};

export function TaskDetailDialog({ task, isOpen, onClose, onUpdate, onDelete, theme = "light", clickedElement }: TaskDetailDialogProps) {
  const [editedTask, setEditedTask] = useState<Task>({...task});
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [showEpicDropdown, setShowEpicDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [epics, setEpics] = useState<Epic[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [isAddingComment, setIsAddingComment] = useState<boolean>(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentContent, setEditedCommentContent] = useState<string>("");
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);
  const [isDeletingComment, setIsDeletingComment] = useState<boolean>(false);
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCommentDeleteModalOpen, setIsCommentDeleteModalOpen] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [animationOrigin, setAnimationOrigin] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Get project members from context
  const { projects, currentProject } = useProject();
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);

  // Get users from context
  const { users } = useUsers();
  
  // 인증 컨텍스트에서 현재 사용자 정보 가져오기
  const { user: currentUser } = useAuth();
  
  // 현재 사용자가 이미 프로젝트 멤버인지 확인하기 위한 상태
  const [isCurrentUserInMembers, setIsCurrentUserInMembers] = useState(false);
  
  // 변경 사항 추적 플래그
  const [hasChanges, setHasChanges] = useState(false);

  // task가 변경될 때마다 editedTask 업데이트
  useEffect(() => {
    setEditedTask({...task});
    setHasChanges(false);
  }, [task]);

  // 모달이 열릴 때 애니메이션 원점 계산
  useEffect(() => {
    if (isOpen && clickedElement && dialogRef.current) {
      const rect = clickedElement.getBoundingClientRect();
      const modal = dialogRef.current;
      
      // 시작 위치 설정 (클릭한 카드 위치)
      const startX = rect.left + rect.width / 2 - window.innerWidth / 2;
      const startY = rect.top + rect.height / 2 - window.innerHeight / 2;
      
      // 모달을 시작 위치에 작은 크기로 설정
      modal.style.transform = `translate(-50%, -50%) translate(${startX}px, ${startY}px) scale(0.1)`;
      modal.style.opacity = '0';
      modal.style.transition = 'none';
      
      // 다음 프레임에서 애니메이션 시작
      requestAnimationFrame(() => {
        modal.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        modal.style.transform = 'translate(-50%, -50%) scale(1)';
        modal.style.opacity = '1';
      });
      
      setIsAnimating(true);
      
      // 애니메이션 완료 후 상태 리셋
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 400);
      
      return () => clearTimeout(timer);
    } else if (!isOpen && dialogRef.current) {
      // 모달이 닫힐 때
      const modal = dialogRef.current;
      modal.style.transition = 'all 0.3s ease-in';
      modal.style.transform = 'translate(-50%, -50%) scale(0.9)';
      modal.style.opacity = '0';
    }
  }, [isOpen, clickedElement]);
  
  // Find the project and its members
  useEffect(() => {
    if (!task.projectId) {
      setProjectMembers([]);
      setIsCurrentUserInMembers(false);
      return;
    }
    
    const project = projects.find(p => p.id === task.projectId) || currentProject;
    if (project) {
      // Filter for accepted members only
      const acceptedMembers = project.members.filter(
        member => member.inviteStatus === "accepted"
      );
      setProjectMembers(acceptedMembers);
      
      // 현재 사용자가 이미 프로젝트 멤버인지 확인
      if (currentUser) {
        setIsCurrentUserInMembers(
          acceptedMembers.some(member => member.userId === currentUser.id)
        );
      }
    } else {
      setProjectMembers([]);
      setIsCurrentUserInMembers(false);
    }
  }, [task.projectId, projects, currentProject, currentUser]);

  // 작업 상세 내용 변경 처리 함수
  const handleChange = (updatedTask: Task) => {
    setEditedTask(updatedTask);
    
    // 실시간으로 에픽 변경 사항도 서버에 저장하기
    if (updatedTask.epicId !== task.epicId) {
      saveTask(updatedTask);
    }
  };

  // 작업 저장 함수 (서버에 업데이트)
  const saveTask = async (taskToSave: Task) => {
    try {
      console.log('💾 작업 저장 시작:', taskToSave.id);
      
      // 개별 작업 API 엔드포인트 사용
      const response = await fetch(`/api/tasks/${taskToSave.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskToSave),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ 작업 업데이트 실패:', errorData);
        throw new Error(errorData.details || '작업 업데이트에 실패했습니다.');
      }

      const updatedTask = await response.json();
      console.log('✅ 작업 저장 성공:', updatedTask.id);
      
      onUpdate(updatedTask);
    } catch (error) {
      console.error('❌ 작업 업데이트 중 오류 발생:', error);
      // 사용자에게 에러 메시지 표시
      alert(error instanceof Error ? error.message : '작업 업데이트 중 오류가 발생했습니다.');
    }
  };
  
  // 설명 변경 처리를 위한 특별 핸들러
  const handleDescriptionChange = (html: string) => {
    // HTML을 JSON 형식으로 변환
    const descriptionJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: html ? [{ type: 'text', text: html }] : []
        }
      ]
    };

    // 기존 task 객체에 새로운 description 병합
    const updatedTask = {
      ...task,
      description: descriptionJson
    };

    handleChange(updatedTask);
  };
  
  // 설명 표시용 - HTML 태그 제거
  const getCleanDescription = (): string => {
    // JSON 형식의 description 처리
    if (typeof task.description === 'object' && task.description?.type === 'doc') {
      const paragraphs = task.description.content.map(para => 
        para.content ? para.content.map(content => content.text || '').join('') : ''
      );
      return paragraphs.join('\n');
    }
    
    // 기존 문자열 형식의 description 처리
    return typeof task.description === 'string' ? task.description : '';
  };
  
  // 모달을 닫을 때 변경사항이 있으면 저장 (useCallback으로 감싸기)
  const handleClose = async () => {
    // 변경 사항이 있으면 저장
    if (JSON.stringify(task) !== JSON.stringify(editedTask)) {
      await saveTask(editedTask);
    }
    onClose();
  };

  // 댓글 불러오기
  const fetchComments = useCallback(async () => {
    if (!task.id) return;
    
    setIsLoadingComments(true);
    try {
      const response = await fetch(`/api/comments?taskId=${task.id}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      } else {
        console.error('댓글 로딩 실패:', await response.text());
      }
    } catch (error) {
      console.error('댓글 로딩 중 오류 발생:', error);
    } finally {
      setIsLoadingComments(false);
    }
  }, [task.id]);
  
  // 컴포넌트 마운트 시 댓글 로드
  useEffect(() => {
    if (isOpen && task.id) {
      fetchComments();
    }
  }, [isOpen, task.id, fetchComments]);

  const handleAddComment = async () => {
    if (!newComment.trim() || isAddingComment) return;
    
    setIsAddingComment(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment,
          taskId: task.id,
        }),
      });
      
      if (response.ok) {
        const savedComment = await response.json();
        setComments(prev => [...prev, savedComment]);
        setNewComment("");
      } else {
        console.error('댓글 저장 실패:', await response.text());
        alert('댓글을 저장하는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('댓글 저장 중 오류 발생:', error);
      alert('댓글을 저장하는 중 오류가 발생했습니다.');
    } finally {
      setIsAddingComment(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      case 'done': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-600 mr-1" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-600 mr-1" />;
      case 'low': return <Tag className="w-4 h-4 text-green-600 mr-1" />;
      default: return <Tag className="w-4 h-4 text-gray-600 mr-1" />;
    }
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(task.id);
    }
    setIsDeleteModalOpen(false);
    onClose();
  };
  
  // Get assignee name from member ID
  const getAssigneeName = () => {
    if (!editedTask.assignee) return "";
    
    // 먼저 프로젝트 멤버에서 찾기 (즉시 표시)
    const member = projectMembers.find(m => m.userId === editedTask.assignee);
    if (member && member.user) {
      return member.user.name;
    }
    
    // 컨텍스트의 users에서 찾기
    const assigneeUser = users[editedTask.assignee as string];
    if (assigneeUser) {
      return assigneeUser.name;
    }
    
    // 위 두 방법으로 찾지 못했을 경우 ID 반환
    return editedTask.assignee;
  };

  // 백드롭 클릭 처리 
  const handleBackdropClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.modalBackdrop === "true") {
      handleClose();
    }
  };

  // x 버튼 클릭 처리
  const handleXButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClose();
  };

  // Handle date change with proper type conversion
  const handleDateChange = (dateStr: string) => {
    const newDate = dateStr ? new Date(dateStr) : undefined;
    handleChange({...editedTask, dueDate: newDate});
  };

  // ESC 키 누를 때 모달 닫기 및 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (showMembersList || showEpicDropdown || showStatusDropdown || showPriorityDropdown) {
        const target = event.target as HTMLElement;
        // 드롭다운 내부가 아닌 경우 닫기
        if (!target.closest('.dropdown-container')) {
          setShowMembersList(false);
          setShowEpicDropdown(false);
          setShowStatusDropdown(false);
          setShowPriorityDropdown(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('click', handleClickOutside);
    };
      }, [isOpen, editedTask, task, handleClose, showMembersList, showEpicDropdown, showStatusDropdown, showPriorityDropdown]);

  // 댓글 수정 시작 함수
  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditedCommentContent(comment.content);
    setShowCommentMenu(null);
  };

  // 댓글 수정 취소 함수
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditedCommentContent("");
  };

  // 댓글 수정 저장 함수
  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editedCommentContent.trim() || isEditingComment) return;
    
    setIsEditingComment(true);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: editedCommentContent,
        }),
      });
      
      if (response.ok) {
        const updatedComment = await response.json();
        // 댓글 목록 업데이트
        setComments(prev => 
          prev.map(comment => comment.id === commentId ? updatedComment : comment)
        );
        // 수정 모드 종료
        setEditingCommentId(null);
        setEditedCommentContent("");
      } else {
        console.error('댓글 수정 실패:', await response.text());
        alert('댓글을 수정하는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('댓글 수정 중 오류 발생:', error);
      alert('댓글을 수정하는 중 오류가 발생했습니다.');
    } finally {
      setIsEditingComment(false);
    }
  };

  // 댓글 삭제 함수
  const handleDeleteComment = async (commentId: string) => {
    if (isDeletingComment) return;
    
    setIsDeletingComment(true);
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // 댓글 목록에서 삭제
        setComments(prev => prev.filter(comment => comment.id !== commentId));
        setShowCommentMenu(null);
      } else {
        console.error('댓글 삭제 실패:', await response.text());
        alert('댓글을 삭제하는 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('댓글 삭제 중 오류 발생:', error);
      alert('댓글을 삭제하는 중 오류가 발생했습니다.');
    } finally {
      setIsDeletingComment(false);
    }
  };

  // 댓글 삭제 확인 함수
  const confirmDeleteComment = () => {
    if (deletingCommentId) {
      handleDeleteComment(deletingCommentId);
      setIsCommentDeleteModalOpen(false);
      setDeletingCommentId(null);
    }
  };

  // 댓글 삭제 모달 열기 함수
  const openCommentDeleteModal = (commentId: string) => {
    setDeletingCommentId(commentId);
    setIsCommentDeleteModalOpen(true);
  };

  // 현재 사용자가 댓글 작성자인지 확인하는 함수
  const isCommentOwner = (comment: Comment) => {
    return currentUser && comment.userId === currentUser.id;
  };

  // 프로젝트의 에픽 목록 불러오기
  useEffect(() => {
    const fetchEpics = async () => {
      if (!editedTask.projectId) return;
      
      try {
        const url = `/api/epics?projectId=${editedTask.projectId}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setEpics(data);
        } else {
          console.error('에픽 로딩 실패:', await response.text());
        }
      } catch (error) {
        console.error('에픽 로딩 중 오류 발생:', error);
      }
    };

    if (isOpen && editedTask.projectId) {
      fetchEpics();
    }
  }, [isOpen, editedTask.projectId]);

  // 에픽 변경 처리 함수
  const handleEpicChange = (epicId: string | null) => {
    handleChange({...editedTask, epicId});
    setShowEpicDropdown(false);
  };

  // 현재 선택된 에픽 이름 가져오기
  const getSelectedEpicName = () => {
    if (!editedTask.epicId) return "에픽 없음";
    const selectedEpic = epics.find(epic => epic.id === editedTask.epicId);
    return selectedEpic ? selectedEpic.title : "에픽 없음";
  };

  // 에픽 색상 가져오기
  const getEpicColor = (epicId: string | null) => {
    if (!epicId) return "#CCCCCC"; // 기본 회색
    const epic = epics.find(e => e.id === epicId);
    return epic?.color || "#CCCCCC";
  };

  // 스크롤바 스타일 추가 (함수 호출)
  const scrollbarStyles = getScrollbarStyles(theme);

  return (
    <>
      {/* 기존 모달 내용 */}
      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onDelete={confirmDelete}
        title="작업 삭제"
        description="이 작업을 정말 삭제하시겠습니까? 삭제된 작업은 복구할 수 없습니다."
        className="z-[9999]"
      />
      
      {/* 댓글 삭제 모달 추가 */}
      <DeleteConfirmModal 
        isOpen={isCommentDeleteModalOpen}
        onClose={() => {
          setIsCommentDeleteModalOpen(false);
          setDeletingCommentId(null);
        }}
        onDelete={confirmDeleteComment}
        title="댓글 삭제"
        description="이 댓글을 정말 삭제하시겠습니까? 삭제된 댓글은 복구할 수 없습니다."
        className="z-[9999]"
      />
      
      {/* 모달 배경 */}
      <div 
        className={`fixed inset-0 bg-black flex items-center justify-center z-50 transition-all duration-300 ease-out ${
          isOpen ? 'bg-opacity-50 backdrop-blur-sm visible' : 'bg-opacity-0 invisible'
        }`}
        onClick={handleBackdropClick}
        data-modal-backdrop="true"
      >
                        {/* 모달 컨테이너 - JavaScript 애니메이션 */}
        <div 
          ref={dialogRef}
          className={`
                w-full max-w-6xl h-[75vh] rounded-lg shadow-2xl flex flex-col
                ${theme === 'dark' ? 'bg-[#2A2A2C] text-gray-200 border border-gray-700/50' : 'bg-white border border-gray-200/50'} 
              `}
              style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%) scale(0.1)',
                opacity: 0,
                pointerEvents: isOpen ? 'auto' : 'none'
              }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 모달 헤더 - 고정 */}
          <div className={`border-b p-4 flex-shrink-0 ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <TypeIcon type="task" />
                <Input
                  value={editedTask.title}
                  onChange={(e) => handleChange({...editedTask, title: e.target.value})}
                  className={`text-xl font-semibold border-0 p-2 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent shadow-none outline-none focus:outline-none focus:border-transparent focus:shadow-none rounded-md transition-all duration-200 ease-out hover:bg-opacity-50 ${
                    theme === 'dark' 
                      ? 'text-gray-200 hover:bg-gray-700 hover:text-blue-300' 
                      : 'text-gray-900 hover:bg-gray-100 hover:text-blue-600'
                  }`}
                  placeholder="제목을 입력하세요"
                  style={{ 
                    border: 'none',
                    boxShadow: 'none',
                    outline: 'none'
                  }}
                  title="클릭하여 제목 편집"
                />
              </div>
            <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={`${theme === 'dark' ? 'bg-[#353538] text-gray-300 border-gray-700 hover:bg-gray-700' : ''} transition-all duration-200 ease-out hover:scale-105 active:scale-95 hover:shadow-lg`}
                >
                  편집
                </Button>
                <div className="relative">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : ''} transition-all duration-200 ease-out hover:scale-110 active:scale-95 hover:shadow-lg`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
              </div>
                <Button
                  variant="ghost"
                  size="sm"
                onClick={handleXButtonClick}
                  className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : ''}`}
              >
                  <X className="w-4 h-4" />
                </Button>
            </div>
          </div>
                  </div>

          {/* 메인 콘텐츠 - 3열 그리드, 스크롤 가능 */}
          <div className="grid grid-cols-3 gap-6 p-6 flex-1 overflow-hidden">
            {/* 메인 콘텐츠 영역 (2/3) - 스크롤 가능 */}
            <div className="col-span-2 space-y-6 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              {/* 설명 */}
              <div>
                <h3 className="font-semibold mb-2">설명</h3>
                {/* <div className={`rounded-lg p-4 transition-all duration-200 ease-out hover:shadow-md border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}> */}
                  <RichTextEditor 
                    content={editedTask.description || ''} 
                    onChange={handleDescriptionChange} 
                    theme={theme}
                  />
                    {/* </div> */}
                </div>

                {/* 활동 섹션 */}
              <div>
                <h3 className="font-semibold mb-4">활동</h3>
                <div className="space-y-4">
                  {/* 기존 댓글들 */}
                        {isLoadingComments ? (
                          <div className="flex justify-center py-4">
                            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'dark' ? 'border-blue-400' : 'border-blue-500'}`}></div>
                          </div>
                        ) : comments.length > 0 ? (
                          comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <UserAvatar user={{ name: comment.user?.name || '사용자' }} />
                        <div className="flex-1">
                              {editingCommentId === comment.id ? (
                            <div>
                                  <Textarea
                                    value={editedCommentContent}
                                    onChange={(e) => setEditedCommentContent(e.target.value)}
                                    className={`w-full border focus-visible:ring-1 focus-visible:ring-blue-500 resize-none min-h-[80px] p-2 rounded-md mb-2 ${
                                      theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700 text-gray-200' : 'bg-white text-gray-800'
                                    }`}
                                rows={3}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={handleCancelEdit}
                                      className={theme === 'dark' ? 'bg-[#353538] text-gray-300 border-gray-700 hover:bg-gray-700' : ''}
                                    >
                                      취소
                                    </Button>
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleSaveCommentEdit(comment.id)}
                                      disabled={isEditingComment}
                    className={`${theme === 'dark' ? 'bg-blue-700 hover:bg-blue-600 text-white' : ''} transition-all duration-200 ease-out hover:scale-105 active:scale-95 hover:shadow-lg`}
                                    >
                                      {isEditingComment ? '저장 중...' : '저장'}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                            <div className={`rounded-lg p-3 transition-all duration-200 ease-out hover:shadow-md hover:scale-[1.01] border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{comment.user?.name || '사용자'}</span>
                                  <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                                    {format(comment.createdAt, 'PPP p', { locale: ko })}
                                  </span>
                                </div>
                                {isCommentOwner(comment) && (
                                  <div className="relative">
                                    <Button 
                                      variant="ghost"
                                      size="sm"
                                      className={`h-6 w-6 p-0 ${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                                      onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)}
                                    >
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                    {showCommentMenu === comment.id && (
                                      <div className={`absolute right-0 mt-1 ${theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700' : 'bg-white border-gray-200'} border rounded-md shadow-lg z-10 w-32`}>
                                        <button 
                                          className={`w-full text-left px-3 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
                                          onClick={() => handleEditComment(comment)}
                                        >
                                          수정
                                        </button>
                                        <button 
                                          className={`w-full text-left px-3 py-2 text-sm ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'}`}
                                          onClick={() => openCommentDeleteModal(comment.id)}
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                              )}
                        </div>
                            </div>
                          ))
                        ) : (
                          <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} text-sm`}>아직 댓글이 없습니다.</p>
                        )}

                  {/* 댓글 작성 */}
                  <div className="flex gap-3">
                    <UserAvatar user={{ name: currentUser?.name || 'User' }} />
                          <div className="flex-1">
                            <div className="relative">
                            <Textarea
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="댓글을 입력하세요..."
                          className={`w-full border focus-visible:ring-1 focus-visible:ring-blue-500 resize-none ${
                                theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700 text-gray-200' : 'bg-white'
                              }`}
                          rows={3}
                            />
                              {/* 이모티콘 버튼 */}
                                <button
                                  type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`absolute bottom-2 left-2 p-1 rounded hover:bg-gray-200 ${
                                  theme === 'dark' ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                                }`}
                                title="이모지 추가"
                                >
                                <Smile size={16} />
                                </button>
                              
                              {/* 이모티콘 피커 */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-12 left-0 z-50">
                                <EmojiPicker
                                  onEmojiClick={(emojiData) => {
                                    setNewComment(prev => prev + emojiData.emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        <div className="flex justify-between items-center mt-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700'}`}
                              >
                                <Smile size={16} className="mr-1" />
                                이모지
                              </Button>
                              <Button 
                                onClick={handleAddComment} 
                                size="sm"
                          className={`${theme === 'dark' ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-all duration-200 ease-out hover:scale-105 active:scale-95 hover:shadow-lg`}
                                disabled={isAddingComment}
                              >
                                {isAddingComment ? '저장 중...' : '댓글 작성'}
                              </Button>
                        </div>
                      </div>
                      </div>
                </div>
              </div>
            </div>

            {/* 사이드바 (1/3) - 스크롤 가능 */}
            <div className="space-y-4 overflow-y-auto pl-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800" style={{ maxHeight: 'calc(85vh - 120px)' }}>
              {/* 상태 */}
                          <div>
                <label className="text-sm font-medium block mb-1">상태</label>
                <div className="relative dropdown-container">
                  <div
                    onClick={() => {
                      setShowStatusDropdown(!showStatusDropdown);
                      setShowMembersList(false);
                      setShowEpicDropdown(false);
                      setShowPriorityDropdown(false);
                    }}
                    className="flex items-center gap-2 cursor-pointer transition-all duration-200 ease-out hover:scale-105 hover:shadow-md active:scale-95 p-1 rounded-md"
                  >
                    <div className={`w-3 h-3 rounded-full ${
                      editedTask.status === 'todo' ? 'bg-gray-400' :
                      editedTask.status === 'in-progress' ? 'bg-blue-500' :
                      editedTask.status === 'review' ? 'bg-purple-500' :
                      editedTask.status === 'done' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    <span className="text-sm">
                      {editedTask.status === 'todo' ? '할 일' :
                       editedTask.status === 'in-progress' ? '진행 중' :
                       editedTask.status === 'review' ? '검토' :
                       editedTask.status === 'done' ? '완료' : '할 일'}
                    </span>
                </div>

                  {showStatusDropdown && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-md shadow-lg z-50 min-w-[120px] transform transition-all duration-200 ease-out ${
                      showStatusDropdown ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
                    } ${theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div 
                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                          editedTask.status === 'todo'
                            ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                            : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                        onClick={() => {
                          handleChange({...editedTask, status: 'todo'});
                          setShowStatusDropdown(false);
                        }}
                      >
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span>할 일</span>
                      </div>
                        <div 
                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                          editedTask.status === 'in-progress'
                              ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                              : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                          }`}
                        onClick={() => {
                          handleChange({...editedTask, status: 'in-progress'});
                          setShowStatusDropdown(false);
                        }}
                        >
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>진행 중</span>
                        </div>
                          <div 
                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                          editedTask.status === 'review'
                                ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                                : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                            }`}
                        onClick={() => {
                          handleChange({...editedTask, status: 'review'});
                          setShowStatusDropdown(false);
                        }}
                          >
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span>검토</span>
                      </div>
                      <div 
                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                          editedTask.status === 'done'
                            ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                            : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                        onClick={() => {
                          handleChange({...editedTask, status: 'done'});
                          setShowStatusDropdown(false);
                        }}
                      >
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span>완료</span>
                          </div>
                      </div>
                    )}
                  </div>
                </div>

              {/* 담당자 */}
              <div>
                <label className="text-sm font-medium block mb-1">담당자</label>
                <div className="relative dropdown-container">
                    <div 
                    className="flex items-center gap-2 cursor-pointer transition-all duration-200 ease-out hover:scale-105 hover:shadow-md active:scale-95 p-1 rounded-md"
                    onClick={() => {
                      setShowMembersList(!showMembersList);
                      setShowEpicDropdown(false);
                      setShowStatusDropdown(false);
                    }}
                  >
                        {editedTask.assignee ? (
                          <>
                        <UserAvatar user={{ name: getAssigneeName() }} size="w-6 h-6" />
                            <span className="text-sm">{getAssigneeName()}</span>
                          </>
                        ) : (
                          <>
                        <UserCheck className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} />
                        <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} text-sm`}>담당자 없음</span>
                          </>
                        )}
                    </div>
                    
                    {/* 멤버 선택 드롭다운 */}
                    {showMembersList && (
                     <div className={`absolute top-full left-0 w-full mt-1 border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto transform transition-all duration-200 ease-out ${
                       showMembersList ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
                     } ${theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700' : 'bg-white border-gray-200'}`}>
                        {/* Unassigned option */}
                        <div 
                        className={`px-3 py-2 cursor-pointer flex items-center ${
                          !editedTask.assignee 
                            ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                            : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                          onClick={() => {
                            handleChange({...editedTask, assignee: undefined});
                            setShowMembersList(false);
                          }}
                        >
                        <UserIcon className={`h-4 w-4 mr-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                          <span className="text-sm">담당자 없음</span>
                        </div>
                        
                        {/* 현재 로그인한 사용자(본인)를 목록에 추가 */}
                        {currentUser && !isCurrentUserInMembers && (
                          <div 
                          className={`px-3 py-2 cursor-pointer flex items-center ${
                            editedTask.assignee === currentUser.id 
                              ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                              : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                          }`}
                            onClick={() => {
                              handleChange({...editedTask, assignee: currentUser.id});
                              setShowMembersList(false);
                            }}
                          >
                          <UserAvatar user={{ name: currentUser.name }} size="w-5 h-5" />
                          <span className="text-sm ml-2">{currentUser.name} (나)</span>
                          </div>
                        )}
                        
                        {projectMembers.length > 0 ? (
                          projectMembers.map((member) => (
                            <div 
                              key={member.userId}
                            className={`px-3 py-2 cursor-pointer flex items-center ${
                              editedTask.assignee === member.userId 
                                ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                                : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                            }`}
                              onClick={() => {
                                handleChange({...editedTask, assignee: member.userId});
                                setShowMembersList(false);
                              }}
                            >
                            <UserAvatar user={{ name: member.user.name }} size="w-5 h-5" />
                            <span className="text-sm ml-2">{member.user.name} {currentUser && member.userId === currentUser.id ? '(나)' : ''}</span>
                              {member.role === "owner" && (
                              <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                                theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                              }`}>소유자</span>
                              )}
                            </div>
                          ))
                        ) : (
                        <div className={`px-3 py-2 text-sm flex items-center ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                          <Users className={`h-4 w-4 mr-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                            {task.projectId ? "초대된 멤버가 없습니다" : "프로젝트 작업이 아닙니다"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              {/* 우선순위 */}
              <div>
                <label className="text-sm font-medium block mb-1">우선순위</label>
                <div className="relative dropdown-container">
                  <div 
                    className="flex items-center gap-2 cursor-pointer transition-all duration-200 ease-out hover:scale-105 hover:shadow-md active:scale-95 p-1 rounded-md"
                    onClick={() => {
                      setShowPriorityDropdown(!showPriorityDropdown);
                      setShowMembersList(false);
                      setShowEpicDropdown(false);
                      setShowStatusDropdown(false);
                    }}
                  >
                    <PriorityIcon priority={editedTask.priority} />
                    <span className="text-sm capitalize">
                      {editedTask.priority === 'high' ? '높음' : 
                       editedTask.priority === 'medium' ? '중간' : '낮음'}
                    </span>
                  </div>
                  
                  {showPriorityDropdown && (
                    <div className={`absolute top-full left-0 mt-1 border rounded-md shadow-lg z-50 min-w-[100px] transform transition-all duration-200 ease-out ${
                      showPriorityDropdown ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
                    } ${theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div 
                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                          editedTask.priority === 'high'
                            ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                            : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                        onClick={() => {
                          handleChange({...editedTask, priority: 'high'});
                          setShowPriorityDropdown(false);
                        }}
                      >
                        <PriorityIcon priority="high" />
                        <span>높음</span>
                    </div>
                      <div 
                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                          editedTask.priority === 'medium'
                            ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                            : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                        onClick={() => {
                          handleChange({...editedTask, priority: 'medium'});
                          setShowPriorityDropdown(false);
                        }}
                      >
                        <PriorityIcon priority="medium" />
                        <span>중간</span>
                    </div>
                      <div 
                        className={`px-3 py-2 cursor-pointer flex items-center gap-2 ${
                          editedTask.priority === 'low'
                            ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                            : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                        onClick={() => {
                          handleChange({...editedTask, priority: 'low'});
                          setShowPriorityDropdown(false);
                        }}
                      >
                        <PriorityIcon priority="low" />
                        <span>낮음</span>
                      </div>
                    </div>
                  )}
                  </div>
                </div>

              {/* 에픽 */}
              <div>
                <label className="text-sm font-medium block mb-1">에픽</label>
                <div className="relative dropdown-container">
                  <div
                    onClick={() => {
                      setShowEpicDropdown(!showEpicDropdown);
                      setShowMembersList(false);
                      setShowStatusDropdown(false);
                      setShowPriorityDropdown(false);
                    }}
                    className="flex items-center gap-2 cursor-pointer transition-all duration-200 ease-out hover:scale-105 hover:shadow-md active:scale-95 p-1 rounded-md"
                  >
                    {editedTask.epicId && (
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getEpicColor(editedTask.epicId) }}
                      ></div>
                    )}
                    <span className="text-sm">{getSelectedEpicName()}</span>
                  </div>
                  
                                    {showEpicDropdown && (
                    <div className={`absolute w-full mt-1 border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto transform transition-all duration-200 ease-out ${
                      showEpicDropdown ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
                    } ${theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700' : 'bg-white border-gray-300'}`}>
                      <div 
                        className={`p-2 cursor-pointer ${
                          !editedTask.epicId 
                            ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                            : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                        onClick={() => handleEpicChange(null)}
                      >
                        에픽 없음
                      </div>
                      
                      {epics.map(epic => (
                        <div 
                          key={epic.id}
                          className={`p-2 cursor-pointer flex items-center gap-2 ${
                            editedTask.epicId === epic.id 
                              ? (theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700') 
                              : (theme === 'dark' ? 'text-gray-200 hover:bg-gray-700' : 'hover:bg-gray-100')
                          }`}
                          onClick={() => handleEpicChange(epic.id)}
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: epic.color || '#4F46E5' }}
                          ></div>
                          <span>{epic.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 마감일 */}
              <div>
                <label className="text-sm font-medium block mb-1">마감일</label>
                <div className="flex items-center gap-2">
                    <CalendarIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                  <div className="flex items-center gap-2 group">
                    <input
                      type="date"
                      value={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className={`text-sm cursor-pointer border rounded px-2 py-1 ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600' 
                          : 'bg-white border-gray-300 text-gray-900 hover:border-blue-500'
                      }`}
                      style={{
                        colorScheme: theme === 'dark' ? 'dark' : 'light'
                      }}
                    />
                    {!editedTask.dueDate && (
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        마감일 없음
                      </span>
                    )}
                    {editedTask.dueDate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateChange('');
                        }}
                        className={`text-xs px-2 py-1 rounded ${
                          theme === 'dark' 
                            ? 'bg-red-700 text-red-300 hover:bg-red-600' 
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                        title="마감일 제거"
                      >
                        제거
                      </button>
                    )}
                  </div>
                      </div>
                      </div>
                  
              {/* 세부 정보 */}
              <div className="space-y-2 text-xs text-muted-foreground border-t pt-4">
                <div>
                  <span className="font-medium">생성일:</span>{" "}
                  {format(new Date(), 'PPP', { locale: ko })}
                      </div>
                <div>
                  <span className="font-medium">업데이트:</span>{" "}
                  {format(new Date(), 'PPP', { locale: ko })}
                    </div>
                <div>
                  <span className="font-medium">보고자:</span>{" "}
                  {currentUser?.name || '현재 사용자'}
                      </div>
                </div>

              {/* 액션 버튼들 */}
                <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                  className={`w-full transition-all duration-200 ease-out hover:scale-105 active:scale-95 hover:shadow-lg ${
                        theme === 'dark' 
                          ? 'text-red-400 border-red-900 bg-[#2A2A2C] hover:bg-red-950 hover:text-red-300 hover:border-red-800' 
                          : 'text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700'
                      }`}
                      onClick={handleDelete}
                    >
                      <Trash2 size={14} className="mr-1" />
                      삭제
                    </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}