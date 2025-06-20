"use client";

import { Task } from "./KanbanBoard";
import { TaskStatus } from "./KanbanBoard";
import { X, CalendarIcon, UserIcon, Smile, Bold, Italic, List, ListOrdered, Link2, Image, Code, CheckSquare, Clock, Tag, MoreHorizontal, MessageSquare, ChevronDown, ChevronUp, Copy, Trash2, Share2, AlertCircle, Users, UserCheck } from "lucide-react";
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

const RichTextEditor = ({ content, onChange, theme = "light" }: { content: string, onChange: (html: string) => void, theme?: "light" | "dark" }) => {
  // 초기 콘텐츠에서 HTML 태그 처리
  const processedContent = processTiptapContent(content);
  
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

export function TaskDetailDialog({ task, isOpen, onClose, onUpdate, onDelete, theme = "light" }: TaskDetailDialogProps) {
  const [editedTask, setEditedTask] = useState<Task>({...task});
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [showEpicDropdown, setShowEpicDropdown] = useState(false);
  const [epics, setEpics] = useState<Epic[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [isAddingComment, setIsAddingComment] = useState<boolean>(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentContent, setEditedCommentContent] = useState<string>("");
  const [isEditingComment, setIsEditingComment] = useState<boolean>(false);
  const [isDeletingComment, setIsDeletingComment] = useState<boolean>(false);
  const [showCommentMenu, setShowCommentMenu] = useState<string | null>(null);
  
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
      const response = await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskToSave),
      });

      if (!response.ok) {
        throw new Error('작업 업데이트에 실패했습니다.');
      }

      const updatedTask = await response.json();
      onUpdate(updatedTask);
    } catch (error) {
      console.error('작업 업데이트 중 오류 발생:', error);
    }
  };
  
  // 설명 변경 처리를 위한 특별 핸들러
  const handleDescriptionChange = (html: string) => {
    // 빈 p 태그 처리
    if (html === '<p></p>') {
      html = '';
    }
    
    // 서버로 보내기 전에 HTML 태그를 제거하지 않음
    // stripHtmlTags 함수는 서버 측에서 적용되므로 여기서는 원본 HTML을 유지
    // 우리는 저장할 때만 텍스트를 변환해야 함
    handleChange({...editedTask, description: html});
  };
  
  // 설명 표시용 - HTML 태그 제거
  const getCleanDescription = (): string => {
    return removeHtmlTags(editedTask.description || '');
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
    if (window.confirm('정말로 이 작업을 삭제하시겠습니까?')) {
      if (onDelete) {
        onDelete(task.id);
      }
    }
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

  // ESC 키 누를 때 모달 닫기
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, editedTask, task, handleClose]);

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
    if (!window.confirm('정말로 이 댓글을 삭제하시겠습니까?') || isDeletingComment) return;
    
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

  if (!isOpen) return null;

  return (
    // 모달 배경
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
      data-modal-backdrop="true"
    >
      {/* 모달 컨테이너 */}
      <div 
        ref={dialogRef}
        className={`
          ${theme === 'dark' ? 'dark-scrollbar' : ''} 
          ${theme === 'dark' ? 'bg-[#2A2A2C] text-gray-200' : 'bg-white'} 
          rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 스타일 태그 추가 */}
        <style>{scrollbarStyles}</style>
        
        {/* 헤더 영역 */}
        <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'bg-[#353538] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} text-sm`}>JEXO-{task.id}</span>
            <div className="flex gap-2">
              <button 
                type="button" 
                className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'} p-1 rounded`}
                onClick={(e) => e.stopPropagation()}
              >
                <Copy size={16} />
              </button>
              <button 
                type="button" 
                className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'} p-1 rounded`}
                onClick={(e) => e.stopPropagation()}
              >
                <Share2 size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'} p-1 rounded`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={18} />
            </button>
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={handleXButtonClick}
              className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'} p-1 rounded`}
              data-close-button="true"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 메인 콘텐츠 영역 */}
          <div className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'dark-scrollbar' : ''}`}>
            <div className={`p-6 ${theme === 'dark' ? 'text-gray-200' : ''}`}>
              <Input
                value={editedTask.title}
                onChange={(e) => handleChange({...editedTask, title: e.target.value})}
                className={`text-xl font-semibold border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full mb-4 ${
                  theme === 'dark' ? 'bg-[#2A2A2C] text-gray-200' : ''
                }`}
                placeholder="제목을 입력하세요"
              />
            
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>설명</span>
                </div>
                <RichTextEditor 
                  content={editedTask.description || ''} 
                  onChange={handleDescriptionChange} 
                  theme={theme}
                />
              </div>

              {/* 활동 섹션 */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-4">
                    <button 
                      className={`text-sm font-medium pb-1 ${!showActivity ? (theme === 'dark' ? 'border-b-2 border-blue-500 text-blue-400' : 'border-b-2 border-blue-500 text-blue-600') : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}`}
                      onClick={() => setShowActivity(false)}
                    >
                      댓글
                    </button>
                    <button 
                      className={`text-sm font-medium pb-1 ${showActivity ? (theme === 'dark' ? 'border-b-2 border-blue-500 text-blue-400' : 'border-b-2 border-blue-500 text-blue-600') : (theme === 'dark' ? 'text-gray-400' : 'text-gray-600')}`}
                      onClick={() => setShowActivity(true)}
                    >
                      활동 내역
                    </button>
                  </div>
                </div>

                {!showActivity ? (
                  <>
                    <div className="space-y-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>댓글</span>
                          <span className={`text-xs ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'} rounded-full px-2`}>{comments.length}</span>
                        </div>
                      </div>
                      
                      {isLoadingComments ? (
                        <div className="flex justify-center py-4">
                          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'dark' ? 'border-blue-400' : 'border-blue-500'}`}></div>
                        </div>
                      ) : comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className={`${theme === 'dark' ? 'bg-[#353538] border-gray-700' : 'bg-gray-50 border-gray-200'} p-3 rounded-md border`}>
                            <div className="flex justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium`}>
                                  {comment.user?.name?.charAt(0) || 'U'}
                                </div>
                                <span className="font-medium">{comment.user?.name || '사용자'}</span>
                                <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} text-xs`}>{format(comment.createdAt, 'PPP p', { locale: ko })}</span>
                              </div>
                              {isCommentOwner(comment) && (
                                <div className="relative">
                                  <button 
                                    className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'} p-1`}
                                    onClick={() => setShowCommentMenu(showCommentMenu === comment.id ? null : comment.id)}
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                  {showCommentMenu === comment.id && (
                                    <div className={`absolute right-0 mt-1 ${theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700' : 'bg-white border-gray-200'} border rounded-md shadow-lg z-10 w-32`}>
                                      <button 
                                        className={`w-full text-left px-3 py-2 text-sm ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'} flex items-center`}
                                        onClick={() => handleEditComment(comment)}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        수정
                                      </button>
                                      <button 
                                        className={`w-full text-left px-3 py-2 text-sm ${theme === 'dark' ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'} flex items-center`}
                                        onClick={() => handleDeleteComment(comment.id)}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        삭제
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            {editingCommentId === comment.id ? (
                              <div className="ml-10">
                                <Textarea
                                  value={editedCommentContent}
                                  onChange={(e) => setEditedCommentContent(e.target.value)}
                                  className={`w-full border focus-visible:ring-1 focus-visible:ring-blue-500 resize-none min-h-[80px] p-2 rounded-md mb-2 ${
                                    theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700 text-gray-200' : 'bg-white text-gray-800'
                                  }`}
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
                                    className={theme === 'dark' ? 'bg-blue-700 hover:bg-blue-600 text-white' : ''}
                                  >
                                    {isEditingComment ? '저장 중...' : '저장'}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'} ml-10`}>{comment.content}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} text-sm`}>아직 댓글이 없습니다.</p>
                      )}
                    </div>
                    
                    <div className={`relative ${theme === 'dark' ? 'bg-[#353538] border-gray-700' : 'bg-gray-50 border-gray-200'} rounded-md border p-3`}>
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium shrink-0">
                          U
                        </div>
                        <div className="flex-1">
                          <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            className={`w-full border focus-visible:ring-1 focus-visible:ring-blue-500 resize-none min-h-[80px] p-3 rounded-md ${
                              theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700 text-gray-200' : 'bg-white'
                            }`}
                          />
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'} p-1 rounded`}
                                type="button"
                              >
                                <Smile className="h-5 w-5" />
                              </button>
                              <button className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'} p-1 rounded`}>
                                <Bold className="h-5 w-5" />
                              </button>
                              <button className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'} p-1 rounded`}>
                                <Italic className="h-5 w-5" />
                              </button>
                              <button className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'} p-1 rounded`}>
                                <Link2 className="h-5 w-5" />
                              </button>
                            </div>
                            <Button 
                              onClick={handleAddComment} 
                              size="sm"
                              className={`${theme === 'dark' ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
                              disabled={isAddingComment}
                            >
                              {isAddingComment ? '저장 중...' : '댓글 작성'}
                            </Button>
                          </div>
                          
                          {showEmojiPicker && (
                            <div className="absolute bottom-full mb-2 z-10">
                              <EmojiPicker
                                onEmojiClick={(emojiData) => {
                                  setNewComment(prev => prev + emojiData.emoji);
                                  setShowEmojiPicker(false);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={`${theme === 'dark' ? 'bg-[#353538] border-gray-700' : 'bg-gray-50 border-gray-200'} p-4 rounded-md border`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>활동 내역</span>
                    </div>
                    <div className="space-y-3 ml-6">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">U</div>
                        <div>
                          <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            <span className="font-medium">현재 사용자</span>
                            <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} ml-1`}>이(가) 이슈를 생성했습니다.</span>
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            {format(new Date(), 'PPP p', { locale: ko })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 사이드바 영역 */}
          <div className={`w-80 border-l overflow-y-auto ${theme === 'dark' ? 'dark-scrollbar bg-[#353538] border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="p-4">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>상태</h3>
                </div>
                <select
                  value={editedTask.status}
                  onChange={(e) => handleChange({...editedTask, status: e.target.value as TaskStatus})}
                  className={`w-full border rounded-md p-2 text-sm ${
                    theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700 text-gray-200' : 'bg-white'
                  }`}
                >
                  <option value="todo" className={theme === 'dark' ? 'bg-[#2A2A2C] text-gray-300' : ''}>할 일</option>
                  <option value="in-progress" className={theme === 'dark' ? 'bg-[#2A2A2C] text-gray-300' : ''}>진행 중</option>
                  <option value="review" className={theme === 'dark' ? 'bg-[#2A2A2C] text-gray-300' : ''}>검토</option>
                  <option value="done" className={theme === 'dark' ? 'bg-[#2A2A2C] text-gray-300' : ''}>완료</option>
                </select>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>에픽</h3>
                </div>
                <div className="relative">
                  <div
                    onClick={() => setShowEpicDropdown(!showEpicDropdown)}
                    className={`w-full p-2 border rounded-md flex items-center justify-between cursor-pointer ${
                      theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700 text-gray-200 hover:bg-gray-700' : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {editedTask.epicId && (
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getEpicColor(editedTask.epicId) }}
                        ></div>
                      )}
                      <span>{getSelectedEpicName()}</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  
                  {showEpicDropdown && (
                    <div className={`absolute w-full mt-1 border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto ${
                      theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700' : 'bg-white border-gray-300'
                    }`}>
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

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>담당자</h3>
                </div>
                <div className="relative">
                  <div 
                    className={`w-full px-3 py-2 border rounded-md flex justify-between items-center cursor-pointer ${
                      theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700 text-gray-200' : 'bg-white border-gray-300'
                    }`}
                    onClick={() => setShowMembersList(!showMembersList)}
                  >
                    <div className="flex items-center">
                      {editedTask.assignee ? (
                        <>
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-2">
                            {getAssigneeName().charAt(0)}
                          </div>
                          <span className="text-sm">{getAssigneeName()}</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} mr-2`} />
                          <span className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} text-sm`}>담당자 선택</span>
                        </>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                  </div>
                  
                  {/* 멤버 선택 드롭다운 */}
                  {showMembersList && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                      {/* Unassigned option */}
                      <div 
                        className={`px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center ${!editedTask.assignee ? 'bg-blue-50' : ''}`}
                        onClick={() => {
                          handleChange({...editedTask, assignee: undefined});
                          setShowMembersList(false);
                        }}
                      >
                        <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">담당자 없음</span>
                      </div>
                      
                      {/* 현재 로그인한 사용자(본인)를 목록에 추가 */}
                      {currentUser && !isCurrentUserInMembers && (
                        <div 
                          className={`px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center ${editedTask.assignee === currentUser.id ? 'bg-blue-50' : ''}`}
                          onClick={() => {
                            handleChange({...editedTask, assignee: currentUser.id});
                            setShowMembersList(false);
                          }}
                        >
                          <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-2">
                            {currentUser.name.charAt(0)}
                          </div>
                          <span className="text-sm">{currentUser.name} (나)</span>
                        </div>
                      )}
                      
                      {projectMembers.length > 0 ? (
                        projectMembers.map((member) => (
                          <div 
                            key={member.userId}
                            className={`px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center ${editedTask.assignee === member.userId ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                              handleChange({...editedTask, assignee: member.userId});
                              setShowMembersList(false);
                            }}
                          >
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs mr-2">
                              {member.user.name.charAt(0)}
                            </div>
                            <span className="text-sm">{member.user.name} {currentUser && member.userId === currentUser.id ? '(나)' : ''}</span>
                            {member.role === "owner" && (
                              <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">소유자</span>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                          <Users className="h-4 w-4 mr-2 text-gray-400" />
                          {task.projectId ? "초대된 멤버가 없습니다" : "프로젝트 작업이 아닙니다"}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>우선순위</h3>
                </div>
                <div className="relative">
                  <select
                    value={editedTask.priority}
                    onChange={(e) => handleChange({...editedTask, priority: e.target.value as 'high' | 'medium' | 'low'})}
                    className={`w-full border rounded-md p-2 pl-8 text-sm appearance-none ${
                      theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700 text-gray-200' : 'bg-white'
                    }`}
                  >
                    <option value="high" className={theme === 'dark' ? 'bg-[#2A2A2C] text-red-400' : 'bg-red-100 text-red-800'}>높음</option>
                    <option value="medium" className={theme === 'dark' ? 'bg-[#2A2A2C] text-yellow-400' : 'bg-yellow-100 text-yellow-800'}>중간</option>
                    <option value="low" className={theme === 'dark' ? 'bg-[#2A2A2C] text-green-400' : 'bg-green-100 text-green-800'}>낮음</option>
                  </select>
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    {getPriorityIcon(editedTask.priority)}
                  </div>
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDown size={16} className="text-gray-500" />
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>마감일</h3>
                </div>
                <div className={`flex items-center gap-2 border rounded-md p-2 ${
                  theme === 'dark' ? 'bg-[#2A2A2C] border-gray-700' : 'bg-white'
                }`}>
                  <CalendarIcon className={`h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
                  <input
                    type="date"
                    value={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().split('T')[0] : ""}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className={`border-0 p-0 h-auto focus-visible:ring-0 text-sm w-full ${
                      theme === 'dark' ? 'bg-[#2A2A2C] text-gray-200' : ''
                    }`}
                  />
                </div>
              </div>

              <div className="mb-6">
                <div 
                  className="flex justify-between items-center mb-2 cursor-pointer"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  <h3 className="text-sm font-medium text-gray-500">세부 사항</h3>
                  {showDetails ? (
                    <ChevronUp size={16} className="text-gray-500" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-500" />
                  )}
                </div>
                
                {showDetails && (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">생성일</span>
                      <span>{format(new Date(), 'PPP', { locale: ko })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">업데이트</span>
                      <span>{format(new Date(), 'PPP', { locale: ko })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">보고자</span>
                      <span>현재 사용자</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className={`w-full ${
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
      </div>
    </div>
  );
}