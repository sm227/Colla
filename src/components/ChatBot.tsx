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
  const [lastCreatedTask, setLastCreatedTask] = useState<any>(null);
  
  // 현재 진행 중인 API 요청을 취소하기 위한 AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  // useChat의 내부 상태에 접근하기 위한 변수 추가
  const chatStateRef = useRef<any>(null);

  // 일정 상태별 응답 템플릿 - 기본 "일정 없음" 메시지만 남김
  const taskStatusResponses = {
    noTasks: [
      "현재 등록된 일정이 없습니다. 새로운 일정을 추가해보세요!",
      "아직 일정이 없네요. 새 일정을 만들어볼까요?",
      "표시할 일정이 없습니다. 칸반보드에서 새 태스크를 추가해 보세요.",
      "일정 목록이 비어 있습니다. 새 작업을 시작해 보세요!",
      "등록된 일정을 찾을 수 없네요. 작업을 추가하시겠어요?"
    ]
  };
  
  // 랜덤 응답 생성 함수
  const getRandomResponse = (responses: string[]) => {
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '' || isSubmitting || isLoading) return;
    
    try {
      setIsSubmitting(true);
      
      const userContent = input.trim();
      setInput('');
      
      // 일정 관련 질문인지 간단하게 확인 - 핵심 키워드만 유지
      const isScheduleRelatedQuery = 
        userContent.includes('일정') || 
        userContent.includes('할일') || 
        userContent.includes('태스크') ||
        userContent.includes('마감일') || 
        userContent.includes('담당자');
        
      // 일정 추가/생성 요청인지 확인 - 강화된 로직
      const isTaskCreationRequest = 
        (userContent.includes('일정') || userContent.includes('태스크') || userContent.includes('할일')) &&
        (userContent.includes('추가') || userContent.includes('생성') || 
         userContent.includes('만들') || userContent.includes('새로운') || 
         userContent.includes('등록') || userContent.includes('새로') || 
         userContent.includes('만들어') || userContent.includes('추가해'));
    
    // Check if it's a summarize request
      if (userContent === "요약해줘") {
        // 요약 작업 전에 사용자 메시지 추가
        addUserMessage(userContent);
        
        // 요약 처리
      await handleSummarizeRequest();
    } 
      // 일정 관련 질문인 경우
      else if (isScheduleRelatedQuery || isTaskCreationRequest) {
        // 일정 관련 질문인 경우 사용자 메시지 추가
        addUserMessage(userContent);
        
        // 로딩 표시 시작
        setLoading(true);
        
        try {
          // 현재 프로젝트 ID 가져오기
          const projectId = getCurrentProjectId();
          let tasksData = [];
          let projectName = '';
          
          if (projectId) {
            // 현재 프로젝트의 태스크 가져오기
            const tasksResponse = await fetch(`/api/projects/${projectId}/tasks`);
            if (tasksResponse.ok) {
              tasksData = await tasksResponse.json();
              
              // 프로젝트 이름 가져오기
              if (currentProject) {
                projectName = currentProject.name;
              } else {
                try {
                  const projectResponse = await fetch(`/api/projects/${projectId}`);
                  if (projectResponse.ok) {
                    const projectData = await projectResponse.json();
                    projectName = projectData.name;
                  }
                } catch (error) {
                  console.error('프로젝트 정보 가져오기 오류:', error);
                }
              }
            }
          } else {
            // 모든 프로젝트의 태스크 가져오기
            const tasksResponse = await fetch(`/api/tasks`);
            if (tasksResponse.ok) {
              tasksData = await tasksResponse.json();
            }
          }
          
          // 일정 추가 요청의 경우 빈 태스크 데이터여도 처리 (AI에게 태스크 생성 명령 전달)
          if (tasksData.length === 0 && !isTaskCreationRequest) {
            addAssistantMessage(getRandomResponse(taskStatusResponses.noTasks));
            setLoading(false);
            return;
          }
          
          // 사용자 이름 데이터 추가 (담당자 이름 표시용)
          const assignees = Array.from(new Set(tasksData.map((task: any) => task.assignee).filter(Boolean))) as string[];
          const assigneeNames: Record<string, string> = {};
          const nameToIdMap: Record<string, string> = {}; // 이름 -> ID 매핑 추가
          
          for (const assigneeId of assignees) {
            try {
              const name = await getUserName(assigneeId);
              assigneeNames[assigneeId] = name;
              nameToIdMap[name.toLowerCase()] = assigneeId; // 이름으로 ID를 찾을 수 있도록 매핑
            } catch (error) {
              console.error('사용자 이름 가져오기 오류:', error);
              assigneeNames[assigneeId] = assigneeId;
            }
          }
          
          // 프로젝트의 모든 사용자 정보 가져오기
          let projectUsers: Record<string, string> = {};
          try {
            if (projectId) {
              const projectResponse = await fetch(`/api/projects/${projectId}`);
              if (projectResponse.ok) {
                const projectData = await projectResponse.json();
                // 프로젝트 소유자 추가
                if (projectData.userId && projectData.user) {
                  projectUsers[projectData.user.name.toLowerCase()] = projectData.userId;
                  nameToIdMap[projectData.user.name.toLowerCase()] = projectData.userId;
                }
                // 프로젝트 멤버 추가
                if (projectData.members && Array.isArray(projectData.members)) {
                  projectData.members.forEach((member: any) => {
                    if (member.userId && member.user && member.user.name) {
                      projectUsers[member.user.name.toLowerCase()] = member.userId;
                      nameToIdMap[member.user.name.toLowerCase()] = member.userId;
                    }
                  });
                }
              }
            }
          } catch (error) {
            console.error('프로젝트 사용자 정보 가져오기 오류:', error);
          }
          
          // 일정 추가 요청인 경우 projectId도 함께 전송
          const dataForAI = isTaskCreationRequest
            ? {
                userQuestion: userContent,
                projectId: projectId || '',
                projectName: projectName,
                existingTasks: tasksData,
                assigneeNames: assigneeNames,
                nameToIdMap: nameToIdMap, // 이름-ID 매핑 추가
                projectUsers: projectUsers, // 프로젝트 사용자 정보 추가
                isCreationRequest: true
              }
            : {
                tasksData,
                projectName,
                assigneeNames
              };
          
          // AI API 호출하여 자연어 응답 생성
          const aiResponse = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [
                {
                  role: 'user',
                  content: isTaskCreationRequest
                    ? `${userContent}\n\n---\n일정 생성 요청 데이터:\n${JSON.stringify(dataForAI, null, 2)}`
                    : `${userContent}\n\n---\n일정 데이터(이 데이터에 있는 일정만 답변하고 없는 정보는 절대 만들어내지 마세요):\n${JSON.stringify(tasksData, null, 2)}\n\n프로젝트 이름: ${projectName}\n\n담당자 이름 매핑:\n${JSON.stringify(assigneeNames, null, 2)}`
                }
              ],
              systemMessage: isTaskCreationRequest ? "일정 생성 전문가" : undefined
            }),
          });
          
          if (aiResponse.ok) {
            const data = await aiResponse.json();
            
            // 태스크 생성 요청이고 JSON 형식의 태스크 데이터가 포함된 경우
            if (isTaskCreationRequest && data.content) {
              try {
                console.log('AI 응답 내용:', data.content);
                
                // 먼저 ```json 표기 안에 있는 JSON 찾기
                const jsonRegex = /```(?:json)?\s*([\s\S]*?)\s*```/;
                const match = data.content.match(jsonRegex);
                
                // 그 다음 { "action": "create_task" 패턴이 포함된 JSON 찾기
                const jsonObjectRegex = /\{\s*["']action["']\s*:\s*["']create_task["']/;
                const plainJsonMatch = data.content.match(jsonObjectRegex);
                
                // JSON 문자열 추출
                let jsonString = '';
                if (match && match[1]) {
                  console.log('마크다운 코드 블록에서 JSON 찾음');
                  jsonString = match[1];
                } else if (plainJsonMatch) {
                  console.log('일반 텍스트에서 JSON 찾음');
                  // 중괄호로 시작하는 부분부터 가능한 JSON 추출
                  const startIdx = data.content.indexOf('{');
                  let endIdx = -1;
                  let depth = 0;
                  
                  // 중첩된 중괄호 처리
                  for (let i = startIdx; i < data.content.length; i++) {
                    if (data.content[i] === '{') depth++;
                    else if (data.content[i] === '}') {
                      depth--;
                      if (depth === 0) {
                        endIdx = i + 1;
                        break;
                      }
                    }
                  }
                  
                  if (endIdx > startIdx) {
                    jsonString = data.content.substring(startIdx, endIdx);
                  }
                }
                
                let jsonData;
                // JSON 파싱 시도
                if (jsonString) {
                  try {
                    jsonData = JSON.parse(jsonString);
                    console.log('파싱된 JSON 데이터:', jsonData);
                  } catch (parseError) {
                    console.error('JSON 파싱 오류:', parseError, jsonString);
                    // JSON 파싱 오류 복구 시도 - 따옴표 수정 등
                    const fixedJsonString = jsonString
                      .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":') // 키 따옴표 수정
                      .replace(/:\s*['"]([^'"]*)['"](\s*[,}])/g, ':"$1"$2'); // 값 따옴표 수정
                    
                    try {
                      jsonData = JSON.parse(fixedJsonString);
                      console.log('수정 후 파싱된 JSON 데이터:', jsonData);
                    } catch (e) {
                      console.error('JSON 파싱 수정 실패:', e);
                    }
                  }
                }
                
                // JSON 데이터가 있고, action이 create_task인 경우
                if (jsonData && jsonData.action === 'create_task' && jsonData.data) {
                  // 담당자 정보 처리 - 이름을 ID로 변환
                  let assigneeId = null;
                  const assigneeName = jsonData.data.assignee;
                  
                  if (assigneeName) {
                    console.log('담당자 이름:', assigneeName);
                    
                    // 이름으로 ID 찾기 (nameToIdMap에서 찾기)
                    if (typeof assigneeName === 'string') {
                      const lowerName = assigneeName.toLowerCase();
                      
                      if (dataForAI && dataForAI.nameToIdMap && dataForAI.nameToIdMap[lowerName]) {
                        assigneeId = dataForAI.nameToIdMap[lowerName];
                        console.log('담당자 ID 찾음:', assigneeId);
                      } else if (dataForAI && dataForAI.projectUsers && dataForAI.projectUsers[lowerName]) {
                        assigneeId = dataForAI.projectUsers[lowerName];
                        console.log('프로젝트 사용자 ID 찾음:', assigneeId);
                      } else {
                        // 이름으로 사용자 검색 시도
                        try {
                          console.log('사용자 검색 시도:', assigneeName);
                          const searchResponse = await fetch(`/api/users/search?name=${encodeURIComponent(assigneeName)}`);
                          if (searchResponse.ok) {
                            const searchResult = await searchResponse.json();
                            if (searchResult.length > 0) {
                              assigneeId = searchResult[0].id;
                              console.log('검색으로 담당자 ID 찾음:', assigneeId);
                            }
                          }
                        } catch (error) {
                          console.error('사용자 검색 오류:', error);
                        }
                      }
                    }
                  }
                  
                  // dueDate 처리: 년도가 포함된 전체 날짜 확인
                  let dueDateValue = jsonData.data.dueDate || (new Date().toISOString().split('T')[0]);
                  
                  // 날짜 형식이 맞는지 확인하고, 년도가 현재와 맞지 않으면 수정
                  if (dueDateValue && dueDateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    const currentYear = new Date().getFullYear();
                    const dueDateYear = parseInt(dueDateValue.split('-')[0]);
                    
                    // 년도가 2023이거나 현재 년도와 다르면 수정
                    if (dueDateYear !== currentYear) {
                      // 월-일만 유지하고 현재 년도로 변경
                      const monthDay = dueDateValue.substring(5); // MM-DD 부분만 추출
                      dueDateValue = `${currentYear}-${monthDay}`;
                      console.log(`날짜 년도 수정: ${jsonData.data.dueDate} → ${dueDateValue}`);
                    }
                  }
                  
                  const taskData = {
                    title: jsonData.data.title,
                    description: jsonData.data.description || '',
                    status: jsonData.data.status || 'todo',
                    priority: jsonData.data.priority || 'medium',
                    projectId: projectId,
                    dueDate: dueDateValue,
                    assignee: assigneeId  // 이름에서 변환된 ID 또는 null
                  };
                  
                  console.log('생성할 태스크 데이터:', taskData);
                  
                  // 태스크 생성 API 호출
                  const createTaskResponse = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(taskData)
                  });
                  
                  if (createTaskResponse.ok) {
                    const createdTask = await createTaskResponse.json();
                    setLastCreatedTask(createdTask);
                    
                    // JSON 데이터 제거하고 성공 메시지만 표시
                    const successMessage = jsonData.message || `새 일정을 추가했습니다: ${taskData.title}`;
                    // 코드 블록 또는 원본 JSON 제거
                    let cleanedContent = data.content;
                    if (match) {
                      cleanedContent = data.content.replace(jsonRegex, '');
                    } else if (jsonString) {
                      cleanedContent = data.content.replace(jsonString, '');
                    }
                    
                    // 정리된 내용이 있으면 추가 메시지와 함께 표시, 아니면 성공 메시지만 표시
                    const cleanedText = cleanedContent.trim();
                    if (cleanedText && !cleanedText.includes(successMessage)) {
                      addAssistantMessage(`${cleanedText}\n\n${successMessage}`);
                    } else {
                      addAssistantMessage(successMessage);
                    }
                  } else {
                    const errorData = await createTaskResponse.json();
                    addAssistantMessage(`일정 추가 중 오류가 발생했습니다: ${errorData.error || '알 수 없는 오류'}`);
                  }
                } else if (jsonData && jsonData.action === 'request_more_info') {
                  // 추가 정보 요청 메시지
                  const infoRequestMessage = jsonData.message || '일정 추가를 위해 더 많은 정보가 필요합니다.';
                  addAssistantMessage(infoRequestMessage);
                } else {
                  // JSON은 파싱되었지만 유효한 태스크 데이터가 아닌 경우
                  // 또는 JSON이 없거나 완전하지 않은 경우 전체 응답 표시
                  addAssistantMessage(data.content);
                }
              } catch (error) {
                console.error('일정 생성 응답 처리 오류:', error);
                addAssistantMessage(data.content);
              }
            } else {
              // 일반 응답인 경우
              addAssistantMessage(data.content);
            }
          } else {
            throw new Error('AI 응답을 처리하는 중 오류가 발생했습니다.');
          }
        } catch (error) {
          console.error('일정 정보 처리 오류:', error);
          addAssistantMessage('죄송합니다. 일정 정보를 처리하는 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
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
            <p className="text-xs text-blue-500 mb-2">💡 Tip: 숭민이와 대화를 통해 일정 추가가 가능해요</p>
          
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