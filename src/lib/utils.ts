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
