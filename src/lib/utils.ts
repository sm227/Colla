import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * HTML 태그를 제거하는 함수
 * @param html HTML 태그가 포함된 문자열
 * @returns HTML 태그가 제거된 순수 텍스트
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  
  try {
    // Node.js 환경 (서버 사이드)에서 실행
    const htmlEntities: Record<string, string> = {
      '&nbsp;': ' ',
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
    };
    
    // HTML 태그 제거
    let text = html.replace(/<[^>]*>/g, '');
    
    // HTML 엔티티 변환
    Object.entries(htmlEntities).forEach(([entity, char]) => {
      text = text.replace(new RegExp(entity, 'g'), char);
    });
    
    // 다른 HTML 엔티티 처리 (&#xxxx; 형식)
    text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
    
    return text;
  } catch (error) {
    console.error('HTML 태그 제거 중 오류:', error);
    // 오류 발생 시 간단한 정규식으로 태그만 제거
    return html.replace(/<[^>]*>|&[^;]+;/g, '');
  }
}
