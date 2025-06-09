"use client";

import { useState, useRef, useEffect } from "react";

// 전역 상태 관리 (간단한 구현을 위해 전역 변수 사용)
let activeTaskId: string | null = null;
const listeners = new Set<() => void>();

// 상태 변경 알림 함수
function notifyListeners() {
  listeners.forEach((listener) => listener());
}

// 드래그 훅
interface UseDragProps {
  id: string;
}

export function useDrag({ id }: UseDragProps) {
  const [isDragging, setIsDragging] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const handleDragStart = (e: DragEvent) => {
      activeTaskId = id;
      setIsDragging(true);
      notifyListeners();
      
      // 드래그 이미지 설정 (투명하게)
      const img = new Image();
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      e.dataTransfer?.setDragImage(img, 0, 0);
    };

    const handleDragEnd = () => {
      activeTaskId = null;
      setIsDragging(false);
      notifyListeners();
    };

    node.draggable = true;
    node.addEventListener("dragstart", handleDragStart);
    node.addEventListener("dragend", handleDragEnd);

    return () => {
      node.removeEventListener("dragstart", handleDragStart);
      node.removeEventListener("dragend", handleDragEnd);
    };
  }, [id]);

  return {
    isDragging,
    setNodeRef: (node: HTMLDivElement) => {
      nodeRef.current = node;
    },
  };
}

// 드롭 훅
interface UseDropProps {
  onDrop: (taskId: string) => void;
}

export function useDrop({ onDrop }: UseDropProps) {
  const [isOver, setIsOver] = useState(false);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  // 드래그 상태 변경 감지
  useEffect(() => {
    const listener = () => {
      // 컴포넌트 리렌더링
      setIsOver((prev) => prev);
    };
    
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (!isOver) setIsOver(true);
    };

    const handleDragLeave = () => {
      setIsOver(false);
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      
      if (activeTaskId) {
        onDrop(activeTaskId);
      }
    };

    node.addEventListener("dragover", handleDragOver);
    node.addEventListener("dragleave", handleDragLeave);
    node.addEventListener("drop", handleDrop);

    return () => {
      node.removeEventListener("dragover", handleDragOver);
      node.removeEventListener("dragleave", handleDragLeave);
      node.removeEventListener("drop", handleDrop);
    };
    // @ts-ignore
  }, [onDrop]);

  return {
    isOver,
    setNodeRef: (node: HTMLDivElement) => {
      nodeRef.current = node;
    },
  };
} 