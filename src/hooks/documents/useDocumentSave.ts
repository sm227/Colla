"use client";

import { useCallback, useRef, useEffect, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Editor } from '@tiptap/react';

interface UseDocumentSaveProps {
  title: string;
  editor: Editor | null;
  emoji: string;
  isStarred: boolean;
  folder: string;
  tags: string[];
  selectedProjectId: string | null;
  savedDocumentId: string | null;
  setSavedDocumentId: (id: string | null) => void;
  folderId: string | null;
  autoSaveEnabled: boolean;
  provider: HocuspocusProvider | null;
  ydoc: Y.Doc;
  isNewDocument: boolean;
  setIsNewDocument: (isNew: boolean) => void;
  isReadOnlyMode: boolean;
  initializeProvider: (documentId: string) => void;
}

interface UseDocumentSaveReturn {
  // 상태
  isSaving: boolean;
  setSaving: (saving: boolean) => void;
  saveSuccess: boolean;
  setSaveSuccess: (success: boolean) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  lastSaved: Date | null;
  
  // 함수
  saveDocument: () => Promise<void>;
  autoSave: () => Promise<void>;
  
  // 타이머 관리
  autoSaveTimerRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

export const useDocumentSave = ({
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
  autoSaveEnabled,
  provider,
  ydoc,
  isNewDocument,
  setIsNewDocument,
  isReadOnlyMode,
  initializeProvider
}: UseDocumentSaveProps): UseDocumentSaveReturn => {
  
  // 상태 관리
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // 타이머 관리
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debugRef = useRef<any>({});
  
  // 자동 저장 함수
  const autoSave = useCallback(async () => {
    if (!autoSaveEnabled || !selectedProjectId || !title.trim()) {
      console.log("자동 저장 조건 미충족:", { autoSaveEnabled, selectedProjectId, title: title.trim() });
      return;
    }
    
    if (isSaving) {
      console.log("이미 저장 중이므로 자동 저장 건너뜀");
      return;
    }
    
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      
      console.log("자동 저장 시작...");
      
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
      
      if (!finalProjectId) {
        console.log("자동 저장 실패: 프로젝트 ID 없음");
        return;
      }
      
      // 에디터 내용 가져오기
      const content = editor ? editor.getHTML() : '';
      
      // 빈 제목은 "제목 없음"으로 설정
      const documentTitle = title.trim() || "제목 없음";
      
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
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      
    } catch (error) {
      console.error('자동 저장 중 오류:', error);
      setSaveSuccess(false);
    } finally {
      setIsSaving(false);
    }
  }, [title, editor, emoji, isStarred, folder, tags, selectedProjectId, savedDocumentId, folderId, autoSaveEnabled, provider, ydoc, isNewDocument, setIsNewDocument, setSavedDocumentId, initializeProvider, isSaving]);
  
  // 수동 저장 함수
  const saveDocument = useCallback(async () => {
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
      
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setLastSaved(new Date());
      
    } catch (error) {
      alert(error instanceof Error ? error.message : '문서 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [title, editor, emoji, isStarred, folder, tags, selectedProjectId, savedDocumentId, folderId, isReadOnlyMode, setSavedDocumentId, setIsNewDocument]);
  
  // setSaving 헬퍼 함수
  const setSaving = useCallback((saving: boolean) => {
    setIsSaving(saving);
  }, []);
  
  return {
    // 상태
    isSaving,
    setSaving,
    saveSuccess,
    setSaveSuccess,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    lastSaved,
    
    // 함수
    saveDocument,
    autoSave,
    
    // 타이머 관리
    autoSaveTimerRef
  };
}; 