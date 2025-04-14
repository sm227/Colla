"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat, Message } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, RefreshCw } from 'lucide-react';
import { useProject } from '@/app/contexts/ProjectContext';
import { useParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

// CSS 정의
const markdownStyles = `
  .markdown-message h1 { font-size: 1.6rem; font-weight: bold; margin: 0.7rem 0; border-bottom: 1px solid #eee; padding-bottom: 0.3rem; }
  .markdown-message h2 { font-size: 1.4rem; font-weight: bold; margin: 0.6rem 0; color: #2563eb; }
  .markdown-message h3 { font-size: 1.2rem; font-weight: bold; margin: 0.5rem 0; color: #4b5563; }
  .markdown-message ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
  .markdown-message ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
  .markdown-message li { margin: 0.25rem 0; }
  .markdown-message pre { background-color: #f3f4f6; padding: 0.75rem; border-radius: 0.25rem; overflow-x: auto; margin: 0.5rem 0; font-size: 0.9rem; }
  .markdown-message code { background-color: #f3f4f6; padding: 0.1rem 0.25rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.9rem; }
  .markdown-message blockquote { border-left: 4px solid #d1d5db; margin: 0.5rem 0; padding: 0.5rem 1rem; color: #4b5563; background-color: #f9fafb; }
  .markdown-message a { color: #2563eb; text-decoration: underline; }
  .markdown-message table { border-collapse: collapse; margin: 0.7rem 0; width: 100%; }
  .markdown-message th { border: 1px solid #d1d5db; padding: 0.5rem; background-color: #f3f4f6; text-align: left; font-weight: bold; }
  .markdown-message td { border: 1px solid #d1d5db; padding: 0.5rem; }
  .markdown-message p { margin: 0.5rem 0; line-height: 1.5; }
  .markdown-message hr { border: 0; border-top: 1px solid #e5e7eb; margin: 1rem 0; }
  .markdown-message img { max-width: 100%; border-radius: 0.25rem; }
  .markdown-message strong { font-weight: bold; color: #111827; }
  .markdown-message em { font-style: italic; }
`;

export function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const { messages, isLoading, error, sendMessage, clearChat } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { projects, currentProject } = useProject();
  const params = useParams();
  const [isTyping, setIsTyping] = useState(false);
  const [tempResponse, setTempResponse] = useState<string>("");

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat is opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Function to get current document ID
  const getCurrentDocumentId = () => {
    // URL 파싱
    if (params && params.id) {
      return params.id as string;
    }
    return null;
  };

  // Function to get current project ID
  const getCurrentProjectId = () => {
    // 1. URL에서 projectId 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const projectIdFromUrl = urlParams.get('projectId');
    
    if (projectIdFromUrl) {
      return projectIdFromUrl;
    }
    
    // 2. 현재 선택된 프로젝트 사용
    if (currentProject) {
      return currentProject.id;
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '') return;
    
    // Check if it's a summarize request
    if (input.trim() === "요약해줘") {
      await handleSummarizeRequest();
    } 
    // Check if it's a project info request
    else if (input.trim() === "프로젝트 정보" || 
             input.trim() === "내 프로젝트 보여줘" || 
             input.trim() === "내 프로젝트" ||
             input.trim() === "프로젝트 목록") {
      await handleProjectInfoRequest();
    }
    else {
      await sendMessage(input);
    }
    
    setInput('');
  };

  // 프로젝트 정보 가져오기
  const getProjectInfo = async (projectId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('프로젝트 정보를 가져오는데 실패했습니다.');
      }
      return await response.json();
    } catch (error) {
      console.error('프로젝트 정보 가져오기 오류:', error);
      return null;
    }
  };

  // 문서 정보 가져오기 
  const getDocumentInfo = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`);
      if (!response.ok) {
        throw new Error('문서 정보를 가져오는데 실패했습니다.');
      }
      return await response.json();
    } catch (error) {
      console.error('문서 정보 가져오기 오류:', error);
      return null;
    }
  };

  // Function to handle document summarization
  const handleSummarizeRequest = async () => {
    try {
      // Find the current editor
      const editorContent = document.querySelector('.ProseMirror');
      
      if (!editorContent) {
        await sendMessage("요약할 문서를 찾을 수 없습니다.");
        return;
      }
      
      // Get the document title
      const titleElement = document.querySelector('input.text-3xl.font-bold');
      const title = titleElement ? (titleElement as HTMLInputElement).value : "문서";
      
      // Get current document ID
      const documentId = getCurrentDocumentId();
      
      // Get current project information
      const projectId = getCurrentProjectId();
      let projectInfo = null;
      if (projectId) {
        projectInfo = await getProjectInfo(projectId);
      }
      
      // Get document information
      let documentInfo = null;
      if (documentId && documentId !== 'new') {
        documentInfo = await getDocumentInfo(documentId);
      }
      
      // Extract content from editor
      let content;
      
      try {
        // First try to get the text content (better for summarization)
        content = editorContent.textContent || "";
      } catch (e) {
        // Fallback to HTML
        content = editorContent.innerHTML;
      }
      
      // If content is too long, truncate it (Claude has token limits)
      if (content.length > 10000) {
        content = content.substring(0, 10000) + "...";
      }
      
      // Format message for summarization with context
      let summarizeMessage = `"${title}" 문서의 내용을 요약해주세요.\n\n`;
      
      // Add project context if available
      if (projectInfo) {
        summarizeMessage += `## 프로젝트 정보\n- 프로젝트 이름: ${projectInfo.name}\n`;
        if (projectInfo.description) {
          summarizeMessage += `- 프로젝트 설명: ${projectInfo.description}\n`;
        }
        summarizeMessage += '\n';
      }
      
      // Add document context if available
      if (documentInfo) {
        summarizeMessage += `## 문서 정보\n`;
        summarizeMessage += `- 제목: ${title}\n`;
        summarizeMessage += `- 생성일: ${new Date(documentInfo.createdAt).toLocaleDateString()}\n`;
        if (documentInfo.folder) {
          summarizeMessage += `- 폴더: ${documentInfo.folder}\n`;
        }
        if (documentInfo.tags) {
          const tags = JSON.parse(documentInfo.tags);
          if (Array.isArray(tags) && tags.length > 0) {
            summarizeMessage += `- 태그: ${tags.join(', ')}\n`;
          }
        }
        summarizeMessage += '\n';
      }
      
      // Add the actual content
      summarizeMessage += `## 문서 내용\n${content}\n\n`;
      
      // Add clear instructions for summarization
      summarizeMessage += `## 문서 내용 요약 요청\n\n이 문서 내용을 요약해주세요:\n1. 5-7개의 핵심 포인트로 요약해주세요\n2. 각 요점은 글머리 기호(-)로 시작하세요\n3. 마크다운 형식으로 작성해주세요\n4. 요약 내용만 제공하고 추가 설명이나 안내 메시지는 포함하지 마세요`;
      
      // Send to API
      await sendMessage("요약해줘");
      await sendMessage(summarizeMessage, true); // hidden request
    } catch (error) {
      console.error("문서 요약 중 오류 발생:", error);
      await sendMessage("문서 요약 중 오류가 발생했습니다.");
    }
  };

  // 프로젝트 정보 요청 처리
  const handleProjectInfoRequest = useCallback(async () => {
    try {
      // 프로젝트 정보 요청 메시지 포맷팅 (마크다운 형식)
      let projectInfoMessage = '';
      projectInfoMessage += `## 프로젝트 정보 요청\n\n`;
      projectInfoMessage += `프로젝트에 대한 다음 정보를 제공해주세요:\n`;
      projectInfoMessage += `1. 프로젝트 제목\n`;
      projectInfoMessage += `2. 프로젝트 목적\n`;
      projectInfoMessage += `3. 주요 기능\n`;
      projectInfoMessage += `4. 개발 기간\n`;
      projectInfoMessage += `5. 팀원 및 역할\n\n`;
      projectInfoMessage += `위 내용을 마크다운 형식으로 명확하게 작성해주세요.`;
      
      // 먼저 사용자 메시지 표시
      await sendMessage("프로젝트 정보");
      
      // 프로젝트 정보 가져오기
      if (projects.length === 0) {
        await sendMessage("현재 등록된 프로젝트가 없습니다.");
        return;
      }
      
      // 프로젝트 정보 포맷팅 (마크다운 형식)
      let projectInfo = "## 📊 프로젝트 목록\n\n";
      
      for (let i = 0; i < Math.min(projects.length, 5); i++) {
        const project = projects[i];
        projectInfo += `### ${i+1}. ${project.name}\n`;
        if (project.description) {
          projectInfo += `${project.description}\n\n`;
        }
        projectInfo += `- **생성일**: ${new Date(project.createdAt).toLocaleDateString()}\n`;
        projectInfo += `- **멤버**: ${project.members?.length || 0}명\n\n`;
      }
      
      if (projects.length > 5) {
        projectInfo += `*... 외 ${projects.length - 5}개 프로젝트가 있습니다.*\n\n`;
      }
      
      // 현재 프로젝트 정보 추가
      if (currentProject) {
        projectInfo += `## 🔍 현재 선택된 프로젝트: ${currentProject.name}\n\n`;
        
        // 현재 프로젝트의 태스크 가져오기
        try {
          const response = await fetch(`/api/projects/${currentProject.id}/tasks`);
          if (response.ok) {
            const tasks = await response.json();
            
            if (tasks.length > 0) {
              projectInfo += `### 📝 현재 프로젝트의 태스크 (${tasks.length}개)\n\n`;
              // 태스크 상태별 개수 계산
              const statusCount = tasks.reduce((acc: any, task: any) => {
                acc[task.status] = (acc[task.status] || 0) + 1;
                return acc;
              }, {});
              
              // 상태별 개수 표시
              projectInfo += "| 상태 | 개수 |\n|------|------|\n";
              Object.entries(statusCount).forEach(([status, count]) => {
                projectInfo += `| ${status} | ${count} |\n`;
              });
            } else {
              projectInfo += `현재 프로젝트에는 태스크가 없습니다.\n`;
            }
          }
        } catch (error) {
          console.error("태스크 정보 가져오기 오류:", error);
        }
      }
      
      // 응답 전송
      await sendMessage(projectInfoMessage, true); // 숨겨진 요청
      await sendMessage(projectInfo);
    } catch (error) {
      console.error("프로젝트 정보 처리 중 오류 발생:", error);
      await sendMessage("프로젝트 정보를 가져오는데 오류가 발생했습니다.");
    }
  }, [projects, currentProject, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-80 md:w-96 bg-white rounded-lg shadow-xl flex flex-col border border-gray-200 z-50 max-h-[80vh]">
      {/* CSS 스타일 적용 */}
      <style>{markdownStyles}</style>
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h3 className="font-medium text-gray-700">AI Assistant</h3>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={clearChat}
            className="h-8 w-8"
            title="Clear chat"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 my-8">
            <p className="mb-2">How can I help you today?</p>
            <p className="text-xs text-blue-500 mb-2">💡 Tip: 문서를 요약하려면 "요약해줘"라고 입력하세요</p>
            <p className="text-xs text-blue-500">💡 프로젝트 정보, 문서, 태스크에 대해 질문할 수 있습니다</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-center py-2">
            <div className="animate-pulse flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm">
            Error: {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3">
        <div className="relative">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="resize-none pr-10 min-h-[60px] max-h-32"
            rows={1}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || input.trim() === ''}
            className="absolute right-2 bottom-2 h-8 w-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  
  // 타이핑 효과
  useEffect(() => {
    // 사용자 메시지는 즉시 표시
    if (isUser) {
      setDisplayedContent(message.content);
      return;
    }
    
    // 어시스턴트 메시지는 타이핑 효과 적용
    setIsTyping(true);
    
    // 스트리밍 효과를 위한 함수
    const totalLength = message.content.length;
    let currentLength = 0;
    const typingSpeed = Math.max(10, Math.min(30, 1000 / totalLength)); // 메시지 길이에 따라 속도 조절
    
    const typingInterval = setInterval(() => {
      if (currentLength < totalLength) {
        // 한 번에 일정 개수의 문자를 추가 (더 자연스러운 효과를 위해)
        const increment = Math.max(1, Math.floor(totalLength / 50));
        currentLength = Math.min(currentLength + increment, totalLength);
        setDisplayedContent(message.content.substring(0, currentLength));
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
      }
    }, typingSpeed);
    
    return () => clearInterval(typingInterval);
  }, [message.content, isUser]);
  
  // 새 메시지가 입력될 때 스크롤 자동 조정
  useEffect(() => {
    if (messageRef.current && !isUser && isTyping) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedContent, isUser, isTyping]);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        ref={messageRef}
        className={`
          max-w-[80%] rounded-lg p-3 break-words
          ${isUser 
            ? 'bg-blue-500 text-white rounded-br-none' 
            : 'bg-gray-100 text-gray-800 rounded-bl-none'}
        `}
      >
        {isUser ? (
          displayedContent
        ) : (
          <div className="markdown-message">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {displayedContent}
            </ReactMarkdown>
            {isTyping && (
              <span className="inline-block ml-1 text-gray-600 animate-pulse">▌</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 