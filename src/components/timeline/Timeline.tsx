"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { 
  PlusIcon, 
  CalendarIcon, 
  ChevronRightIcon, 
  ChevronDownIcon,
  Loader2,
  XIcon,
  MoreHorizontalIcon,
  TrashIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

// 타입 정의
interface Epic {
  id: string;
  title: string;
  description?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  projectId?: string | null;
  color?: string;
  tasks: Task[];
  isOpen?: boolean;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: string | null;
  dueDate?: Date | null;
  startDate?: Date | null;
  endDate?: Date | null;
  projectId?: string | null;
  epicId?: string | null;
}

interface TimelineProps {
  projectId: string | null;
  theme: "light" | "dark";
}

export function Timeline({ projectId, theme: initialTheme }: TimelineProps) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingEpic, setIsAddingEpic] = useState(false);
  const [newEpicTitle, setNewEpicTitle] = useState("");
  const [addingTaskToEpicId, setAddingTaskToEpicId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showEpicMenu, setShowEpicMenu] = useState<string | null>(null);
  const [showTaskMenu, setShowTaskMenu] = useState<{ epicId: string, taskId: string } | null>(null);
  
  const newEpicInputRef = useRef<HTMLInputElement>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();

  const getInitialTheme = () => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "light" | "dark") || "light";
    }
    return "light";
  };

  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme());

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark-mode");
      } else {
        document.documentElement.classList.remove("dark-mode");
      }
    }
  }, [theme]);

  // 에픽 데이터 불러오기
  useEffect(() => {
    const fetchEpics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const url = projectId 
          ? `/api/epics?projectId=${projectId}` 
          : '/api/epics';
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('에픽 데이터를 불러오는 데 실패했습니다.');
        }
        
        const data = await response.json();
        
        // 모든 에픽을 초기에 펼침 상태로 설정
        const epicsWithOpenState = data.map((epic: Epic) => ({
          ...epic,
          isOpen: true, // 초기에 모든 에픽을 펼침
          tasks: epic.tasks || []
        }));
        
        setEpics(epicsWithOpenState);
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        console.error('에픽을 불러오는 중 오류 발생:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEpics();
  }, [projectId]);

  // 새 에픽 추가 시작
  const handleStartAddEpic = () => {
    setIsAddingEpic(true);
    // 다음 렌더링 사이클에서 포커스 설정
    setTimeout(() => {
      newEpicInputRef.current?.focus();
    }, 0);
  };

  // 새 에픽 추가 취소
  const handleCancelAddEpic = () => {
    setIsAddingEpic(false);
    setNewEpicTitle("");
  };

  // 새 에픽 추가 제출
  const handleSubmitNewEpic = async () => {
    if (!newEpicTitle.trim()) {
      handleCancelAddEpic();
      return;
    }

    try {
      const response = await fetch('/api/epics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newEpicTitle.trim(),
          projectId: projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('에픽 추가에 실패했습니다.');
      }

      const newEpic = await response.json();
      
      // 에픽 목록에 새 에픽 추가 (펼침 상태로)
      setEpics((prevEpics) => [
        ...prevEpics,
        { ...newEpic, isOpen: true, tasks: [] }
      ]);
      
      // 입력 초기화 및 입력 상태 종료
      setNewEpicTitle("");
      setIsAddingEpic(false);
      
      // API로 부터 최신 데이터를 반영하기 위해 페이지 리프레시
      router.refresh();
      
    } catch (err) {
      console.error('에픽 추가 중 오류 발생:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  // 에픽 입력에서 엔터키 처리
  const handleEpicKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmitNewEpic();
    } else if (e.key === 'Escape') {
      handleCancelAddEpic();
    }
  };

  // 에픽 토글
  const toggleEpic = (epicId: string) => {
    setEpics(prevEpics => 
      prevEpics.map(epic => 
        epic.id === epicId 
          ? { ...epic, isOpen: !epic.isOpen } 
          : epic
      )
    );
  };

  // 새 작업 추가 시작
  const handleStartAddTask = (epicId: string) => {
    setAddingTaskToEpicId(epicId);
    // 다음 렌더링 사이클에서 포커스 설정
    setTimeout(() => {
      newTaskInputRef.current?.focus();
    }, 0);
  };

  // 새 작업 추가 취소
  const handleCancelAddTask = () => {
    setAddingTaskToEpicId(null);
    setNewTaskTitle("");
  };

  // 새 작업 추가 제출
  const handleSubmitNewTask = async () => {
    if (!newTaskTitle.trim() || !addingTaskToEpicId) {
      handleCancelAddTask();
      return;
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          status: 'todo', // 기본 상태
          priority: 'medium', // 기본 우선순위
          epicId: addingTaskToEpicId,
          projectId: projectId,
        }),
      });

      if (!response.ok) {
        throw new Error('작업 추가에 실패했습니다.');
      }

      const newTask = await response.json();
      
      // 해당 에픽에 새 작업 추가
      setEpics(prevEpics => 
        prevEpics.map(epic => 
          epic.id === addingTaskToEpicId
            ? { ...epic, tasks: [...epic.tasks, newTask] }
            : epic
        )
      );
      
      // 입력은 초기화하지만, 추가 상태는 유지해서 연속 입력 가능하게 함
      setNewTaskTitle("");
      
      // 새 작업 추가 후에도 입력 상태 유지하여 연속 추가 가능하게 함
      // 다음 렌더링 사이클에서 포커스 설정
      setTimeout(() => {
        newTaskInputRef.current?.focus();
      }, 0);
      
      // API로 부터 최신 데이터를 반영하기 위해 페이지 리프레시
      router.refresh();
      
    } catch (err) {
      console.error('작업 추가 중 오류 발생:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  // 작업 입력에서 엔터키 처리
  const handleTaskKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmitNewTask();
    } else if (e.key === 'Escape') {
      handleCancelAddTask();
    }
  };

  // 작업 상태에 따른 배지 스타일
  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'todo':
        return theme === 'dark' 
          ? 'bg-gray-600 text-gray-200' 
          : 'bg-gray-200 text-gray-800';
      case 'in progress':
      case 'inprogress':
      case 'progress':
        return theme === 'dark' 
          ? 'bg-blue-900 text-blue-300' 
          : 'bg-blue-100 text-blue-800';
      case 'review':
        return theme === 'dark' 
          ? 'bg-purple-900 text-purple-300' 
          : 'bg-purple-100 text-purple-800';
      case 'done':
        return theme === 'dark' 
          ? 'bg-green-900 text-green-300' 
          : 'bg-green-100 text-green-800';
      default:
        return theme === 'dark' 
          ? 'bg-gray-600 text-gray-200' 
          : 'bg-gray-200 text-gray-800';
    }
  };

  // 에픽 삭제 함수
  const handleDeleteEpic = async (epicId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    
    if (!window.confirm('정말로 이 에픽을 삭제하시겠습니까? 포함된 모든 작업이 에픽에서 분리됩니다.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/epics?id=${epicId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('에픽 삭제에 실패했습니다.');
      }
      
      // UI에서 삭제된 에픽 제거
      setEpics(prevEpics => prevEpics.filter(epic => epic.id !== epicId));
      setShowEpicMenu(null);
      
    } catch (err) {
      console.error('에픽 삭제 중 오류 발생:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    }
  };
  
  // 작업 삭제 함수
  const handleDeleteTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    
    if (!window.confirm('정말로 이 작업을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('작업 삭제에 실패했습니다.');
      }
      
      // UI에서 삭제된 작업 제거
      setEpics(prevEpics => 
        prevEpics.map(epic => ({
          ...epic,
          tasks: epic.tasks.filter(task => task.id !== taskId)
        }))
      );
      setShowTaskMenu(null);
      
    } catch (err) {
      console.error('작업 삭제 중 오류 발생:', err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    }
  };

  // 다른 곳 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.task-menu-button') && !target.closest('.task-menu') &&
          !target.closest('.epic-menu-button') && !target.closest('.epic-menu')) {
        setShowTaskMenu(null);
        setShowEpicMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div>
      {/* 로딩 상태 표시 */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="animate-spin w-6 h-6 text-blue-500" />
          <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            데이터를 불러오는 중입니다...
          </span>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className={`p-4 mb-4 rounded-md ${
          theme === 'dark' 
            ? 'bg-red-900 text-red-300' 
            : 'bg-red-100 text-red-800'
        }`}>
          <p>{error}</p>
        </div>
      )}

      {/* 에픽이 없을 때 메시지 */}
      {!isLoading && epics.length === 0 && !error && (
      <div className={`p-6 rounded-md border border-dashed text-center ${
        theme === 'dark' 
          ? 'border-gray-700 text-gray-400' 
          : 'border-gray-300 text-gray-500'
      }`}>
        <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <h3 className={`text-lg font-medium mb-1 ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
        }`}>
          아직 에픽이 없습니다
        </h3>
        <p className="mb-4">새 에픽을 추가하여 작업을 구성해보세요.</p>
        {!isAddingEpic ? (
          <Button
            onClick={handleStartAddEpic}
            className={`${
              theme === 'dark' 
                ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            size="sm"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            <span>새 에픽 추가</span>
          </Button>
        ) : (
          <div className={`mt-3 ${theme === 'dark' ? 'bg-[#353538]' : 'bg-gray-100'} p-3 rounded-md`}>
            <input
              ref={newEpicInputRef}
              type="text"
              placeholder="에픽 제목 입력 후 엔터 (Esc로 취소)"
              className={`w-full p-2 rounded border ${
                theme === 'dark' 
                  ? 'bg-[#2A2A2C] border-gray-700 text-gray-200' 
                  : 'bg-white border-gray-300 text-gray-800'
              }`}
              value={newEpicTitle}
              onChange={(e) => setNewEpicTitle(e.target.value)}
              onKeyDown={handleEpicKeyDown}
            />
            
            <div className="flex mt-2 space-x-2 justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancelAddEpic}
                className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : ''}`}
              >
                취소
              </Button>
              <Button 
                size="sm" 
                onClick={handleSubmitNewEpic}
                className={`${
                  theme === 'dark' 
                    ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                추가
              </Button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 에픽 목록 */}
      {!isLoading && epics.length > 0 && (
        <div className="space-y-4">
          {epics.map((epic) => (
            <div 
              key={epic.id} 
              className={`group border rounded-md overflow-hidden ${
                theme === 'dark' 
                  ? 'border-gray-700 bg-[#2A2A2C]' 
                  : 'border-gray-200 bg-white'
              }`}
            >
              {/* 에픽 헤더 */}
              <div 
                className={`flex items-center justify-between p-4 cursor-pointer ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-800' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => toggleEpic(epic.id)}
              >
                <div className="flex items-center">
                  {epic.isOpen ? (
                    <ChevronDownIcon className={`w-5 h-5 mr-2 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                  ) : (
                    <ChevronRightIcon className={`w-5 h-5 mr-2 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                  )}
                  <div 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: epic.color || '#4F46E5' }}
                  ></div>
                  <h3 className={`font-medium ${
                    theme === 'dark' ? 'text-gray-200' : 'text-gray-800'
                  }`}>
                    {epic.title}
                  </h3>
                </div>
                
                <div className="flex items-center">
                  <div className={`text-sm mr-4 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {epic.tasks.length}개 작업
                  </div>
                  
                  {/* 에픽 메뉴 버튼 */}
                  <div className="relative epic-menu-container">
                    <button
                      className={`epic-menu-button p-1 rounded ${
                        theme === 'dark' 
                          ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowEpicMenu(showEpicMenu === epic.id ? null : epic.id);
                        setShowTaskMenu(null);
                      }}
                    >
                      <MoreHorizontalIcon className="w-5 h-5" />
                    </button>
                    
                    {showEpicMenu === epic.id && (
                      <div 
                        className={`epic-menu absolute right-0 mt-1 w-40 rounded-md shadow-lg z-10 ${
                          theme === 'dark' 
                            ? 'bg-[#353538] border border-gray-700' 
                            : 'bg-white border border-gray-200'
                        }`}
                      >
                        <div 
                          className={`flex items-center px-4 py-2 text-sm cursor-pointer ${
                            theme === 'dark'
                              ? 'text-red-400 hover:bg-gray-700' 
                              : 'text-red-600 hover:bg-gray-100'
                          }`}
                          onClick={(e) => handleDeleteEpic(epic.id, e)}
                        >
                          <TrashIcon className="w-4 h-4 mr-2" />
                          삭제
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 에픽 펼쳐진 내용 */}
              {epic.isOpen && (
                <div className={`${theme === 'dark' ? 'bg-[#1F1F21]' : 'bg-gray-50'} p-4`}>
                  {/* 작업 목록 */}
                  {epic.tasks.length > 0 ? (
                    <ul className={`space-y-2 mb-3 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {epic.tasks.map((task) => (
                        <li 
                          key={task.id}
                          className={`p-2 rounded-md ${
                            theme === 'dark' 
                              ? 'hover:bg-[#2A2A2C]' 
                              : 'hover:bg-gray-100'
                          } flex items-center justify-between group/task`}
                        >
                          <div className="flex items-center">
                            <span className={`w-1.5 h-1.5 rounded-full mr-3 ${
                              task.priority === 'high'
                                ? 'bg-red-500'
                                : task.priority === 'medium'
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            }`}></span>
                            <span>{task.title}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <span className={`text-xs px-2 py-1 rounded-full mr-2 ${getStatusBadgeStyle(task.status)}`}>
                              {task.status}
                            </span>
                            
                            {/* 작업 메뉴 버튼 */}
                            <div className="relative task-menu-container opacity-0 group-hover/task:opacity-100 transition-opacity">
                              <button
                                className={`task-menu-button p-1 rounded ${
                                  theme === 'dark' 
                                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowTaskMenu(showTaskMenu?.taskId === task.id ? null : { epicId: epic.id, taskId: task.id });
                                  setShowEpicMenu(null);
                                }}
                              >
                                <MoreHorizontalIcon className="w-4 h-4" />
                              </button>
                              
                              {showTaskMenu?.taskId === task.id && showTaskMenu?.epicId === epic.id && (
                                <div 
                                  className={`task-menu absolute right-0 mt-1 w-40 rounded-md shadow-lg z-10 ${
                                    theme === 'dark' 
                                      ? 'bg-[#353538] border border-gray-700' 
                                      : 'bg-white border border-gray-200'
                                  }`}
                                >
                                  <div 
                                    className={`flex items-center px-4 py-2 text-sm cursor-pointer ${
                                      theme === 'dark'
                                        ? 'text-red-400 hover:bg-gray-700' 
                                        : 'text-red-600 hover:bg-gray-100'
                                    }`}
                                    onClick={(e) => handleDeleteTask(task.id, e)}
                                  >
                                    <TrashIcon className="w-4 h-4 mr-2" />
                                    삭제
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className={`text-center py-4 ${
                      theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      <p>이 에픽에는 아직 작업이 없습니다.</p>
                    </div>
                  )}
                  
                  {/* 작업 추가 입력 또는 버튼 */}
                  {addingTaskToEpicId === epic.id ? (
                    <div className={`mt-3 ${
                      theme === 'dark' ? 'bg-[#353538]' : 'bg-white'
                    } p-3 rounded-md border ${
                      theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <input
                        ref={newTaskInputRef}
                        type="text"
                        placeholder="작업 제목 입력 후 엔터 (Esc로 취소)"
                        className={`w-full p-2 rounded border ${
                          theme === 'dark' 
                            ? 'bg-[#2A2A2C] border-gray-700 text-gray-200' 
                            : 'bg-white border-gray-300 text-gray-800'
                        }`}
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={handleTaskKeyDown}
                      />
                      
                      <div className="flex mt-2 space-x-2 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleCancelAddTask}
                          className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : ''}`}
                        >
                          <XIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleSubmitNewTask}
                          className={`${
                            theme === 'dark' 
                              ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          추가
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartAddTask(epic.id)}
                      className={`mt-2 w-full flex items-center justify-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity ${
                        theme === 'dark' 
                          ? 'bg-[#2A2A2C] text-gray-300 border-gray-700 hover:bg-blue-900 hover:text-blue-300 hover:border-blue-800' 
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>작업 추가</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* 새 에픽 추가 버튼 또는 입력 폼 */}
          {isAddingEpic ? (
            <div className={`mt-3 ${theme === 'dark' ? 'bg-[#353538]' : 'bg-gray-100'} p-3 rounded-md`}>
              <input
                ref={newEpicInputRef}
                type="text"
                placeholder="에픽 제목 입력 후 엔터 (Esc로 취소)"
                className={`w-full p-2 rounded border ${
                  theme === 'dark' 
                    ? 'bg-[#2A2A2C] border-gray-700 text-gray-200' 
                    : 'bg-white border-gray-300 text-gray-800'
                }`}
                value={newEpicTitle}
                onChange={(e) => setNewEpicTitle(e.target.value)}
                onKeyDown={handleEpicKeyDown}
              />
              
              <div className="flex mt-2 space-x-2 justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCancelAddEpic}
                  className={`${theme === 'dark' ? 'text-gray-300 hover:text-white' : ''}`}
                >
                  취소
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleSubmitNewEpic}
                  className={`${
                    theme === 'dark' 
                      ? 'bg-blue-700 hover:bg-blue-600 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  추가
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartAddEpic}
                className={`w-full flex items-center justify-center space-x-2 ${
                  theme === 'dark' 
                    ? 'bg-[#2A2A2C] text-gray-300 border-gray-700 hover:bg-blue-900 hover:text-blue-300 hover:border-blue-800 border border-dashed' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 border border-dashed'
                }`}
              >
                <PlusIcon className="w-4 h-4" />
                <span>새 에픽 추가</span>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 