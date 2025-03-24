"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  ArrowLeftIcon, 
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
  AlignLeft
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

// 문서 인터페이스 정의
interface Document {
  id: string;
  title: string;
  emoji: string;
  isStarred: boolean;
  folder: string;
  tags: string[];
  content: string; // JSON 형식의 문서 내용
}

export default function DocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [title, setTitle] = useState("제목 없음");
  const [emoji, setEmoji] = useState("📄");
  const [isStarred, setIsStarred] = useState(false);
  const [folder, setFolder] = useState("프로젝트 문서");
  const [tags, setTags] = useState<string[]>(["문서"]);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  // 슬래시 커맨드 관련 상태
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  
  const menuRef = useRef<HTMLDivElement | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  
  // 새 문서 작성 페이지인지 확인
  const isNewDocument = params.id === "new";
  
  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // 사용자 정의 Heading 확장을 사용하기 위해 비활성화
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
    ],
    content: '',
    autofocus: true,
    editable: true,
    injectCSS: false,
  });
  
  // 슬래시 키 입력 감지
  useEffect(() => {
    if (!editor) return;
    
    // Tiptap 에디터에 키 이벤트 리스너 추가
    const handleDOMEvents = () => {
      // 에디터의 DOM 요소 가져오기
      const editorElement = document.querySelector('.ProseMirror');
      if (!editorElement) return;
      
      // 키 입력 이벤트 핸들러
      const handleKeyDown = (event: Event) => {
        const keyEvent = event as KeyboardEvent;
        if (keyEvent.key === '/' && !showSlashMenu) {
          // 현재 커서 위치 계산
          const { view } = editor;
          const { state } = view;
          const { selection } = state;
          const { ranges } = selection;
          const from = Math.min(...ranges.map(range => range.$from.pos));
          
          // 현재 커서 위치의 DOM 좌표 찾기
          const pos = view.coordsAtPos(from);
          
          // 슬래시 메뉴 위치 설정
          setSlashMenuPosition({
            x: pos.left,
            y: pos.bottom
          });
          
          // 메뉴 표시
          setShowSlashMenu(true);
        }
      };
      
      // 이벤트 리스너 추가
      editorElement.addEventListener('keydown', handleKeyDown);
      
      // 컴포넌트 언마운트 시 이벤트 리스너 제거
      return () => {
        editorElement.removeEventListener('keydown', handleKeyDown);
      };
    };
    
    // 에디터가 마운트된 후 DOM 이벤트 리스너 설정
    const setupTimeout = setTimeout(handleDOMEvents, 100);
    
    return () => {
      clearTimeout(setupTimeout);
    };
  }, [editor, showSlashMenu]);
  
  // 문서 데이터 로드 (실제로는 API 호출)
  useEffect(() => {
    if (isNewDocument) {
      // 새 문서 초기화
      setTitle("제목 없음");
      setEmoji("📄");
      setIsStarred(false);
      
      // 에디터 내용 초기화
      if (editor) {
        editor.commands.setContent('');
      }
    } else if (params.id === "1") {
      // 샘플 문서 데이터 (실제로는 API에서 가져옴)
      setTitle("제품 로드맵 2024");
      setEmoji("🚀");
      setIsStarred(true);
      setFolder("프로젝트 문서");
      setTags(["로드맵", "전략"]);
      
      // 샘플 문서 내용 설정
      if (editor) {
        editor.commands.setContent(`
          <h1>제품 로드맵 2024</h1>
          <p>이 문서는 2024년 제품 개발 로드맵을 정리한 문서입니다.</p>
          <h2>1분기 목표</h2>
          <ul>
            <li>사용자 인터페이스 개선</li>
            <li>성능 최적화</li>
            <li>모바일 대응성 향상</li>
          </ul>
          <h2>2분기 목표</h2>
          <ul class="task-list">
            <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div>새로운 분석 대시보드 개발</div></li>
            <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div>사용자 피드백 시스템 구축</div></li>
            <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div>API 확장 및 문서화</div></li>
          </ul>
          <h2>3분기 목표</h2>
          <p>3분기에는 다음과 같은 기능을 중점적으로 개발할 예정입니다:</p>
          <ol>
            <li>AI 기반 추천 시스템</li>
            <li>고급 데이터 시각화 도구</li>
            <li>협업 기능 강화</li>
          </ol>
          <h2>4분기 목표</h2>
          <blockquote>사용자 경험을 최우선으로 생각하며 지속적인 개선을 추구합니다.</blockquote>
          <p>4분기에는 전체 시스템 안정화 및 성능 최적화에 집중할 예정입니다.</p>
          <pre><code>// 예시 코드
function optimizePerformance() {
  // 성능 최적화 로직
  return improved;
}</code></pre>
          <hr>
          <p>이 로드맵은 상황에 따라 변경될 수 있습니다.</p>
        `);
      }
    }
  }, [params.id, isNewDocument, editor]);
  
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
    
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
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
    }
    
    setShowSlashMenu(false);
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
  
  // 문서 저장
  const saveDocument = () => {
    try {
      // 빈 제목은 "제목 없음"으로 설정
      const documentTitle = title.trim() || "제목 없음";
      
      // 에디터 내용 가져오기
      const content = editor ? editor.getHTML() : '';
      
      // 문서 객체 구성
      const document: Document = {
        id: params.id,
        title: documentTitle, 
        emoji, 
        isStarred,
        folder, 
        tags,
        content
      };
      
      console.log("문서 저장:", document);
      
      // 실제로는 API 호출
      
      if (isNewDocument) {
        // 새 문서 저장 후 해당 문서 페이지로 리다이렉트
        router.push("/documents/1");
      }
      
      // 성공 메시지 표시
      alert("문서가 성공적으로 저장되었습니다.");
    } catch (error) {
      console.error("문서 저장 중 오류 발생:", error);
      alert("문서 저장 중 오류가 발생했습니다.");
    }
  };
  
  return (
    <div className="min-h-screen bg-white">
      {/* 공통 CSS 스타일 */}
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 100px;
          padding: 1rem 0;
        }
        
        .ProseMirror p {
          margin-bottom: 0.75em;
        }
        
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
        }
        
        .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }
        
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }
        
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 1em 0 0.5em;
        }
        
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5em;
          margin-bottom: 0.75em;
        }
        
        .ProseMirror blockquote {
          border-left: 4px solid #d1d5db;
          padding-left: 1em;
          font-style: italic;
          color: #4b5563;
          margin: 1em 0;
        }
        
        .ProseMirror pre {
          background-color: #f3f4f6;
          padding: 1em;
          border-radius: 0.25em;
          overflow-x: auto;
          margin: 1em 0;
        }
        
        .ProseMirror code {
          font-family: monospace;
          font-size: 0.875em;
        }
        
        .ProseMirror hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 2em 0;
        }
        
        .ProseMirror img {
          max-width: 100%;
          height: auto;
        }
        
        .ProseMirror a {
          color: #2563eb;
          text-decoration: underline;
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
      `}</style>
      
      {/* 상단 툴바 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/documents" className="p-2 rounded-md hover:bg-gray-100 mr-2">
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex items-center">
            <button className="text-2xl mr-2">{emoji}</button>
            <div className="text-sm text-gray-500 flex items-center">
              <FolderIcon className="w-4 h-4 mr-1" />
              <span>{folder}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {tags.map((tag, index) => (
              <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            <button className="p-1 rounded-md hover:bg-gray-100">
              <TagIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          
          <button 
            className="p-2 rounded-md hover:bg-gray-100"
            onClick={() => setIsStarred(!isStarred)}
          >
            <StarIcon className={`w-5 h-5 ${isStarred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
          </button>
          
          <button className="p-2 rounded-md hover:bg-gray-100">
            <ShareIcon className="w-5 h-5 text-gray-600" />
          </button>
          
          <button className="p-2 rounded-md hover:bg-gray-100">
            <UsersIcon className="w-5 h-5 text-gray-600" />
          </button>
          
          <button 
            onClick={saveDocument}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
          >
            <SaveIcon className="w-4 h-4" />
            <span>저장</span>
          </button>
        </div>
      </div>
      
      {/* 문서 편집 영역 */}
      <div className="max-w-4xl mx-auto px-8">
        {/* 문서 제목 */}
        <div className="mb-8 mt-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-bold text-gray-900 border-none outline-none focus:ring-0 p-0"
            placeholder="제목 없음"
          />
        </div>
        
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
                className={`p-1 rounded ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                title="굵게"
              >
                <span className="font-bold">B</span>
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1 rounded ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                title="기울임"
              >
                <span className="italic">I</span>
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={`p-1 rounded ${editor.isActive('highlight') ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
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
            className="fixed bg-white shadow-xl rounded-lg border border-gray-200 z-50 w-72"
            style={{ left: `${slashMenuPosition.x}px`, top: `${slashMenuPosition.y}px` }}
          >
            <div className="overflow-hidden max-h-80 overflow-y-auto">
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('paragraph')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">텍스트</div>
                  <div className="text-xs text-gray-500">일반 텍스트를 입력합니다</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+0</div>
              </button>
              
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('heading1')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <span className="font-bold">H1</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">제목 1</div>
                  <div className="text-xs text-gray-500">큰 제목</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+1</div>
              </button>
              
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('heading2')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <span className="font-bold">H2</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">제목 2</div>
                  <div className="text-xs text-gray-500">중간 제목</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+2</div>
              </button>
              
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('heading3')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <span className="font-bold">H3</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">제목 3</div>
                  <div className="text-xs text-gray-500">작은 제목</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+3</div>
              </button>
              
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('bulletList')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <ListIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">글머리 기호</div>
                  <div className="text-xs text-gray-500">글머리 기호가 있는 목록</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+Shift+8</div>
              </button>
              
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('orderedList')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <span className="font-mono">1.</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">번호 매기기</div>
                  <div className="text-xs text-gray-500">번호가 매겨진 목록</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+Shift+7</div>
              </button>
              
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('taskList')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <CheckSquareIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">할 일 목록</div>
                  <div className="text-xs text-gray-500">체크박스가 있는 목록</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+Shift+9</div>
              </button>
              
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('blockquote')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <QuoteIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">인용구</div>
                  <div className="text-xs text-gray-500">인용문을 추가합니다</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+B</div>
              </button>
              
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('codeBlock')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <CodeIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">코드 블록</div>
                  <div className="text-xs text-gray-500">코드 블록을 추가합니다</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+Alt+C</div>
              </button>
              
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('horizontalRule')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <span>—</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">구분선</div>
                  <div className="text-xs text-gray-500">수평선을 추가합니다</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+L</div>
              </button>
              
              <button 
                className="w-full px-3 py-2 flex items-center text-left hover:bg-gray-100"
                onClick={() => applyBlockType('image')}
              >
                <div className="mr-2 w-6 h-6 flex items-center justify-center text-gray-500">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium">이미지</div>
                  <div className="text-xs text-gray-500">이미지를 추가합니다</div>
                </div>
                <div className="text-xs text-gray-400 ml-2">Ctrl+Alt+I</div>
              </button>
            </div>
          </div>
        )}
        
        {/* Tiptap 에디터 */}
        <div className="prose max-w-none">
          <EditorContent editor={editor} className="min-h-[500px]" />
        </div>
      </div>
    </div>
  );
}