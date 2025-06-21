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
import Sidebar from "@/components/Sidebar";
import { 
  useCollaboration,
  useDocumentEditor,
  useDocumentSave,
  useDocumentData,
  useDocumentProject
} from "@/hooks/documents";
import { 
  SummaryModal, 
  TemplateModal, 
  PasswordModal, 
  SettingsModal, 
  FolderModal, 
  SecurityDropdown 
} from "@/components/modals";

// 문서 에디터 CSS 스타일 import
import "@/styles/documents/index.css";

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
  const [mounted, setMounted] = useState(false);
  
  // 설정 모달 관련 상태
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempSettings, setTempSettings] = useState({
    theme: theme,
    language: 'ko',
    notifications: {
      email: true,
      push: true,
      desktop: true,
    },
    privacy: {
      profileVisible: true,
      activityVisible: true,
    }
  });
  
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

  // 설정 저장 함수
  const handleSaveSettings = () => {
    // 테마 변경
    if (tempSettings.theme !== theme) {
      setTheme(tempSettings.theme);
    }
    
    // 다른 설정들도 여기서 저장 처리
    localStorage.setItem('userSettings', JSON.stringify(tempSettings));
    
    setShowSettingsModal(false);
  };
  
  // 설정 모달 열기 함수
  const openSettingsModal = () => {
    setTempSettings({
      theme: theme,
      language: 'ko',
      notifications: {
        email: true,
        push: true,
        desktop: true,
      },
      privacy: {
        profileVisible: true,
        activityVisible: true,
      }
    });
    setShowSettingsModal(true);
  };

  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const searchParams = useSearchParams();
  const projectId = searchParams?.get('projectId');
  
  // 폴더 목록 상태 추가
  const [availableFolders, setAvailableFolders] = useState<{ id: string; name: string; count: number }[]>([]);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  
  // 폴더 모달 상태 추가
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderModalName, setFolderModalName] = useState<string>("");
  const [isFolderCreating, setIsFolderCreating] = useState(false);
  
  // 읽기 전용 모드 디바운싱 상태
  const [isButtonDebouncing, setIsButtonDebouncing] = useState(false);
  
  // 중복 상태 제거됨 - useDocumentEditor 훅으로 이동됨
  const [templateContent, setTemplateContent] = useState('');
  
  // 템플릿 모달 ref
  const templateMenuRef = useRef<HTMLDivElement | null>(null);
  
  const menuRef = useRef<HTMLDivElement | null>(null);
  // slashMenuRef는 useDocumentEditor 훅으로 이동됨

  // 새 문서 작성 페이지인지 확인
  const [isNewDocument, setIsNewDocument] = useState(params.id === "new");
  
  // 저장된 문서 ID를 추적하기 위한 상태 추가
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(params.id !== "new" ? params.id : null);
  
  // 프로젝트 관리 훅 사용
  const {
    selectedProjectId,
    projectName,
    userProjectRole,
    isProjectOwner,
    projectIdWarning,
    projectIdFixed,
    projectIdDebug,
    debugRef,
    forceSetProjectId,
    updateUrlWithProjectId,
    fetchProjectInfo,
    validateProjectId,
    getDefaultProject,
    createDefaultProject,
    getProjectIdFromUrl,
    setProjectName,
    setSelectedProjectId,
    setUserProjectRole,
    setIsProjectOwner,
    setProjectIdWarning,
    setProjectIdFixed
  } = useDocumentProject({ user, isNewDocument });

  // 협업 관련 훅 사용
  const {
    ydoc,
    provider,
    contentLoadedFromYjs,
    currentUser,
    connectedUsers,
    isReadOnlyMode,
    setIsReadOnlyMode,
    toggleReadOnlyMode,
    initializeProvider
  } = useCollaboration({
    documentId: savedDocumentId,
    user,
    userProjectRole,
    isProjectOwner
  });

  // 문서 데이터 관리 훅 사용
  const {
    documentData,
    title,
    setTitle,
    emoji,
    setEmoji,
    isStarred,
    setIsStarred,
    folder,
    setFolder,
    folderId,
    setFolderId,
    tags,
    setTags,
    isLoading,
    loadingError,
    isPasswordProtected,
    setIsPasswordProtected,
    documentPassword,
    setDocumentPassword,
    needsPasswordVerification,
    setNeedsPasswordVerification,
    isPasswordVerified,
    setIsPasswordVerified,
    refetchDocument,
    setDocumentData
  } = useDocumentData({
    documentId: savedDocumentId || params.id,
    isNewDocument,
    contentLoadedFromYjs,
    projectId,
    setIsReadOnlyMode
  });

  // 에디터 관련 훅 사용
  const {
    editor,
    showSlashMenu,
    setShowSlashMenu,
    slashMenuPosition,
    slashMenuRef,
    showTemplateMenu,
    setShowTemplateMenu,
    isCreatingTemplate,
    selectedTemplate,
    templates,
    showSummaryModal,
    setShowSummaryModal,
    documentSummary,
    isSummarizing,
    isUploadingImage,
    fileInputRef,
    applyBlockType,
    summarizeDocument,
    createDocumentTemplate,
    showTemplates,
    handleImageUpload,
    openFileDialog
  } = useDocumentEditor({
    ydoc,
    provider,
    currentUser,
    isReadOnlyMode,
    connectedUsers
  });

  // 자동저장 활성화 상태 관리
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // 저장 관련 훅 사용
  const {
    isSaving,
    setSaving,
    saveSuccess,
    setSaveSuccess,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    lastSaved,
    saveDocument,
    autoSave,
    autoSaveTimerRef
  } = useDocumentSave({
    title,
    editor,
    emoji,
    isStarred,
    folder,
    tags,
    selectedProjectId,
    savedDocumentId,
    setSavedDocumentId,
    folderId,
    autoSaveEnabled, // 자동저장 상태 전달
    provider,
    ydoc,
    isNewDocument,
    setIsNewDocument,
    isReadOnlyMode,
    initializeProvider
  });
  
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
        // 협업 커서 설정은 useDocumentEditor 훅으로 이동됨
        console.log('협업 커서 설정 완료:', userInfoWithRole);
      } catch (err) {
        console.error('협업 커서 설정 실패:', err);
      }
    }
  }, [editor, provider, currentUser, userProjectRole, isProjectOwner]);
  
  // 문서 저장
  // saveDocument 함수는 useDocumentSave 훅으로 이동됨

  
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
    if (!editor) return;
    
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

  // 커스텀 읽기 전용 모드 토글 함수 (디바운싱 및 저장 포함)
  const customToggleReadOnlyMode = () => {
    if (isButtonDebouncing) return;
    
    // 디바운싱 상태 활성화
    setIsButtonDebouncing(true);
    
    // 협업 훅의 토글 함수 호출
    toggleReadOnlyMode();
    
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

  const [showSecurityMenu, setShowSecurityMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  
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
      {/* 통합 사이드바 */}
      <Sidebar
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
        currentPage="documents"
        onSettingsClick={openSettingsModal}
      />

            {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#2a2a2c]">
      {/* 상단 네비게이션 바 */}
        <div className="bg-white dark:bg-[#2a2a2c] py-4 px-6">
          <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
              {/* 뒤로가기 버튼 */}
              <button
                onClick={() => router.push(currentProject?.id ? `/documents?projectId=${currentProject.id}` : '/documents')}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="문서 목록으로 돌아가기"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
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
              
              <SecurityDropdown 
                isOpen={showSecurityMenu}
                onClose={() => setShowSecurityMenu(false)}
                onAccessPermissions={() => {
                        // 문서 접근 권한 설정
                  console.log('접근 권한 설정');
                }}
                onPermissionHistory={() => {
                        // 문서 권한 이력
                  console.log('권한 이력 보기');
                }}
                onPasswordSettings={handleOpenPasswordModal}
                isPasswordProtected={isPasswordProtected}
              />
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

            
          </div>
        </div>
      </div>
        {/* 문서 편집 영역 */}
        <div className="flex-1 overflow-auto" id="editor-scroll-container">
      
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
              className="absolute bg-white dark:bg-[#1f1f21] shadow-lg rounded-lg border border-gray-200 dark:border-gray-700 max-h-[400px] overflow-auto w-[240px] z-50"
              style={{
                top: slashMenuPosition.y + 15,
                left: slashMenuPosition.x,
              }}
            >
              {/* 헤더 */}
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">/</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">블록 선택</span>
                </div>
              </div>
              
              {/* 메뉴 항목들 */}
              <div className="py-1">
                <button
                  onClick={() => applyBlockType('ai')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <SparklesIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span>문서 요약</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('paragraph')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <AlignLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span>본문</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('heading1')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">H1</span>
                  </div>
                  <span>제목 1</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('heading2')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">H2</span>
                  </div>
                  <span>제목 2</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('heading3')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">H3</span>
                  </div>
                  <span>제목 3</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('bulletList')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <ListIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span>글머리 기호</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('orderedList')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">1.</span>
                  </div>
                  <span>번호 매기기</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('taskList')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <CheckSquareIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span>할 일 목록</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('blockquote')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <QuoteIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span>인용</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('codeBlock')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <CodeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span>코드</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('image')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                  disabled={isUploadingImage}
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    {isUploadingImage ? (
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ImageIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </div>
                  <span>{isUploadingImage ? '업로드 중...' : '이미지'}</span>
                </button>
                
                <button
                  onClick={() => applyBlockType('template')}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-left text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-gray-800">
                    <FileTextIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span>문서 템플릿</span>
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
          
          {/* 숨겨진 파일 input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleImageUpload(file);
                // input 값 초기화 (같은 파일 다시 선택 가능하게)
                e.target.value = '';
              }
            }}
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
      
      {/* 설정 모달 */}
      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        tempSettings={tempSettings}
        onSettingsChange={setTempSettings}
        onSave={handleSaveSettings}
      />
      
      {/* 폴더 생성 모달 */}
      <FolderModal 
        isOpen={showFolderModal}
        onClose={() => {
                    setShowFolderModal(false);
                    setFolderModalName('');
                  }}
        folderName={folderModalName}
        onFolderNameChange={setFolderModalName}
        onCreateFolder={createFolderFromSidebar}
        isCreating={isFolderCreating}
      />
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