"use client";

import { useEffect, useRef } from 'react';

interface UseDeadlineCheckerOptions {
  enabled?: boolean;
  intervalMinutes?: number; // 체크 간격 (분 단위)
}

export function useDeadlineChecker(options: UseDeadlineCheckerOptions = {}) {
  const {
    enabled = true,
    intervalMinutes = 60, // 기본값: 1시간마다 체크
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckRef = useRef<Date | null>(null);

  const checkDeadlines = async () => {
    try {
      console.log('마감일 체크 시작...');

      const response = await fetch('/api/tasks/check-deadlines', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        console.log('마감일 체크 완료:', data.message);
        lastCheckRef.current = new Date();
      } else {
        console.error('마감일 체크 실패:', data.error);
      }
    } catch (error) {
      console.error('마감일 체크 중 오류:', error);
    }
  };

  useEffect(() => {
    if (!enabled) {
      // 비활성화된 경우 기존 interval 정리
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // 초기 체크 (페이지 로드 시)
    const shouldCheckOnMount = !lastCheckRef.current ||
      (new Date().getTime() - lastCheckRef.current.getTime()) > intervalMinutes * 60 * 1000;

    if (shouldCheckOnMount) {
      checkDeadlines();
    }

    // 주기적 체크 설정
    intervalRef.current = setInterval(() => {
      checkDeadlines();
    }, intervalMinutes * 60 * 1000);

    // 클린업
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMinutes]);

  // 수동으로 체크할 수 있는 함수 반환
  return {
    checkNow: checkDeadlines,
    lastCheck: lastCheckRef.current,
  };
}
