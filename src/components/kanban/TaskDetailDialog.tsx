"use client";

import { Task } from "./KanbanBoard";
import { X, CalendarIcon, UserIcon, Smile, Bold, Italic, List, ListOrdered, Link2, Image, Code, CheckSquare, Clock, Tag, MoreHorizontal, MessageSquare, ChevronDown, ChevronUp, Copy, Trash2, Share2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useState, useEffect, useRef } from "react";
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

interface Comment {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
}

interface TaskDetailDialogProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
}

const RichTextEditor = ({ content, onChange }: { content: string, onChange: (html: string) => void }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      ListItem,
      BulletList,
      OrderedList,
      TaskList,
      TaskItem.configure({
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
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="rich-text-editor border rounded-md overflow-hidden">
      <div className="bg-gray-50 border-b p-2 flex flex-wrap gap-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
          type="button"
          title="굵게"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
          type="button"
          title="기울임"
        >
          <Italic size={16} />
        </button>
        <span className="w-px h-6 bg-gray-300 mx-1"></span>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
          type="button"
          title="글머리 기호"
        >
          <List size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
          type="button"
          title="번호 목록"
        >
          <ListOrdered size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('taskList') ? 'bg-gray-200' : ''}`}
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
          className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
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
          className="p-1 rounded hover:bg-gray-200"
          type="button"
          title="이미지"
        >
          <Image size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`p-1 rounded hover:bg-gray-200 ${editor.isActive('codeBlock') ? 'bg-gray-200' : ''}`}
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
            className="border rounded p-1 text-xs bg-white hover:bg-gray-50"
            title="텍스트 색상"
          >
            <option value="">색상</option>
            <option value="#ff5630" style={{ color: '#ff5630' }}>빨강</option>
            <option value="#00b8d9" style={{ color: '#00b8d9' }}>파랑</option>
            <option value="#36b37e" style={{ color: '#36b37e' }}>초록</option>
            <option value="#ff991f" style={{ color: '#ff991f' }}>주황</option>
            <option value="#6554c0" style={{ color: '#6554c0' }}>보라</option>
            <option value="#172b4d" style={{ color: '#172b4d' }}>검정</option>
          </select>
        </div>
        <button
          onClick={() => {
            const emoji = window.prompt('이모지 입력:');
            if (emoji) {
              editor.chain().focus().insertContent(emoji).run();
            }
          }}
          className="p-1 rounded hover:bg-gray-200"
          type="button"
          title="이모지"
        >
          <Smile size={16} />
        </button>
      </div>
      <EditorContent editor={editor} className="p-3 min-h-[150px] prose max-w-none" />
    </div>
  );
};

export function TaskDetailDialog({ task, isOpen, onClose, onUpdate }: TaskDetailDialogProps) {
  const [editedTask, setEditedTask] = useState<Task>({...task});
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [showActivity, setShowActivity] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // task가 변경될 때마다 editedTask 업데이트
  useEffect(() => {
    setEditedTask({...task});
  }, [task]);

  // 변경사항이 있을 때마다 자동 저장
  const handleChange = (updatedTask: Task) => {
    setEditedTask(updatedTask);
    onUpdate(updatedTask);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      content: newComment,
      author: "현재 사용자", // 실제 구현시 로그인된 사용자 정보 사용
      createdAt: new Date()
    };
    
    setComments([...comments, comment]);
    setNewComment("");
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
      case 'high': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'low': return <AlertCircle className="h-4 w-4 text-green-600" />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        ref={dialogRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* 헤더 영역 */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">JEXO-{task.id}</span>
            <div className="flex gap-2">
              <button className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200">
                <Copy size={16} />
              </button>
              <button className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200">
                <Share2 size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200">
              <MoreHorizontal size={18} />
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 메인 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <Input
                value={editedTask.title}
                onChange={(e) => handleChange({...editedTask, title: e.target.value})}
                className="text-xl font-semibold border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-full mb-4"
                placeholder="제목을 입력하세요"
              />
              
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-700">설명</span>
                </div>
                <RichTextEditor 
                  content={editedTask.description || ""} 
                  onChange={(html) => handleChange({...editedTask, description: html})}
                />
              </div>
              
              {/* 활동 섹션 */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-4">
                    <button 
                      className={`text-sm font-medium pb-1 ${!showActivity ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                      onClick={() => setShowActivity(false)}
                    >
                      댓글
                    </button>
                    <button 
                      className={`text-sm font-medium pb-1 ${showActivity ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-600'}`}
                      onClick={() => setShowActivity(true)}
                    >
                      활동 내역
                    </button>
                  </div>
                </div>
                
                {!showActivity ? (
                  <>
                    <div className="space-y-4 mb-4">
                      {comments.length > 0 ? (
                        comments.map((comment) => (
                          <div key={comment.id} className="bg-gray-50 p-3 rounded-md border">
                            <div className="flex justify-between text-sm mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                                  {comment.author.charAt(0)}
                                </div>
                                <span className="font-medium">{comment.author}</span>
                                <span className="text-gray-500 text-xs">{format(comment.createdAt, 'PPP p', { locale: ko })}</span>
                              </div>
                              <button className="text-gray-400 hover:text-gray-600">
                                <MoreHorizontal size={16} />
                              </button>
                            </div>
                            <p className="text-gray-800 ml-10">{comment.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">아직 댓글이 없습니다.</p>
                      )}
                    </div>

                    <div className="relative bg-gray-50 rounded-md border p-3">
                      <div className="flex items-start gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium shrink-0">
                          U
                        </div>
                        <div className="flex-1">
                          <Textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            className="w-full border bg-white focus-visible:ring-1 focus-visible:ring-blue-500 resize-none min-h-[80px] p-3 rounded-md"
                          />
                          <div className="flex justify-between items-center mt-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200"
                                type="button"
                              >
                                <Smile className="h-5 w-5" />
                              </button>
                              <button className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200">
                                <Bold className="h-5 w-5" />
                              </button>
                              <button className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200">
                                <Italic className="h-5 w-5" />
                              </button>
                              <button className="text-gray-500 hover:text-gray-700 p-1 rounded hover:bg-gray-200">
                                <Link2 className="h-5 w-5" />
                              </button>
                            </div>
                            <Button 
                              onClick={handleAddComment} 
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              댓글 작성
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
                  <div className="bg-gray-50 p-4 rounded-md border">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">활동 내역</span>
                    </div>
                    <div className="space-y-3 ml-6">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">U</div>
                        <div>
                          <div className="text-sm">
                            <span className="font-medium">현재 사용자</span>
                            <span className="text-gray-500 ml-1">이(가) 이슈를 생성했습니다.</span>
                          </div>
                          <div className="text-xs text-gray-500">
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
          <div className="w-80 border-l overflow-y-auto bg-gray-50">
            <div className="p-4">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-500">상태</h3>
                </div>
                <select
                  value={editedTask.status}
                  onChange={(e) => handleChange({...editedTask, status: e.target.value as 'todo' | 'in-progress' | 'review' | 'done'})}
                  className="w-full border rounded-md p-2 text-sm bg-white"
                >
                  <option value="todo" className="bg-gray-100 text-gray-800">할 일</option>
                  <option value="in-progress" className="bg-blue-100 text-blue-800">진행 중</option>
                  <option value="review" className="bg-purple-100 text-purple-800">검토</option>
                  <option value="done" className="bg-green-100 text-green-800">완료</option>
                </select>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-500">담당자</h3>
                </div>
                <div className="flex items-center gap-2 border rounded-md p-2 bg-white">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  <Input
                    value={editedTask.assignee || ""}
                    onChange={(e) => handleChange({...editedTask, assignee: e.target.value})}
                    placeholder="담당자 지정"
                    className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-500">우선순위</h3>
                </div>
                <div className="relative">
                  <select
                    value={editedTask.priority}
                    onChange={(e) => handleChange({...editedTask, priority: e.target.value as 'high' | 'medium' | 'low'})}
                    className="w-full border rounded-md p-2 pl-8 text-sm bg-white appearance-none"
                  >
                    <option value="high" className="bg-red-100 text-red-800">높음</option>
                    <option value="medium" className="bg-yellow-100 text-yellow-800">중간</option>
                    <option value="low" className="bg-green-100 text-green-800">낮음</option>
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
                  <h3 className="text-sm font-medium text-gray-500">마감일</h3>
                </div>
                <div className="flex items-center gap-2 border rounded-md p-2 bg-white">
                  <CalendarIcon className="h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    value={editedTask.dueDate ? new Date(editedTask.dueDate).toISOString().split('T')[0] : ""}
                    onChange={(e) => handleChange({...editedTask, dueDate: e.target.value})}
                    className="border-0 p-0 h-auto focus-visible:ring-0 text-sm"
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
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 size={14} className="mr-1" />
                    삭제
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-gray-600 border-gray-200 hover:bg-gray-50"
                  >
                    <Copy size={14} className="mr-1" />
                    복제
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