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
import { useUsers } from '@/app/contexts/UserContext';
// import { useAtom } from 'jotai';
// import { isChatOpen } from '@/app/atoms/isChatOpen';

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

// ThinkingBubble 컴포넌트 추가 - 더 큰 크기로 수정
function ThinkingBubble() {
  return (
    <div className="flex justify-start py-2">
      <div className="bg-gray-100 rounded-lg p-3 rounded-bl-none max-w-[80%]">
        <div className="flex items-center">
          <span className="text-gray-700 font-medium">생각중</span>
          <span className="thinking-dots ml-1">
            <span className="dot text-lg">.</span>
            <span className="dot text-lg">.</span>
            <span className="dot text-lg">.</span>
          </span>
        </div>
      </div>
      <style jsx>{`
        .thinking-dots .dot {
          display: inline-block;
          animation: blink-bounce 1.4s infinite;
          font-weight: bold;
        }
        
        .dot:nth-child(1) {
          animation-delay: 0s;
        }
        
        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes blink-bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
          60% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}

export function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const { messages, isLoading, error, sendMessage, addAssistantMessage, addUserMessage, clearChat } = useChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { projects, currentProject } = useProject();
  const { getUserName } = useUsers();
  const params = useParams();
  const [isTyping, setIsTyping] = useState(false);
  const [tempResponse, setTempResponse] = useState<string>("");
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 현재 진행 중인 API 요청을 취소하기 위한 AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  // useChat의 내부 상태에 접근하기 위한 변수 추가
  const chatStateRef = useRef<any>(null);

  // 일정 상태별 응답 템플릿
  const taskStatusResponses = {
    todo: [
      "## 📋 아직 시작되지 않은 할 일 목록\n\n{taskDetails}",
      "## 🔜 예정된 작업 목록\n\n{taskDetails}",
      "## 🗒️ 할 일로 등록된 작업\n\n{taskDetails}",
      "## 🚩 대기 중인 일정들이에요\n\n{taskDetails}",
      "## 📌 아직 시작하지 않은 작업들\n\n{taskDetails}"
    ],
    in_progress: [
      "## 🚧 현재 진행 중인 일정\n\n{taskDetails}",
      "## ⚙️ 작업 중인 태스크 목록\n\n{taskDetails}",
      "## 🔄 진행 상태의 일정들\n\n{taskDetails}",
      "## 📊 현재 작업 중인 태스크\n\n{taskDetails}",
      "## 🏗️ 진행 중인 프로젝트 작업\n\n{taskDetails}"
    ],
    review: [
      "## 🔍 검토 중인 일정 목록\n\n{taskDetails}",
      "## 👀 리뷰가 필요한 작업들\n\n{taskDetails}",
      "## 📝 검토 단계의 태스크\n\n{taskDetails}",
      "## 📑 검토 진행 중인 태스크\n\n{taskDetails}",
      "## 🧐 현재 검토 상태인 일정\n\n{taskDetails}"
    ],
    done: [
      "## ✅ 완료된 일정 목록\n\n{taskDetails}",
      "## 🏆 성공적으로 마무리된 작업\n\n{taskDetails}",
      "## 🎯 목표 달성한 태스크들\n\n{taskDetails}",
      "## 📦 완료 처리된 작업 목록\n\n{taskDetails}",
      "## 🎊 마무리된 프로젝트 작업\n\n{taskDetails}"
    ],
    general: [
      "## 📅 일정 정보\n\n{taskDetails}",
      "## 🗓️ 작업 일정 목록\n\n{taskDetails}",
      "## 📋 태스크 정보\n\n{taskDetails}",
      "## 📊 프로젝트 작업 현황\n\n{taskDetails}",
      "## 📌 일정 목록이에요\n\n{taskDetails}"
    ],
    noTasks: [
      "현재 등록된 일정이 없습니다. 새로운 일정을 추가해보세요!",
      "아직 일정이 없네요. 새 일정을 만들어볼까요?",
      "표시할 일정이 없습니다. 칸반보드에서 새 태스크를 추가해 보세요.",
      "일정 목록이 비어 있습니다. 새 작업을 시작해 보세요!",
      "등록된 일정을 찾을 수 없네요. 작업을 추가하시겠어요?"
    ],
    noMatchingTasks: [
      "\"{searchTerm}\" 일정이 존재하지 않습니다. 다른 일정명으로 다시 시도해 주세요.",
      "\"{searchTerm}\" 관련 일정을 찾을 수 없습니다. 다른 키워드로 검색해보세요.",
      "\"{searchTerm}\"에 해당하는 일정이 없네요. 정확한 일정명을 입력해 주세요.",
      "죄송해요, \"{searchTerm}\" 일정을 찾지 못했어요. 다른 이름으로 찾아볼까요?",
      "\"{searchTerm}\" 일정은 현재 없는 것 같아요. 다른 키워드로 시도해 보세요."
    ]
  };
  
  // 담당자 관련 응답 템플릿
  const assigneeResponses = {
    singleTask: [
      "**{taskTitle}** 일정의 담당자는 **{assigneeName}**입니다.",
      "**{assigneeName}**님이 **{taskTitle}** 일정을 담당하고 있습니다.",
      "**{taskTitle}** 작업은 **{assigneeName}**님이 맡고 계십니다.",
      "**{assigneeName}**님께서 **{taskTitle}** 일정을 진행 중입니다.",
      "**{taskTitle}** 태스크의 담당자는 **{assigneeName}**님이에요."
    ],
    noAssignee: [
      "**{taskTitle}** 일정에는 지정된 담당자가 없습니다.",
      "**{taskTitle}** 작업은 현재 담당자가 배정되지 않았습니다.",
      "**{taskTitle}** 태스크에는 아직, 담당자가 지정되지 않았네요.",
      "**{taskTitle}** 일정의 담당자가 설정되어 있지 않습니다.",
      "**{taskTitle}** 작업에 담당자 정보가 없습니다. 담당자를 지정해보세요."
    ],
    multipleAssignees: [
      "## 👥 담당자 정보\n\n{assigneeList}",
      "## 👤 일정별 담당자 목록\n\n{assigneeList}",
      "## 📋 태스크 담당자 정보\n\n{assigneeList}",
      "## 🧑‍💼 작업별 담당자 현황\n\n{assigneeList}",
      "## 👨‍💻 담당자 배정 현황\n\n{assigneeList}"
    ],
    noTasks: [
      "조회할 수 있는 일정이 없어 담당자 정보를 확인할 수 없습니다.",
      "담당자 정보를 조회할 일정이 존재하지 않습니다.",
      "등록된 일정이 없어 담당자 정보를 볼 수 없습니다.",
      "담당자를 확인할 일정이 아직 없네요. 일정을 먼저 추가해보세요.",
      "담당자 정보를 표시할 일정이 없습니다. 새 일정을 만들어보세요."
    ]
  };
  
  // 마감일 관련 응답 템플릿
  const dueDateResponses = {
    singleTask: [
      "**{taskTitle}** 일정의 마감일은 **{dueDate}**입니다.",
      "**{taskTitle}** 작업은 **{dueDate}**까지 완료해야 합니다.",
      "**{taskTitle}** 일정의 기한은 **{dueDate}**입니다.",
      "**{taskTitle}** 태스크는 **{dueDate}**이 마감일이에요.",
      "**{taskTitle}** 작업의 데드라인은 **{dueDate}**까지입니다."
    ],
    noDueDate: [
      "**{taskTitle}** 일정에는 설정된 마감일이 없습니다.",
      "**{taskTitle}** 작업은 마감일이 지정되어 있지 않습니다.",
      "**{taskTitle}** 태스크에 마감일이 설정되지 않았네요.",
      "**{taskTitle}** 일정의 마감일이 없습니다. 마감일을 추가해보세요.",
      "**{taskTitle}** 작업은 현재 마감일 없이 진행 중입니다."
    ],
    multipleDueDates: [
      "## 📅 일정 마감일 정보\n\n{dueDateList}",
      "## ⏱️ 작업별 마감일 목록\n\n{dueDateList}",
      "## 🗓️ 태스크 기한 정보\n\n{dueDateList}",
      "## 📆 일정 데드라인 목록\n\n{dueDateList}",
      "## ⏰ 마감 예정 일정들\n\n{dueDateList}"
    ],
    noTasks: [
      "마감일을 확인할 일정이 없습니다.",
      "마감일 정보를 조회할 일정이 존재하지 않네요.",
      "등록된 일정이 없어 마감일을 볼 수 없습니다.",
      "마감일을 표시할 일정이 아직 없습니다. 일정을 먼저 추가해보세요.",
      "마감일 정보를 확인할 일정이 없습니다. 새 일정을 만들어보세요."
    ]
  };
  
  // 랜덤 응답 생성 함수
  const getRandomResponse = (responses: string[], context?: Record<string, any>) => {
    const randomIndex = Math.floor(Math.random() * responses.length);
    let response = responses[randomIndex];
    
    // 컨텍스트가 있으면 응답에 대체
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        response = response.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      });
    }
    
    return response;
  };

  // Utility function to scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: 'end' });
    }
  }, []);

  // 챗봇 닫기 핸들러 - 응답 생성 중단 및 상태 초기화
  const handleClose = useCallback(() => {
    // 진행 중인 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // 로딩 상태 제거
    setLoading(false);
    
    // 사용자에게 챗봇 닫힘을 알립니다
    onClose();
    
    // 다시 열 때 새로운 상태로 시작하도록 약간의 지연 후 상태 초기화
    setTimeout(() => {
      clearChat();
    }, 300);
  }, [onClose, clearChat]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages, scrollToBottom]);

  // Focus input when chat is opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      scrollToBottom();
    }
  }, [isOpen, scrollToBottom]);

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

  // 자연어 질문에서 프로젝트 관련 의도 감지 함수
  const detectProjectIntent = useCallback((message: string) => {
    // 칸반보드 관련 키워드가 포함된 경우 일정 관련 질문으로 인식하지 않도록 합니다.
    if (message.includes('칸반') || 
        message.includes('칸반보드') || 
        message.includes('kanban') ||
        message.includes('할 일') ||
        message.includes('투두')) {
      return false;
    }
    
    // 명시적인 프로젝트 정보 요청 키워드
    const directProjectKeywords = [
      '프로젝트 정보', '내 프로젝트 보여줘', '내 프로젝트', '프로젝트 목록', 
      '프로젝트 상태', '프로젝트 현황', '진행중인 프로젝트'
    ];
    
    // 특정 프로젝트 정보 질문 패턴
    const projectQuestionPatterns = [
      /프로젝트.*태스크/i, /태스크.*몇/i, /몇.*태스크/i,
      /프로젝트.*정보/i, /프로젝트.*상태/i, /프로젝트.*진행/i,
      /작업.*현황/i, /할일.*목록/i, /태스크.*목록/i,
      /프로젝트.*멤버/i, /누가.*참여/i, /참여자/i,
      /언제.*생성/i, /언제.*만들/i, /생성.*날짜/i
    ];
    
    // 명시적 키워드 체크
    for (const keyword of directProjectKeywords) {
      if (message.includes(keyword)) {
        return true;
      }
    }
    
    // 패턴 매칭 체크
    for (const pattern of projectQuestionPatterns) {
      if (pattern.test(message)) {
        return true;
      }
    }
    
    return false;
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '' || isSubmitting || isLoading) return;
    
    try {
      setIsSubmitting(true);
      
      const userContent = input.trim();
      setInput('');
      
      // 사용자 메시지 복사본 저장
      const copyOfUserContent = userContent;
      
      // 일정 관련 질문인지 확인
      const isTaskQuery = userContent.includes('새로 추가된 일정') || 
                          userContent.includes('새 일정') || 
                          userContent.includes('새로운 일정') ||
                          userContent.includes('최근 일정') ||
                          userContent.includes('최근 추가된 일정') ||
                          userContent.includes('새로 생긴 일정') ||
                          userContent.includes('일정 있어') ||
                          userContent.includes('일정 있나') ||
                          userContent.includes('일정 추가됐어') ||
                          userContent.includes('일정 생겼어') ||
                          userContent.includes('일정 알려') ||
                          userContent.includes('일정 좀') ||
                          userContent.includes('일정 보여') ||
                          userContent.includes('일정 확인') ||
                          userContent.includes('현재 일정') ||
                          userContent.includes('칸반') ||
                          userContent.includes('칸반보드') ||
                          userContent.includes('kanban') ||
                          userContent.includes('할 일') ||
                          userContent.includes('할일') ||
                          userContent.includes('투두');

      // 마감일 관련 질문 패턴 별도 추가
      const isDueDateQuery = userContent.includes('마감일') || 
                             userContent.includes('기한') || 
                             userContent.includes('데드라인') ||
                             userContent.includes('언제까지') ||
                             userContent.includes('일정 마감') ||
                             userContent.includes('마감 날짜');
                             
      // 특정 일정명 검색 질문 여부 (주간 회의, 월간 회의 등의 특정 일정을 검색하는 경우)
      const specificTaskKeywords = ['회의', '미팅', '프로젝트', '팀', '주간', '월간', '디자인'];
      const isSpecificTaskQuery = specificTaskKeywords.some(keyword => userContent.includes(keyword));

      // 상태별 일정 검색 패턴
      const statusKeywords = [
        '할 일', '예정', '대기', '진행', '진행중', '작업중', '검토', '리뷰', '완료', '끝', '종료', '마침', 
        '미완료', '지난', '지난 일정', '완료된', '완료된 일정', '리뷰된', '검토된'
      ];
      
      // 어떤 상태를 필터링해야 하는지 결정
      let statusFilter = '';
      
      // 상태별 키워드 매핑
      const statusMap: { [key: string]: string[] } = {
        'todo': ['할 일', '예정', '대기', '미완료'],
        'in_progress': ['진행', '진행중', '작업중'],
        'review': ['검토', '리뷰'],
        'done': ['완료', '끝', '종료', '마침', '완료된', '완료된 일정', '지난', '지난 일정', '리뷰된', '검토된']
      };
      
      // 어떤 상태를 필터링해야 하는지 결정
      for (const [status, keywords] of Object.entries(statusMap)) {
        if (keywords.some(keyword => userContent.includes(keyword))) {
          statusFilter = status;
          break;
        }
      }
      
      const isStatusQuery = userContent && 
        statusKeywords.some(keyword => userContent.includes(keyword));

      // 담당자 관련 질문 여부 (담당자가 누구인지, 담당자 정보 등)
      const assigneeKeywords = ['담당자', '담당', '맡은 사람', '책임자', '누가 맡', '누구 담당', '누가 담당'];
      const isAssigneeQuery = assigneeKeywords.some(keyword => userContent.includes(keyword));

      // Check if it's a summarize request
      if (userContent === "요약해줘") {
        // 요약 작업 전에 사용자 메시지 추가
        addUserMessage(copyOfUserContent);
        
        // 요약 처리
        await handleSummarizeRequest();
      } 
      // 일정 관련 질문인 경우
      else if (isTaskQuery || isDueDateQuery || isSpecificTaskQuery || isStatusQuery || isAssigneeQuery) {
        // 일정 관련 질문인 경우 사용자 메시지 추가
        addUserMessage(copyOfUserContent);
        
        // 로딩 표시 시작
        setLoading(true);
        
        try {
          // 현재 프로젝트 ID 가져오기
          const projectId = getCurrentProjectId();
          let recentTasksData = [];
          
          if (projectId) {
            // 현재 프로젝트의 태스크 가져오기
            const tasksResponse = await fetch(`/api/projects/${projectId}/tasks`);
            if (tasksResponse.ok) {
              const allTasks = await tasksResponse.json();
              // 생성일 기준으로 정렬 (최신순)
              recentTasksData = allTasks
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
          } else {
            // 모든 프로젝트의 태스크 가져오기
            const tasksResponse = await fetch(`/api/tasks`);
            if (tasksResponse.ok) {
              const allTasks = await tasksResponse.json();
              // 생성일 기준으로 정렬 (최신순)
              recentTasksData = allTasks
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            }
          }
          
          // 상태별 일정 필터링
          if (isStatusQuery) {
            let matchingTasks: any[] = [];
            
            // 상태에 따른 필터링
            if (statusFilter) {
              matchingTasks = recentTasksData.filter((task: any) => {
                const taskStatus = task.status.toLowerCase();
                
                if (statusFilter === 'todo' && (taskStatus === 'todo' || taskStatus === 'to do' || taskStatus === 'backlog')) {
                  return true;
                } else if (statusFilter === 'in_progress' && (taskStatus === 'in progress' || taskStatus === 'in_progress' || taskStatus === 'doing')) {
                  return true;
                } else if (statusFilter === 'review' && (taskStatus === 'review' || taskStatus === 'in review')) {
                  return true;
                } else if (statusFilter === 'done' && (taskStatus === 'done' || taskStatus === 'completed' || taskStatus === 'finish' || taskStatus === 'finished')) {
                  return true;
                }
                
                return false;
              });
            }
            
            // 매칭된 일정이 있으면 적용
            if (matchingTasks.length > 0) {
              recentTasksData = matchingTasks;
            } else {
              // 해당 상태의 일정이 없는 경우 메시지 표시 후 종료
              const statusName = statusFilter === 'todo' ? '할 일' : 
                                statusFilter === 'in_progress' ? '진행 중인' : 
                                statusFilter === 'review' ? '검토 중인' :
                                statusFilter === 'done' ? '완료된' : '해당';
                                
              addAssistantMessage(`${statusName} 상태의 일정이 존재하지 않습니다.`);
              setLoading(false);
              return;
            }
          }
          
          // 특정 일정명 검색인 경우, 일정 필터링
          if (isSpecificTaskQuery) {
            // 가능한 일정 제목 목록 정의
            const possibleTaskTitles = [
              '주간 회의', '월간 회의', '디자인 팀 회의', '주간 팀 회의', 
              '프로젝트 마감일', '클라이언트 미팅', '팀 미팅'
            ];
            
            // 사용자 질문에서 키워드 추출
            let queryKeywords = userContent.toLowerCase();
            for (const stopWord of ['일정', '알려줘', '있어', '뭐야', '언제', '정보', '있나요', '있나', '은', '는', '이', '가', '좀', '에']) {
              queryKeywords = queryKeywords.replace(stopWord, ' ');
            }
            queryKeywords = queryKeywords.trim();
            
            // 사용자 질문에서 일정명 확인
            let matchingTasks = [];
            let searchedTitle = ""; // 사용자가 검색한 일정명 저장
            
            // 정확한 일정명 매칭 시도
            for (const taskTitle of possibleTaskTitles) {
              if (userContent.includes(taskTitle)) {
                searchedTitle = taskTitle;
                // 해당 일정명을 포함하는 태스크만 필터링
                const matchedTasks = recentTasksData.filter((task: any) => 
                  task.title && task.title.includes(taskTitle)
                );
                if (matchedTasks.length > 0) {
                  matchingTasks = matchedTasks;
                  break;
                }
              }
            }
            
            // 정확한 일정명 매칭 실패 시 키워드로 검색
            if (matchingTasks.length === 0) {
              for (const keyword of specificTaskKeywords) {
                if (userContent.includes(keyword)) {
                  // 검색한 키워드 저장
                  if (!searchedTitle) searchedTitle = keyword;
                  
                  const matchedTasks = recentTasksData.filter((task: any) => 
                    task.title && task.title.toLowerCase().includes(keyword.toLowerCase())
                  );
                  if (matchedTasks.length > 0) {
                    matchingTasks = matchedTasks;
                    break;
                  }
                }
              }
              
              // 사용자 질문에서 추출한 키워드로 한번 더 검색 시도
              if (matchingTasks.length === 0 && queryKeywords) {
                // 검색한 키워드 저장
                if (!searchedTitle) searchedTitle = queryKeywords;
                
                const words = queryKeywords.split(/\s+/);
                const filteredWords = words.filter(word => word.length > 1); // 1글자 이하 단어 제외
                
                if (filteredWords.length > 0) {
                  for (const word of filteredWords) {
                    const matchedTasks = recentTasksData.filter((task: any) => 
                      task.title && task.title.toLowerCase().includes(word.toLowerCase())
                    );
                    if (matchedTasks.length > 0) {
                      matchingTasks = matchedTasks;
                      break;
                    }
                  }
                }
              }
            }
            
            // 필터링된 결과가 있으면 적용
            if (matchingTasks.length > 0) {
              recentTasksData = matchingTasks;
            } else {
              // 일치하는 일정이 없는 경우 메시지 표시 후 종료
              if (searchedTitle) {
                addAssistantMessage(`"${searchedTitle}" 일정이 존재하지 않아 담당자 정보를 확인할 수 없습니다.`);
              } else {
                addAssistantMessage("검색하신 일정이 존재하지 않아 담당자 정보를 확인할 수 없습니다.");
              }
              setLoading(false);
              return;
            }
          } else {
            // 일반 일정 질문은 최대 5개만 표시
            recentTasksData = recentTasksData.slice(0, 5);
          }
          
          // 최신 일정이 없는 경우
          if (recentTasksData.length === 0) {
            addAssistantMessage(getRandomResponse(taskStatusResponses.noTasks));
            setLoading(false);
            return;
          }
          
          // 직접 마크다운 응답 생성 (AI 호출 없이)
          let markdownResponse = '';
          
          // 담당자 관련 질문인 경우
          if (isAssigneeQuery) {
            markdownResponse = `## 👤 일정 담당자 정보\n\n`;
            
            // 특정 상태를 지정한 경우 해당 상태의 일정만 필터링
            if (isStatusQuery) {
              const statusFilteredTasks = recentTasksData.filter((task: any) => 
                task.status && task.status.toLowerCase() === statusFilter.toLowerCase()
              );
              
              if (statusFilteredTasks.length > 0) {
                recentTasksData = statusFilteredTasks;
              } else {
                // 해당 상태의 일정이 없는 경우 메시지 표시
                const statusName = statusFilter === 'todo' ? '할 일' : 
                                statusFilter === 'in_progress' ? '진행 중인' : 
                                statusFilter === 'review' ? '검토 중인' :
                                statusFilter === 'done' ? '완료된' : '해당';
                addAssistantMessage(`${statusName} 상태의 일정이 존재하지 않아 담당자 정보를 확인할 수 없습니다.`);
                setLoading(false);
                return;
              }
            }
            
            // 특정 일정명을 지정한 경우 해당 일정만 필터링
            if (isSpecificTaskQuery) {
              // 사용자 질문에서 키워드 추출
              let queryKeywords = userContent.toLowerCase();
              for (const stopWord of ['담당자', '담당', '맡은 사람', '책임자', '누가 맡', '누구 담당', '누가 담당', '일정', '알려줘', '있어', '뭐야', '언제', '정보', '있나요', '있나', '은', '는', '이', '가', '좀', '에']) {
                queryKeywords = queryKeywords.replace(stopWord, ' ');
              }
              queryKeywords = queryKeywords.trim();
              
              const possibleTaskTitles = [
                '주간 회의', '월간 회의', '디자인 팀 회의', '주간 팀 회의', 
                '프로젝트 마감일', '클라이언트 미팅', '팀 미팅'
              ];
              
              let matchingTasks: any[] = [];
              let searchedTitle = ""; // 사용자가 검색한 일정명 저장
              
              // 일정명으로 정확히 매칭 시도
              for (const taskTitle of possibleTaskTitles) {
                if (userContent.includes(taskTitle)) {
                  searchedTitle = taskTitle;
                  const titleMatchedTasks = recentTasksData.filter((task: any) => 
                    task.title && task.title.toLowerCase().includes(taskTitle.toLowerCase())
                  );
                  if (titleMatchedTasks.length > 0) {
                    matchingTasks = titleMatchedTasks;
                    break;
                  }
                }
              }
              
              // 키워드 기반 매칭 시도
              if (matchingTasks.length === 0) {
                for (const keyword of specificTaskKeywords) {
                  if (userContent.includes(keyword)) {
                    // 검색한 키워드 저장
                    if (!searchedTitle) searchedTitle = keyword;
                    
                    const keywordMatchedTasks = recentTasksData.filter((task: any) => 
                      task.title && task.title.toLowerCase().includes(keyword.toLowerCase())
                    );
                    if (keywordMatchedTasks.length > 0) {
                      matchingTasks = keywordMatchedTasks;
                      break;
                    }
                  }
                }
              }
              
              // 사용자 질문에서 추출한 키워드로 한번 더 검색 시도
              if (matchingTasks.length === 0 && queryKeywords) {
                // 검색한 키워드 저장
                if (!searchedTitle) searchedTitle = queryKeywords;
                
                const words = queryKeywords.split(/\s+/);
                const filteredWords = words.filter(word => word.length > 1); // 1글자 이하 단어 제외
                
                if (filteredWords.length > 0) {
                  for (const word of filteredWords) {
                    const matchedTasks = recentTasksData.filter((task: any) => 
                      task.title && task.title.toLowerCase().includes(word.toLowerCase())
                    );
                    if (matchedTasks.length > 0) {
                      matchingTasks = matchedTasks;
                      break;
                    }
                  }
                }
              }
              
              // 매칭된 결과가 있는 경우에만 적용
              if (matchingTasks.length > 0) {
                recentTasksData = matchingTasks;
              } else {
                // 일치하는 일정이 없는 경우 메시지 표시 후 종료
                addAssistantMessage(getRandomResponse(assigneeResponses.noMatchingTasks, { searchTerm: searchedTitle || '검색한 키워드' }));
                setLoading(false);
                return;
              }
            }
            
            if (recentTasksData.length === 0) {
              addAssistantMessage(getRandomResponse(assigneeResponses.noTasks));
            } else if (recentTasksData.length === 1) {
              // 일정이 하나만 있는 경우 해당 일정의 담당자 정보만 표시
              const task = recentTasksData[0];
              
              if (task.assignee) {
                try {
                  const assigneeName = await getUserName(task.assignee);
                  addAssistantMessage(getRandomResponse(assigneeResponses.singleTask, { 
                    taskTitle: task.title,
                    assigneeName: assigneeName
                  }));
                } catch (error) {
                  console.error('담당자 이름 가져오기 오류:', error);
                  addAssistantMessage(getRandomResponse(assigneeResponses.singleTask, { 
                    taskTitle: task.title,
                    assigneeName: task.assignee
                  }));
                }
              } else {
                addAssistantMessage(getRandomResponse(assigneeResponses.noAssignee, { 
                  taskTitle: task.title
                }));
              }
              
              // 상태, 마감일 정보도 함께 표시
              let additionalInfo = '';
              if (task.status) {
                additionalInfo += `\n\n현재 상태는 **${task.status}**입니다.`;
              }
              
              if (task.dueDate) {
                try {
                  const dueDate = new Date(task.dueDate);
                  const formattedDate = dueDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  additionalInfo += `\n마감일은 **${formattedDate}**입니다.`;
                } catch (error) {
                  console.error('마감일 형식 변환 오류:', error);
                  additionalInfo += `\n마감일은 **${task.dueDate}**입니다.`;
                }
              }
              
              if (additionalInfo) {
                addAssistantMessage(additionalInfo);
              }
            } else {
              // 여러 일정이 있는 경우 담당자 정보 목록 표시
              let assigneeList = '';
              
              for (let i = 0; i < recentTasksData.length; i++) {
                const task = recentTasksData[i];
                assigneeList += `${i+1}. **${task.title}**`;
                
                if (task.assignee) {
                  try {
                    const assigneeName = await getUserName(task.assignee);
                    assigneeList += `: **${assigneeName}**`;
                  } catch (error) {
                    console.error('담당자 이름 가져오기 오류:', error);
                    assigneeList += `: **${task.assignee}**`;
                  }
                } else {
                  assigneeList += `: 담당자 미지정`;
                }
                
                if (task.status) {
                  assigneeList += ` (상태: ${task.status})`;
                }
                
                assigneeList += '\n';
              }
              
              addAssistantMessage(getRandomResponse(assigneeResponses.multipleAssignees, { assigneeList }));
            }
          }
          // 상태별 일정 검색인 경우
          else if (isStatusQuery) {
            const statusDisplayNames: Record<string, string> = {
              'todo': '할 일',
              'in_progress': '진행 중인',
              'review': '검토 중인',
              'done': '완료된'
            };
            
            const displayStatus = statusDisplayNames[statusFilter] || statusFilter;
            
            // 상태에 맞는 응답 템플릿 선택
            let responseTemplates;
            if (statusFilter === 'todo' || statusFilter.includes('todo')) {
              responseTemplates = taskStatusResponses.todo;
            } else if (statusFilter === 'in_progress' || statusFilter.includes('progress')) {
              responseTemplates = taskStatusResponses.in_progress;
            } else if (statusFilter === 'review' || statusFilter.includes('review')) {
              responseTemplates = taskStatusResponses.review;
            } else if (statusFilter === 'done' || statusFilter.includes('done')) {
              responseTemplates = taskStatusResponses.done;
            } else {
              responseTemplates = taskStatusResponses.general;
            }
            
            // 태스크 상세 정보 생성
            let taskDetails = '';
            
            // 첫 번째 일정 상세 정보 표시
            const mainTask = recentTasksData[0];
            taskDetails += `1. **${mainTask.title}**\n`;
            
            if (mainTask.assignee) {
              try {
                const assigneeName = await getUserName(mainTask.assignee);
                taskDetails += `   - 담당자: **${assigneeName}**\n`;
              } catch (error) {
                console.error('담당자 이름 가져오기 오류:', error);
                taskDetails += `   - 담당자: **${mainTask.assignee}**\n`;
              }
            }
            
            if (mainTask.dueDate) {
              try {
                const dueDate = new Date(mainTask.dueDate);
                const formattedDate = dueDate.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
                taskDetails += `   - 마감일: **${formattedDate}**\n`;
              } catch (error) {
                console.error('마감일 형식 변환 오류:', error);
                taskDetails += `   - 마감일: **${mainTask.dueDate}**\n`;
              }
            }
            
            if (mainTask.priority) {
              taskDetails += `   - 우선순위: **${mainTask.priority}**\n`;
            }
            
            if (mainTask.description) {
              taskDetails += `   - 설명: ${mainTask.description}\n`;
            }
            
            // 추가 관련 일정이 있으면 표시
            if (recentTasksData.length > 1) {
              taskDetails += `\n**더 많은 ${displayStatus} 일정:**\n`;
              
              for (let i = 1; i < recentTasksData.length; i++) {
                const task = recentTasksData[i];
                taskDetails += `\n${i+1}. **${task.title}**`;
                
                if (task.assignee) {
                  try {
                    const assigneeName = await getUserName(task.assignee);
                    taskDetails += ` (담당: ${assigneeName})`;
                  } catch (error) {
                    console.error('담당자 이름 가져오기 오류:', error);
                    taskDetails += ` (담당: ${task.assignee})`;
                  }
                }
                
                if (task.dueDate) {
                  try {
                    const dueDate = new Date(task.dueDate);
                    const formattedDate = dueDate.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    taskDetails += ` (마감: ${formattedDate})`;
                  } catch (error) {
                    taskDetails += ` (마감: ${task.dueDate})`;
                  }
                }
              }
            }
            
            addAssistantMessage(getRandomResponse(responseTemplates, { taskDetails }));
          }
          // 특정 일정명 검색인 경우
          else if (isSpecificTaskQuery) {
            markdownResponse = `## 🔍 일정 검색 결과\n\n`;
            
            // 첫 번째 일정 상세 정보 표시
            const mainTask = recentTasksData[0];
            markdownResponse += `**${mainTask.title}** 일정 정보:\n\n`;
            
            if (mainTask.status) {
              markdownResponse += `- 상태: **${mainTask.status}**\n`;
            }
            
            if (mainTask.assignee) {
              try {
                const assigneeName = await getUserName(mainTask.assignee);
                markdownResponse += `- 담당자: **${assigneeName}**\n`;
              } catch (error) {
                console.error('담당자 이름 가져오기 오류:', error);
                markdownResponse += `- 담당자: **${mainTask.assignee}**\n`;
              }
            }
            
            if (mainTask.dueDate) {
              try {
                const dueDate = new Date(mainTask.dueDate);
                const formattedDate = dueDate.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                });
                markdownResponse += `- 마감일: **${formattedDate}**\n`;
              } catch (error) {
                console.error('마감일 형식 변환 오류:', error);
                markdownResponse += `- 마감일: **${mainTask.dueDate}**\n`;
              }
            }
            
            if (mainTask.priority) {
              markdownResponse += `- 우선순위: **${mainTask.priority}**\n`;
            }
            
            if (mainTask.description) {
              markdownResponse += `- 설명: ${mainTask.description}\n`;
            }
            
            // 추가 관련 일정이 있으면 표시
            if (recentTasksData.length > 1) {
              markdownResponse += `\n관련된 다른 일정:\n`;
              
              for (let i = 1; i < recentTasksData.length; i++) {
                const task = recentTasksData[i];
                markdownResponse += `\n${i}. **${task.title}**`;
                
                if (task.dueDate) {
                  try {
                    const dueDate = new Date(task.dueDate);
                    const formattedDate = dueDate.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    markdownResponse += ` (마감: ${formattedDate})`;
                  } catch (error) {
                    markdownResponse += ` (마감: ${task.dueDate})`;
                  }
                }
              }
            }
          }
          // 마감일 관련 질문인 경우
          else if (isDueDateQuery) {
            markdownResponse = `## 🗓️ 일정 마감일 정보\n\n`;
            
            if (recentTasksData.length > 0) {
              // 가장 최근 일정의 마감일 정보 표시
              const latestTask = recentTasksData[0];
              markdownResponse += `**${latestTask.title}** 일정`;
              
              if (latestTask.dueDate) {
                try {
                  const dueDate = new Date(latestTask.dueDate);
                  const formattedDate = dueDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  });
                  markdownResponse += `의 마감일은 **${formattedDate}**입니다.`;
                } catch (error) {
                  console.error('마감일 형식 변환 오류:', error);
                  markdownResponse += `의 마감일은 **${latestTask.dueDate}**입니다.`;
                }
              } else {
                markdownResponse += `에는 설정된 마감일이 없습니다.`;
              }
              
              // 추가 일정이 있을 경우 마감일 정보만 표시
              if (recentTasksData.length > 1) {
                markdownResponse += `\n\n다른 일정의 마감일:`;
                
                for (let i = 1; i < recentTasksData.length; i++) {
                  const task = recentTasksData[i];
                  markdownResponse += `\n${i}. **${task.title}**`;
                  
                  if (task.dueDate) {
                    try {
                      const dueDate = new Date(task.dueDate);
                      const formattedDate = dueDate.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                      markdownResponse += `: ${formattedDate}`;
                    } catch (error) {
                      console.error('마감일 형식 변환 오류:', error);
                      markdownResponse += `: ${task.dueDate}`;
                    }
                  } else {
                    markdownResponse += `: 마감일 미설정`;
                  }
                }
              }
            } else {
              markdownResponse += `현재 등록된 일정이 없습니다.`;
            }
          } 
          // 일반 일정 관련 질문인 경우 (기존 응답 방식 유지)
          else {
            markdownResponse = `## 🗓️ 일정 정보\n\n`;
            
            if (recentTasksData.length > 0) {
              // 가장 최근 일정 정보 표시
              const latestTask = recentTasksData[0];
              markdownResponse += `최근 일정은 **${latestTask.title}**입니다.`;
              
              if (latestTask.assignee) {
                // assignee가 있으면 사용자 이름으로 변환
                try {
                  const assigneeName = await getUserName(latestTask.assignee);
                  markdownResponse += `\n담당자는 **${assigneeName}**입니다.`;
                } catch (error) {
                  console.error('담당자 이름 가져오기 오류:', error);
                  markdownResponse += `\n담당자는 **${latestTask.assignee}**입니다.`;
                }
              }
              
              // 마감일 정보 추가
              if (latestTask.dueDate) {
                try {
                  const dueDate = new Date(latestTask.dueDate);
                  const formattedDate = dueDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long'
                  });
                  markdownResponse += `\n마감일: **${formattedDate}**`;
                } catch (error) {
                  console.error('마감일 형식 변환 오류:', error);
                  markdownResponse += `\n마감일: **${latestTask.dueDate}**`;
                }
              }
              
              if (latestTask.status) {
                markdownResponse += `\n상태: **${latestTask.status}**`;
              }
              
              // 추가 일정이 있을 경우에만 표시
              if (recentTasksData.length > 1) {
                markdownResponse += `\n\n다른 일정:`;
                
                for (let i = 1; i < recentTasksData.length; i++) {
                  const task = recentTasksData[i];
                  markdownResponse += `\n${i}. **${task.title}**`;
                  
                  if (task.status) {
                    markdownResponse += ` (상태: ${task.status})`;
                  }
                  
                  if (task.assignee) {
                    try {
                      const assigneeName = await getUserName(task.assignee);
                      markdownResponse += ` (담당: ${assigneeName})`;
                    } catch (error) {
                      console.error('담당자 이름 가져오기 오류:', error);
                      markdownResponse += ` (담당: ${task.assignee})`;
                    }
                  }
                  
                  // 다른 일정의 마감일 정보 추가
                  if (task.dueDate) {
                    try {
                      const dueDate = new Date(task.dueDate);
                      const formattedDate = dueDate.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });
                      markdownResponse += ` (마감: ${formattedDate})`;
                    } catch (error) {
                      console.error('마감일 형식 변환 오류:', error);
                      markdownResponse += ` (마감: ${task.dueDate})`;
                    }
                  }
                }
              }
            } else {
              markdownResponse += `현재 등록된 일정이 없습니다.`;
            }
          }
          
          addAssistantMessage(markdownResponse);
        } catch (error) {
          console.error('일정 정보 처리 오류:', error);
          addAssistantMessage('죄송합니다. 일정 정보를 가져오는 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      } 
      // Check if it's a project info request
      else if (
        userContent === "프로젝트 정보" || 
        userContent === "내 프로젝트 보여줘" || 
        userContent === "내 프로젝트" ||
        userContent === "프로젝트 목록" ||
        detectProjectIntent(userContent)
      ) {
        // 프로젝트 정보 요청 시 메시지 추가
        addUserMessage(copyOfUserContent);
        
        await handleEnhancedProjectRequest(userContent);
    }
    else {
        // 일반 메시지인 경우 sendMessage 호출
        await sendMessage(userContent);
      }
    } catch (error) {
      console.error("메시지 전송 중 오류 발생:", error);
      addAssistantMessage("메시지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
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

  // 로딩 상태를 설정하는 함수 추가
  const setLoading = useCallback((loading: boolean) => {
    if (loading) {
      // 상태를 직접 수정하지 않고 DOM을 통해 로딩 애니메이션 표시
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'thinking-bubble-container';
      loadingDiv.className = 'flex justify-start py-2';
      loadingDiv.innerHTML = `
        <div class="bg-gray-100 rounded-lg p-3 rounded-bl-none max-w-[80%]">
          <div class="flex items-center">
            <span class="text-gray-700 font-medium">생각중</span>
            <span className="thinking-dots ml-1">
              <span className="dot text-lg">.</span>
              <span className="dot text-lg">.</span>
              <span className="dot text-lg">.</span>
            </span>
          </div>
        </div>
      `;

      // CSS 스타일 추가
      const style = document.createElement('style');
      style.id = 'thinking-bubble-style';
      style.textContent = `
        .thinking-dots .dot {
          display: inline-block;
          animation: blink-bounce 1.4s infinite;
          font-weight: bold;
        }
        
        .dot:nth-child(1) {
          animation-delay: 0s;
        }
        
        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes blink-bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
          60% { transform: translateY(-2px); }
        }
      `;

      // 기존 요소 제거 후 새로 추가
      const existingContainer = document.getElementById('thinking-bubble-container');
      if (existingContainer) {
        existingContainer.remove();
      }
      const existingStyle = document.getElementById('thinking-bubble-style');
      if (existingStyle) {
        existingStyle.remove();
      }

      // 메시지 컨테이너에 로딩 UI 추가
      const container = messagesContainerRef.current;
      if (container) {
        container.appendChild(loadingDiv);
        document.head.appendChild(style);
        scrollToBottom('smooth');
      }
    } else {
      // 로딩 종료 시 요소 제거
      const loadingDiv = document.getElementById('thinking-bubble-container');
      if (loadingDiv) {
        loadingDiv.remove();
      }
      const style = document.getElementById('thinking-bubble-style');
      if (style) {
        style.remove();
      }
    }
  }, [scrollToBottom]);

  // Function to handle document summarization
  const handleSummarizeRequest = async () => {
    try {
      // 현재 문서 ID 가져오기
      const documentId = getCurrentDocumentId();
      
      if (!documentId) {
        // 현재 페이지에서 텍스트 콘텐츠 가져오기
        const pageText = document.body.innerText || '';
        
        // 페이지 제목 가져오기
        const pageTitle = document.title || '현재 페이지';
        
        if (pageText.trim().length > 0) {
          // 로딩 표시 시작
          setLoading(true);
          
          try {
            // 요약 API 호출
            const response = await fetch('/api/ai/summarize', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: pageText,
                title: pageTitle,
                contextData: {
                  currentUrl: window.location.href,
                  timestamp: new Date().toISOString()
                }
              }),
            });
            
            if (!response.ok) {
              throw new Error('요약 중 오류가 발생했습니다.');
            }
            
            const data = await response.json();
            
            // 요약 결과 메시지로 추가
            if (data.summary) {
              addAssistantMessage(data.summary);
            } else if (data.error) {
              addAssistantMessage(`요약에 실패했습니다: ${data.error}`);
            } else {
              addAssistantMessage('요약에 실패했습니다.');
            }
          } catch (error) {
            console.error('요약 API 호출 오류:', error);
            addAssistantMessage('요약하는 동안 오류가 발생했습니다.');
          } finally {
            setLoading(false);
          }
        } else {
          addAssistantMessage('요약할 내용이 없습니다. 문서 페이지에서 시도해주세요.');
        }
      } else {
        // 문서가 있는 경우 해당 문서 내용 가져오기
        try {
          setLoading(true);
          const documentInfo = await getDocumentInfo(documentId);
          
          if (documentInfo && documentInfo.content) {
            // 요약 API 호출 
            const response = await fetch('/api/ai/summarize', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: documentInfo.content,
                title: documentInfo.title || '문서',
                documentData: {
                  id: documentInfo.id,
                  createdAt: documentInfo.createdAt,
                  updatedAt: documentInfo.updatedAt,
                  projectId: documentInfo.projectId
                }
              }),
            });
            
            if (!response.ok) {
              throw new Error('요약 중 오류가 발생했습니다.');
            }
            
            const data = await response.json();
            
            // 요약 결과 메시지로 추가
            if (data.summary) {
              addAssistantMessage(data.summary);
            } else if (data.error) {
              addAssistantMessage(`요약에 실패했습니다: ${data.error}`);
            } else {
              addAssistantMessage('요약에 실패했습니다.');
            }
        } else {
            addAssistantMessage('문서 내용을 불러올 수 없습니다.');
          }
        } catch (error) {
          console.error('문서 요약 오류:', error);
          addAssistantMessage('문서를 요약하는 동안 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('요약 처리 오류:', error);
      setLoading(false);
      addAssistantMessage('요약을 처리하는 중 오류가 발생했습니다.');
    }
  };

  // 향상된 프로젝트 정보 요청 처리
  const handleEnhancedProjectRequest = useCallback(async (userQuery: string) => {
    try {
      // 로딩 표시 시작
      setLoading(true);
      
      // 프로젝트 정보 수집을 위한 타입 정의
      interface ProjectInfo {
        id: string;
        name: string;
        description?: string;
        createdAt: string;
        updatedAt: string;
        userId: string;
        user?: {
          id: string;
          name: string;
          email: string;
        };
        members?: Array<{
          id: string;
          userId: string;
          projectId: string;
          role?: string;
          inviteStatus: string;
          createdAt: string;
          updatedAt: string;
          user: {
            id: string;
            name: string;
            email: string;
          };
        }>;
      }

      interface TaskInfo {
        id: string;
        title: string;
        description?: string;
        status: string;
        priority: string;
        assignee?: string;
        dueDate?: string;
        startDate?: string;
        endDate?: string;
        isAllDay: boolean;
        createdAt: string;
        updatedAt: string;
        projectId: string;
      }

      interface DocumentInfo {
        id: string;
        title: string;
        content?: string;
        emoji?: string;
        createdAt: string;
        updatedAt: string;
        projectId?: string;
        folder?: string;
        isStarred: boolean;
        isReadOnly: boolean;
        tags?: string;
        folderId?: string;
      }

      interface FolderInfo {
        id: string;
        name: string;
        description?: string;
        createdAt: string;
        updatedAt: string;
        projectId?: string;
      }
      
      // 프로젝트 정보 수집
      let projectInfoData: {
        projects: ProjectInfo[];
        currentProject: ProjectInfo | null;
        currentProjectTasks: TaskInfo[];
        projectDocuments: DocumentInfo[];
        projectFolders: FolderInfo[];
      } = {
        projects: [],
        currentProject: null,
        currentProjectTasks: [],
        projectDocuments: [],
        projectFolders: []
      };
      
      // 모든 프로젝트 가져오기
      try {
        const projectsResponse = await fetch('/api/projects');
        if (projectsResponse.ok) {
          projectInfoData.projects = await projectsResponse.json() as ProjectInfo[];
        }
      } catch (error) {
        console.error('프로젝트 목록 가져오기 오류:', error);
      }
      
      // 현재 프로젝트 정보 가져오기
      const currentProjectId = getCurrentProjectId();
      if (currentProjectId) {
        try {
          const projectResponse = await fetch(`/api/projects/${currentProjectId}`);
          if (projectResponse.ok) {
            projectInfoData.currentProject = await projectResponse.json() as ProjectInfo;
            
            // 현재 프로젝트의 태스크 가져오기
            const tasksResponse = await fetch(`/api/projects/${currentProjectId}/tasks`);
            if (tasksResponse.ok) {
              projectInfoData.currentProjectTasks = await tasksResponse.json() as TaskInfo[];
            }
            
            // 현재 프로젝트의 문서 가져오기
            try {
              const documentsResponse = await fetch(`/api/documents?projectId=${currentProjectId}`);
              if (documentsResponse.ok) {
                projectInfoData.projectDocuments = await documentsResponse.json() as DocumentInfo[];
              }
            } catch (error) {
              console.error('문서 목록 가져오기 오류:', error);
            }

            // 현재 프로젝트의 폴더 가져오기
            try {
              const foldersResponse = await fetch(`/api/documents/folders?projectId=${currentProjectId}`);
              if (foldersResponse.ok) {
                projectInfoData.projectFolders = await foldersResponse.json() as FolderInfo[];
              }
            } catch (error) {
              console.error('폴더 목록 가져오기 오류:', error);
            }
          }
        } catch (error) {
          console.error('현재 프로젝트 정보 가져오기 오류:', error);
        }
      }
      
      // 데이터 수집 완료 후 AI에 전송
      try {
        const aiResponse = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'user',
                content: `${userQuery}\n\n---\n실제 데이터베이스 정보(이 데이터만 사용해서 응답해주세요):\n${JSON.stringify(projectInfoData, null, 2)}`
              }
            ]
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          // AI 응답 형식으로 추가
          addAssistantMessage(data.content);
        } else {
          throw new Error('AI 응답 처리 중 오류가 발생했습니다.');
        }
      } catch (error) {
        console.error('AI 응답 처리 오류:', error);
        addAssistantMessage('죄송합니다. 프로젝트 정보를 처리하는 중 오류가 발생했습니다.');
      }
      
      // 로딩 표시 종료
      setLoading(false);
      
    } catch (error) {
      console.error('프로젝트 정보 처리 오류:', error);
      setLoading(false);
      addAssistantMessage('죄송합니다. 프로젝트 정보를 가져오는 중 오류가 발생했습니다.');
    }
  }, [addAssistantMessage, getCurrentProjectId, setLoading]);

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
        <h3 className="font-medium text-gray-700">숭민이</h3>
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
            onClick={handleClose}
            className="h-8 w-8"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 my-8">
            <p className="mb-2">숭민이와 대화를 시작해보세요</p>
            <p className="text-xs text-blue-500 mb-2">💡 Tip: 문서를 요약하려면 "요약해줘"라고 입력하세요</p>
          
          </div>
        ) : (
          messages.map((message, index) => (
            <MessageBubble key={index} message={message} />
          ))
        )}
        
        {/* 생각중... 로딩 표시기 - isLoading 상태를 사용하여 표시 */}
        {isLoading && <ThinkingBubble />}
        
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
            disabled={isSubmitting || isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={isLoading || isSubmitting || input.trim() === ''}
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
  const bubbleRef = useRef<HTMLDivElement>(null);
  
  // 타이핑 효과
  useEffect(() => {
    // 사용자 메시지는 즉시 표시
    if (isUser) {
      setDisplayedContent(message.content);
      return;
    }
    
    // 어시스턴트 메시지는 타이핑 효과 적용
    setIsTyping(true);
    
    // 타이핑 시작 전 스크롤 조정
    if (bubbleRef.current) {
      bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    
    // 스트리밍 효과를 위한 함수
    const totalLength = message.content.length;
    let currentLength = 0;
    
    // 타이핑 속도 조정 - 더 자연스럽게
    const getRandomTypingDelay = () => {
      // 기본 타이핑 속도
      const baseDelay = 30;
      
      // 랜덤 변동 (자연스러움 추가)
      const randomVariation = Math.random() * 40;
      
      // 문장 끝이나 단락 끝에서 더 오래 멈추기
      const isEndOfSentence = currentLength < totalLength && 
        ['.', '!', '?', '\n'].includes(message.content[currentLength]);
      
      if (isEndOfSentence) {
        return baseDelay + randomVariation + 200; // 문장 끝에서 더 긴 딜레이
      }
      
      // 단어 사이에서 약간 멈추기
      const isWordBoundary = currentLength < totalLength && 
        message.content[currentLength] === ' ';
      
      if (isWordBoundary) {
        return baseDelay + randomVariation + 50; // 단어 사이에서 약간 긴 딜레이
      }
      
      return baseDelay + randomVariation; // 일반적인 타이핑 딜레이
    };
    
    // 스크롤 핸들러
    const scrollToLatestText = () => {
      // 메시지 요소로 스크롤
      if (bubbleRef.current) {
        const chatContainer = bubbleRef.current.closest('.flex-1.overflow-y-auto');
        if (chatContainer) {
          // 컨테이너의 스크롤 위치 조정
          const isNearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 150;
          
          // 이미 스크롤이 거의 아래에 있으면 자동 스크롤 수행
          if (isNearBottom) {
            bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        } else {
          // 컨테이너를 찾지 못한 경우 직접 스크롤
          bubbleRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    };
    
    // 타이핑 함수 
    const typeNextCharacter = () => {
      if (currentLength < totalLength) {
        // 한 번에 타이핑되는 문자 수 - 가변적으로 조정
        const increment = Math.floor(Math.random() * 2) + 1; // 1-2 글자씩 타이핑
        currentLength = Math.min(currentLength + increment, totalLength);
        setDisplayedContent(message.content.substring(0, currentLength));
        
        // 자동 스크롤 - 타이핑 진행에 따라 스크롤
        setTimeout(scrollToLatestText, 10);
        
        // 다음 타이핑까지의 딜레이를 랜덤하게 조정
        setTimeout(typeNextCharacter, getRandomTypingDelay());
      } else {
        setIsTyping(false);
        // 타이핑 완료 후 스크롤 조정
        setTimeout(scrollToLatestText, 100);
      }
    };
    
    // 타이핑 시작
    const initialDelay = 100; // 첫 글자가 나타나기 전 짧은 딜레이
    const typingTimer = setTimeout(typeNextCharacter, initialDelay);
    
    return () => clearTimeout(typingTimer);
  }, [message.content, isUser]);

  return (
    <div ref={bubbleRef} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
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