import { useState, useEffect, useRef } from 'react';
import { useEditor, Editor } from '@tiptap/react';
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
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';

// 커스텀 협업 커서 확장
const CustomCollaborationCursor = CollaborationCursor.extend({
  addNodeView() {
    return (node: any, view: any, getPos: any) => {
      const cursor = document.createElement('div');
      cursor.className = 'collaboration-cursor';
      cursor.contentEditable = 'false';
      cursor.style.position = 'absolute';
      cursor.style.zIndex = '20';
      cursor.style.pointerEvents = 'none';

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
      
      if (node.attrs.user) {
        const { user } = node.attrs;
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

interface UseDocumentEditorProps {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  currentUser: any;
  isReadOnlyMode: boolean;
  connectedUsers: any[];
}

interface UseDocumentEditorReturn {
  // 에디터
  editor: Editor | null;
  
  // 슬래시 커맨드
  showSlashMenu: boolean;
  setShowSlashMenu: (show: boolean) => void;
  slashMenuPosition: { x: number; y: number };
  slashMenuRef: React.RefObject<HTMLDivElement>;
  
  // 템플릿
  showTemplateMenu: boolean;
  setShowTemplateMenu: (show: boolean) => void;
  isCreatingTemplate: boolean;
  selectedTemplate: string | null;
  templates: { id: string; name: string; description: string }[];
  
  // AI 요약
  showSummaryModal: boolean;
  setShowSummaryModal: (show: boolean) => void;
  documentSummary: string;
  isSummarizing: boolean;
  
  // 함수들
  applyBlockType: (type: string) => void;
  summarizeDocument: () => Promise<void>;
  createDocumentTemplate: (templateType: string) => Promise<void>;
  showTemplates: () => void;
}

export const useDocumentEditor = ({
  ydoc,
  provider,
  currentUser,
  isReadOnlyMode,
  connectedUsers
}: UseDocumentEditorProps): UseDocumentEditorReturn => {
  
  // 슬래시 커맨드 관련 상태
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  
  // 템플릿 관련 상태
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  // AI 요약 관련 상태
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [documentSummary, setDocumentSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // 템플릿 타입
  const templates = [
    { id: 'meeting', name: '회의록', description: '회의 내용과 결정사항을 기록하는 템플릿' },
    { id: 'weekly', name: '주간 보고서', description: '주간 업무 성과와 계획을 정리하는 템플릿' },
    { id: 'project', name: '프로젝트 계획서', description: '프로젝트 목표와 일정을 정리하는 템플릿' },
    { id: 'research', name: '연구 문서', description: '연구 내용과 결과를 정리하는 템플릿' }
  ];

  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        history: false,
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
    immediatelyRender: false
  }, [provider, currentUser]);

  // 읽기 전용 모드 변경 시 에디터 편집 가능 여부 업데이트
  useEffect(() => {
    if (!editor) return;
    
    const editableState = !isReadOnlyMode;
    
    if (editor.isEditable !== editableState) {
      editor.setEditable(editableState);
      console.log(`에디터 편집 가능 상태 변경: ${editableState}, 읽기 전용 모드: ${isReadOnlyMode}`);
    }
  }, [editor, isReadOnlyMode]);

  // 블록 타입 변경 함수
  const applyBlockType = (type: string) => {
    if (!editor) return;
    
    if (showSlashMenu) {
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
      
      const content = editor.getHTML();
      
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
      
      let participants = '';
      if (templateType === 'meeting' && connectedUsers.length > 0) {
        participants = connectedUsers
          .map(user => user.name || '익명 사용자')
          .join(', ');
      }
      
      const response = await fetch('/api/ai/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          templateType,
          participants: participants
        }),
      });
      
      if (!response.ok) {
        throw new Error('템플릿 생성 중 오류가 발생했습니다.');
      }
      
      const data = await response.json();
      editor.commands.setContent(data.content);
      
      const templateInfo = templates.find(t => t.id === templateType);
      if (templateInfo) {
        const titleInput = document.querySelector('input[placeholder="제목 없음"]') as HTMLInputElement;
        if (titleInput) {
          titleInput.value = templateInfo.name;
          const event = new Event('input', { bubbles: true });
          titleInput.dispatchEvent(event);
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

  // 템플릿 메뉴 표시
  const showTemplates = () => {
    setShowTemplateMenu(true);
  };

  // 단축키 핸들러
  useEffect(() => {
    if (!editor) return;
    
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      if (event.key === '.' && (event.metaKey || event.ctrlKey)) {
        return;
      }
      
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      
      if (!modKey) {
        return;
      }
      
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
      
      if (event.shiftKey) {
        if (event.key === '8' || event.key === '*') {
          event.preventDefault();
          applyBlockType('bulletList');
        } else if (event.key === '7' || event.key === '&') {
          event.preventDefault();
          applyBlockType('orderedList');
        } else if (event.key === '9' || event.key === '(') {
          event.preventDefault();
          applyBlockType('taskList');
        }
      }
      
      if (event.key === 'b' && !event.shiftKey) {
        event.preventDefault();
        applyBlockType('blockquote');
      } else if (event.key === 'c' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        applyBlockType('codeBlock');
      } else if (event.key === 'l' && !event.shiftKey) {
        event.preventDefault();
        applyBlockType('horizontalRule');
      } else if (event.key === 'i' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        applyBlockType('image');
      }
    };
    
    document.addEventListener('keydown', handleKeyboardShortcuts, false);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts, false);
    };
  }, [editor]);

  // 슬래시 키 입력 감지
  useEffect(() => {
    if (!editor) return;
    
    const handleDOMEvents = () => {
      const editorElement = document.querySelector('.ProseMirror');
      if (!editorElement) {
        setTimeout(handleDOMEvents, 100);
        return;
      }
      
      const handleKeyDown = (event: Event) => {
        const keyEvent = event as KeyboardEvent;
        if (keyEvent.key === '/' && !showSlashMenu) {
          try {
            const { view } = editor;
            
            if (!view || !view.state) {
              throw new Error("에디터 view 또는 state가 유효하지 않습니다");
            }
            
            const { state } = view;
            const { selection } = state;
            
            if (!selection || !selection.ranges || selection.ranges.length === 0) {
              throw new Error("에디터 선택 범위가 유효하지 않습니다");
            }
            
            const { ranges } = selection;
            const from = Math.min(...ranges.map(range => range.$from.pos));
            
            const editorElement = document.querySelector('.ProseMirror');
            if (!editorElement) {
              throw new Error("에디터 DOM 요소를 찾을 수 없습니다");
            }
            
            const editorRect = editorElement.getBoundingClientRect();
            
            let menuX = editorRect.left + 16;
            let menuY = editorRect.top + 100;
            
            try {
              if (view.domAtPos && typeof view.domAtPos === 'function' && 
                  from >= 0 && from <= state.doc.content.size) {
                
                const pos = view.coordsAtPos(from);
                
                if (pos && pos.left >= editorRect.left && pos.top >= editorRect.top) {
                  menuX = pos.left;
                  menuY = pos.bottom + 5;
                } else {
                  const domPos = view.domAtPos(from);
                  if (domPos && domPos.node) {
                    let targetElement = domPos.node;
                    
                    if (targetElement.nodeType === Node.TEXT_NODE) {
                      targetElement = targetElement.parentElement || targetElement;
                    }
                    
                    if (targetElement instanceof Element) {
                      const rect = targetElement.getBoundingClientRect();
                      menuX = Math.max(rect.left + 16, editorRect.left + 16);
                      menuY = rect.bottom + 5;
                    } else {
                      menuX = editorRect.left + 16;
                      
                      const scrollTop = editorElement.scrollTop || 0;
                      const lineHeight = 24;
                      
                      const textBeforeCursor = state.doc.textBetween(0, from);
                      const lineNumber = (textBeforeCursor.match(/\n/g) || []).length;
                      
                      menuY = editorRect.top + (lineNumber * lineHeight) + lineHeight + 5 - scrollTop;
                    }
                  }
                }
              }
            } catch (coordError) {
              console.warn("커서 좌표 계산 실패:", coordError);
            }
            
            if (menuX + 280 > window.innerWidth) {
              menuX = Math.max(window.innerWidth - 280, 0);
            }
            
            if (menuY + 420 > window.innerHeight) {
              menuY = Math.max(window.innerHeight - 420, 10);
            }
            
            setSlashMenuPosition({
              x: menuX,
              y: menuY
            });
            
            setTimeout(() => {
              setShowSlashMenu(true);
            }, 10);
          } catch (error) {
            console.error("슬래시 메뉴 표시 중 오류 발생:", error);
            setSlashMenuPosition({
              x: Math.max(window.innerWidth / 2 - 140, 10),
              y: window.innerHeight / 3
            });
            
            setTimeout(() => {
              setShowSlashMenu(true);
            }, 10);
          }
        } else if (keyEvent.key === 'Backspace' && showSlashMenu) {
          try {
            const { state } = editor.view;
            const { selection } = state;
            const { from } = selection;
            
            const textBefore = state.doc.textBetween(Math.max(0, from - 1), from);
            
            if (textBefore === '/') {
              setShowSlashMenu(false);
            }
          } catch (error) {
            setShowSlashMenu(false);
          }
        }
      };
      
      const handleInput = () => {
        if (showSlashMenu) {
          const { state } = editor.view;
          const { selection } = state;
          const { from } = selection;
          
          const checkFrom = Math.max(0, from - 5);
          const surroundingText = state.doc.textBetween(checkFrom, from);
          
          if (!surroundingText.includes('/')) {
            setShowSlashMenu(false);
          }
        }
      };
      
      editorElement.removeEventListener('keydown', handleKeyDown);
      editorElement.removeEventListener('input', handleInput);
      
      editorElement.addEventListener('keydown', handleKeyDown);
      editorElement.addEventListener('input', handleInput);
      
      return () => {
        editorElement.removeEventListener('keydown', handleKeyDown);
        editorElement.removeEventListener('input', handleInput);
      };
    };
    
    const onEditorUpdate = () => {
      handleDOMEvents();
    };
    
    editor.on('update', onEditorUpdate);
    handleDOMEvents();
    
    return () => {
      editor.off('update', onEditorUpdate);
      
      const editorElement = document.querySelector('.ProseMirror');
      if (editorElement) {
        const newEvent = new Event('keydown');
        const newInputEvent = new Event('input');
        editorElement.removeEventListener('keydown', () => {});
        editorElement.removeEventListener('input', () => {});
      }
    };
  }, [editor, showSlashMenu]);

  // 바깥 영역 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSlashMenu && slashMenuRef.current && !slashMenuRef.current.contains(event.target as Node)) {
        setShowSlashMenu(false);
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSlashMenu) {
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
  }, [showSlashMenu]);

  return {
    // 에디터
    editor,
    
    // 슬래시 커맨드
    showSlashMenu,
    setShowSlashMenu,
    slashMenuPosition,
    slashMenuRef,
    
    // 템플릿
    showTemplateMenu,
    setShowTemplateMenu,
    isCreatingTemplate,
    selectedTemplate,
    templates,
    
    // AI 요약
    showSummaryModal,
    setShowSummaryModal,
    documentSummary,
    isSummarizing,
    
    // 함수들
    applyBlockType,
    summarizeDocument,
    createDocumentTemplate,
    showTemplates
  };
}; 