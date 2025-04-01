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
import { useRouter, useSearchParams } from "next/navigation";

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
  folderId?: string | null; // DB 컬럼명과 일치
  tags: string[];
  content: string;
  projectId?: string;
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
  const searchParams = useSearchParams();
  const projectIdParam = searchParams?.get('projectId') || null;
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
  
  // 프로젝트 정보 상태 추가
  const [projectName, setProjectName] = useState<string | null>(null);
  // 문서 정보 상태 추가
  const [folderId, setFolderId] = useState<string | null>(null);
  // 폴더 목록 상태 추가
  const [availableFolders, setAvailableFolders] = useState<{ id: string; name: string; count: number }[]>([]);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  
  // 슬래시 커맨드 관련 상태
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  
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
    if (projectIdParam) {
      // 프로젝트 ID 유효성 확인
      const validateProjectId = async () => {
        try {
          // 프로젝트 ID가 유효한지 확인 (API 호출)
          const response = await fetch(`/api/projects/${projectIdParam}`);
          
          if (response.ok) {
            // 프로젝트가 존재하고 접근 권한이 있음
            const project = await response.json();
            setSelectedProjectId(projectIdParam);
            debugRef.current.projectIdParam = projectIdParam;
            debugRef.current.selectedProjectId = projectIdParam;
            
            // 경고 표시 관련
            if (isNewDocument) {
              setProjectIdWarning(true);
              setTimeout(() => setProjectIdWarning(false), 5000);
            }
          } else {
            // 프로젝트가 존재하지 않거나 접근 권한이 없음
            setSelectedProjectId(null);
            debugRef.current.projectIdParam = null;
            debugRef.current.selectedProjectId = null;
            alert("지정된 프로젝트에 대한 접근 권한이 없거나 프로젝트가 존재하지 않습니다.");
          }
        } catch (error) {
          setSelectedProjectId(null);
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
  }, [projectIdParam, isNewDocument, searchParams]);
  
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
        editor.commands.setContent('');
      }
      
      // 새 문서에서는 URL의 projectId 파라미터를 설정 (칸반보드와 동일한 패턴)
      if (projectIdParam) {
        setSelectedProjectId(projectIdParam);
      }
    } else if (params.id !== "new") {
      // 실제 API 호출로 문서 데이터 가져오기
      const fetchDocument = async () => {
        try {
          const response = await fetch(`/api/documents/${params.id}`);
          
          if (!response.ok) {
            throw new Error('문서를 불러오는데 실패했습니다.');
          }
          
          const documentData = await response.json();
          
          // 받아온 데이터로 상태 업데이트
          setTitle(documentData.title);
          setEmoji(documentData.emoji || "📄");
          setIsStarred(documentData.isStarred || false);
          setFolder(documentData.folder || "기본 폴더");
          setFolderId(documentData.folderId || null); // DB 컬럼명에 맞게 수정
          
          // Tags 처리 - JSON 문자열을 배열로 변환
          if (documentData.tags) {
            try {
              const parsedTags = JSON.parse(documentData.tags);
              setTags(Array.isArray(parsedTags) ? parsedTags : ["문서"]);
            } catch {
              setTags(["문서"]);
            }
          } else {
            setTags(["문서"]);
          }
          
          // 선택된 프로젝트 ID 설정 (우선순위: URL > API)
          let projectIdToUse = null;
          
          if (projectIdParam) {
            projectIdToUse = projectIdParam;
          } else if (documentData.projectId) {
            projectIdToUse = documentData.projectId;
          }
          
          // 디버깅용 참조 업데이트
          debugRef.current.projectIdFromAPI = documentData.projectId;
          
          // 프로젝트 ID 설정
          forceSetProjectId(projectIdToUse);
          
          // 에디터 내용 설정
          if (editor && documentData.content) {
            editor.commands.setContent(documentData.content);
          }
        } catch (error) {
          // 에러 발생 시 샘플 데이터 사용
          setTitle("문서를 불러올 수 없습니다");
          setEmoji("❌");
          if (editor) {
            editor.commands.setContent('<p>문서를 불러오는 중 오류가 발생했습니다.</p>');
          }
        }
      };
      
      fetchDocument();
    }
  }, [params.id, isNewDocument, editor, projectIdParam]);
  
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
      }
    } catch (error) {
      console.error('프로젝트 정보를 가져오는데 실패했습니다:', error);
    }
  };

  // 프로젝트 ID가 변경될 때마다 프로젝트 정보 가져오기
  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectInfo(selectedProjectId);
    }
  }, [selectedProjectId]);
  
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
  
  // 자동저장 관련 상태 추가
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // 자동저장 디바운스 타이머 ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 자동저장 함수
  const autoSave = useCallback(async () => {
    if (!autoSaveEnabled || !selectedProjectId) return;
    
    try {
      setIsSaving(true);
      
      const documentTitle = title.trim() || "제목 없음";
      const content = editor ? editor.getHTML() : '';
      
      const documentData = {
        title: documentTitle,
        content,
        emoji,
        isStarred,
        folder,
        tags,
        projectId: selectedProjectId,
        folderId
      };
      
      // 이미 저장된 문서가 있으면 해당 ID로 업데이트, 아니면 새로 생성
      const isCreatingNew = !savedDocumentId;
      const endpoint = isCreatingNew ? '/api/documents' : `/api/documents/${savedDocumentId}`;
      const method = isCreatingNew ? 'POST' : 'PATCH';
      
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
      });
      
      if (!response.ok) {
        throw new Error('자동 저장 실패');
      }
      
      const responseData = await response.json();
      
      // 새 문서 생성 후 ID 저장
      if (isCreatingNew && responseData.id) {
        setSavedDocumentId(responseData.id);
        setIsNewDocument(false);
        
        // URL을 업데이트하지만 페이지를 다시 로드하지는 않음
        const newUrl = `/documents/${responseData.id}?projectId=${selectedProjectId}`;
        window.history.replaceState({}, '', newUrl);
      }
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('자동 저장 중 오류:', error);
    } finally {
      setIsSaving(false);
    }
  }, [title, editor, emoji, isStarred, folder, tags, selectedProjectId, savedDocumentId, folderId]);
  
  // 컨텐츠 변경 감지 및 자동저장 트리거
  useEffect(() => {
    if (!editor || !autoSaveEnabled) return;
    
    const handleUpdate = () => {
      setHasUnsavedChanges(true);
      
      // 이전 타이머 제거 (더 이상 필요없음)
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // 바로 저장 실행
      autoSave();
    };
    
    // editor가 null이 아님이 확인된 상태
    editor.on('update', handleUpdate);
    
    return () => {
      // editor가 null이 아님이 확인된 상태
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
    
    // 바로 자동저장 실행
    autoSave();
  }, [title, autoSaveEnabled, autoSave]);
  
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 공통 CSS 스타일 */}
      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 100px;
          padding: 0.5rem 0;
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
          margin: 0.5em 0 0.25em;
        }
        
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0.5em 0 0.25em;
        }
        
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 0.5em 0 0.25em;
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
      <div className={`sticky ${projectIdWarning ? 'top-10' : 'top-0'} z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center">
          <Link href={`/documents?projectId=${selectedProjectId || ''}`} className="p-2 rounded-md hover:bg-gray-100 mr-2">
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex items-center">
            <button className="text-2xl mr-2">{emoji}</button>
            <div className="text-sm text-gray-500 flex items-center relative">
              <FolderIcon className="w-4 h-4 mr-1" />
              <button 
                onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                className="hover:bg-gray-100 py-1 px-2 rounded-md flex items-center"
              >
                <span>{folder || "기본 폴더"}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* 폴더 드롭다운 */}
              {showFolderDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 w-56">
                  <div className="py-1 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setFolder("기본 폴더");
                        setFolderId(null);
                        setShowFolderDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm ${folder === "기본 폴더" ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      기본 폴더
                    </button>
                    
                    {availableFolders.length > 0 && (
                      <>
                        <div className="border-t border-gray-200 my-1"></div>
                        {availableFolders.map((folderItem) => (
                          <button
                            key={folderItem.id}
                            onClick={() => handleFolderChange(folderItem)}
                            className={`w-full text-left px-4 py-2 text-sm ${folder === folderItem.name ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-700'}`}
                          >
                            {folderItem.name}
                          </button>
                        ))}
                      </>
                    )}
                    
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={() => {
                        const newFolder = prompt("새 폴더 이름을 입력하세요:");
                        if (newFolder && newFolder.trim()) {
                          createNewFolder(newFolder.trim());
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex items-center"
                    >
                      <PlusIcon className="w-4 h-4 mr-2" />
                      <span>새 폴더 만들기</span>
                    </button>
                  </div>
                </div>
              )}
              
              {selectedProjectId && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center">          
                  <span className="font-mono ml-1 bg-blue-100 px-1">
                    {projectName || '로딩 중...'}
                  </span>
                </span>
              )}
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
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1"></div>
                <span>저장 중...</span>
              </>
            ) : (
              <>
                <SaveIcon className="w-4 h-4" />
                <span>저장</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 성공 메시지 */}
      {saveSuccess && (
        <div className="fixed top-16 right-4 bg-green-50 border-l-4 border-green-500 p-4 rounded shadow-md z-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                문서가 성공적으로 저장되었습니다.
                {selectedProjectId && (
                  <span className="block text-xs mt-1 font-mono">
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* 문서 편집 영역 */}
      <div className="max-w-4xl mx-auto px-8 flex-1">
        {/* 문서 제목 */}
        <div className="mt-0 pt-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-bold text-gray-900 border-none outline-none focus:ring-0 p-0 pt-2"
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
        <div className="prose max-w-none mt-1">
          <EditorContent editor={editor} className="min-h-[500px]" />
        </div>
      </div>
    </div>
  );
}