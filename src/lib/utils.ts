import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * HTML 태그를 제거하는 유틸리티 함수
 * @param html HTML 문자열
 * @returns HTML 태그가 제거된 일반 텍스트
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '');
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷팅하는 함수
 * @param date Date 객체 또는 문자열
 * @returns YYYY-MM-DD 형식의 문자열
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * 시간을 HH:MM 형식으로 포맷팅하는 함수
 * @param date Date 객체 또는 문자열
 * @returns HH:MM 형식의 문자열
 */
export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환하는 함수
 * @param bytes 바이트 단위의 파일 크기
 * @returns 사람이 읽기 쉬운 형식의 파일 크기 (예: 1.5 KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 객체의 깊은 복사본을 생성하는 함수
 * @param obj 복사할 객체
 * @returns 원본 객체의 깊은 복사본
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// TipTap 콘텐츠 처리 함수
export const processTiptapContent = (content: string | object): string => {
  if (typeof content === 'string') {
    return content;
  }
  
  if (typeof content === 'object' && content !== null) {
    try {
      // TipTap JSON 구조에서 텍스트 추출
      const extractTextFromTipTapContent = (node: any): string => {
        if (!node) return '';
        
        if (typeof node === 'string') return node;
        
        if (node.type === 'text' && node.text) {
          return node.text;
        }
        
        if (node.content && Array.isArray(node.content)) {
          return node.content.map(extractTextFromTipTapContent).join('');
        }
        
        if (node.text) {
          return node.text;
        }
        
        return '';
      };
      
      return extractTextFromTipTapContent(content);
    } catch (error) {
      console.error('TipTap 콘텐츠 처리 중 오류:', error);
      return '';
    }
  }
  
  return '';
};

// HTML 태그 제거 함수
export const removeHtmlTags = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
};

// 안전한 description 렌더링을 위한 함수
export const getSafeDescription = (description: string | object | null | undefined): string => {
  if (!description) return '';
  
  if (typeof description === 'string') {
    // HTML 태그가 포함된 문자열인 경우 제거
    return removeHtmlTags(description);
  }
  
  // 객체인 경우 TipTap 콘텐츠로 처리
  return processTiptapContent(description);
};
