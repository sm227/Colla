"use client";

import { useState, useEffect, useRef } from 'react';

interface DocumentData {
  id: string;
  title: string;
  content: string;
  emoji: string;
  isStarred: boolean;
  folder: string;
  folderId: string | null;
  tags: string[];
  projectId: string;
}

interface UseDocumentDataProps {
  documentId: string;
  isNewDocument: boolean;
  contentLoadedFromYjs: boolean;
  projectId?: string | null;
  setIsReadOnlyMode: (readOnly: boolean) => void;
}

interface UseDocumentDataReturn {
  // 문서 데이터
  documentData: DocumentData | null;
  title: string;
  setTitle: (title: string) => void;
  emoji: string;
  setEmoji: (emoji: string) => void;
  isStarred: boolean;
  setIsStarred: (starred: boolean) => void;
  folder: string;
  setFolder: (folder: string) => void;
  folderId: string | null;
  setFolderId: (folderId: string | null) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  
  // 로딩 상태
  isLoading: boolean;
  loadingError: string | null;
  
  // 보안 관련
  isPasswordProtected: boolean;
  setIsPasswordProtected: (isProtected: boolean) => void;
  documentPassword: string | null;
  setDocumentPassword: (password: string | null) => void;
  needsPasswordVerification: boolean;
  setNeedsPasswordVerification: (needs: boolean) => void;
  isPasswordVerified: boolean;
  setIsPasswordVerified: (verified: boolean) => void;
  
  // 프로젝트 관련
  projectName: string | null;
  setProjectName: (name: string | null) => void;
  
  // 함수
  refetchDocument: () => Promise<void>;
  setDocumentData: (data: DocumentData) => void;
}

export const useDocumentData = ({
  documentId,
  isNewDocument,
  contentLoadedFromYjs,
  projectId,
  setIsReadOnlyMode
}: UseDocumentDataProps): UseDocumentDataReturn => {
  
  // 문서 기본 상태
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [title, setTitle] = useState("제목 없음");
  const [emoji, setEmoji] = useState("📄");
  const [isStarred, setIsStarred] = useState(false);
  const [folder, setFolder] = useState("프로젝트 문서");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>(["문서"]);
  
  // 로딩 상태
  const [isLoading, setIsLoading] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  
  // 보안 관련 상태
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [documentPassword, setDocumentPassword] = useState<string | null>(null);
  const [needsPasswordVerification, setNeedsPasswordVerification] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  
  // 프로젝트 관련 상태
  const [projectName, setProjectName] = useState<string | null>(null);
  
  // 문서 데이터를 가져오는 함수
  const fetchDocument = async () => {
    if (isNewDocument || documentId === "new") {
      // 새 문서인 경우 기본값 설정
      setTitle("제목 없음");
      setEmoji("📄");
      setIsStarred(false);
      setFolder("프로젝트 문서");
      setFolderId(null);
      setTags(["문서"]);
      setIsPasswordProtected(false);
      setDocumentPassword(null);
      setNeedsPasswordVerification(false);
      setIsPasswordVerified(true);
      return;
    }
    
    // 로딩 상태 시작
    setIsLoading(true);
    setLoadingError(null);
    
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      
      if (!response.ok) {
        throw new Error('문서를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      
      // 문서 데이터 설정
      const newDocumentData: DocumentData = {
        id: data.id,
        title: data.title || '제목 없음',
        content: data.content || '',
        emoji: data.emoji || '📄',
        isStarred: data.isStarred || false,
        folder: data.folder || '기본 폴더',
        folderId: data.folderId || null,
        tags: data.tags ? JSON.parse(data.tags) : [],
        projectId: data.projectId || '',
      };
      
      setDocumentData(newDocumentData);

      // 상태 업데이트
      setTitle(data.title || "제목 없음");
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
      
      // 프로젝트 ID 설정
      setProjectName(projectIdToUse || null);
      
      // 로딩 완료
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      // 에러 발생 시 기본값 설정
      setTitle("문서를 불러올 수 없습니다");
      setEmoji("❌");
      
      setLoadingError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      setIsLoading(false);
    }
  };
  
  // 문서 데이터 재요청 함수
  const refetchDocument = async () => {
    await fetchDocument();
  };
  
  // 문서 ID가 변경되거나 초기 로딩 시 문서 데이터 가져오기
  useEffect(() => {
    fetchDocument();
  }, [documentId, isNewDocument, projectId]);
  
  // Y.js 컨텐츠가 로드되면 로딩 상태 해제
  useEffect(() => {
    if (contentLoadedFromYjs && isLoading) {
      console.log('Y.js에서 컨텐츠를 불러왔습니다.');
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  }, [contentLoadedFromYjs, isLoading]);
  
  return {
    // 문서 데이터
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
    
    // 로딩 상태
    isLoading,
    loadingError,
    
    // 보안 관련
    isPasswordProtected,
    setIsPasswordProtected,
    documentPassword,
    setDocumentPassword,
    needsPasswordVerification,
    setNeedsPasswordVerification,
    isPasswordVerified,
    setIsPasswordVerified,
    
    // 프로젝트 관련
    projectName,
    setProjectName,
    
    // 함수
    refetchDocument,
    setDocumentData
  };
}; 