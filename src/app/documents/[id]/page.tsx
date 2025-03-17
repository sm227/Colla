"use client";

import { useState, useEffect, useRef } from "react";
import { 
  ArrowLeftIcon, 
  MoreHorizontalIcon, 
  StarIcon, 
  UsersIcon, 
  ShareIcon,
  PlusIcon,
  ImageIcon,
  ListIcon,
  CheckSquareIcon,
  CodeIcon,
  TableIcon,
  TypeIcon,
  SaveIcon,
  FolderIcon,
  TagIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 블록 타입 정의
type BlockType = 
  | "heading1" 
  | "heading2" 
  | "heading3" 
  | "paragraph" 
  | "bulletList" 
  | "numberedList"
  | "todo"
  | "quote"
  | "code"
  | "image"
  | "divider";

interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean; // todo 블록용
  level?: number; // 헤딩 레벨
}

export default function DocumentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [title, setTitle] = useState("제목 없음");
  const [emoji, setEmoji] = useState("📄");
  const [isStarred, setIsStarred] = useState(false);
  const [folder, setFolder] = useState("프로젝트 문서");
  const [tags, setTags] = useState<string[]>(["문서"]);
  const [blocks, setBlocks] = useState<Block[]>([
    { id: "1", type: "paragraph", content: "여기에 내용을 입력하세요..." }
  ]);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  
  const blockRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // 새 문서 작성 페이지인지 확인
  const isNewDocument = params.id === "new";
  
  // 문서 데이터 로드 (실제로는 API 호출)
  useEffect(() => {
    if (isNewDocument) {
      // 새 문서 초기화
      setTitle("제목 없음");
      setEmoji("📄");
      setIsStarred(false);
      setBlocks([{ id: "1", type: "paragraph", content: "여기에 내용을 입력하세요..." }]);
      setActiveBlock("1");
    } else if (params.id === "1") {
      // 샘플 문서 데이터 (실제로는 API에서 가져옴)
      setTitle("제품 로드맵 2024");
      setEmoji("🚀");
      setIsStarred(true);
      setFolder("프로젝트 문서");
      setTags(["로드맵", "전략"]);
      setBlocks([
        { id: "1", type: "heading1", content: "제품 로드맵 2024", level: 1 },
        { id: "2", type: "paragraph", content: "이 문서는 2024년 제품 개발 로드맵을 정리한 문서입니다." },
        { id: "3", type: "heading2", content: "1분기 목표", level: 2 },
        { id: "4", type: "bulletList", content: "사용자 인터페이스 개선" },
        { id: "5", type: "bulletList", content: "성능 최적화" },
        { id: "6", type: "bulletList", content: "모바일 대응성 향상" },
        { id: "7", type: "heading2", content: "2분기 목표", level: 2 },
        { id: "8", type: "todo", content: "새로운 분석 대시보드 개발", checked: false },
        { id: "9", type: "todo", content: "사용자 피드백 시스템 구축", checked: true },
        { id: "10", type: "todo", content: "API 확장 및 문서화", checked: false },
        { id: "11", type: "heading2", content: "3분기 목표", level: 2 },
        { id: "12", type: "paragraph", content: "3분기에는 다음과 같은 기능을 중점적으로 개발할 예정입니다:" },
        { id: "13", type: "numberedList", content: "AI 기반 추천 시스템" },
        { id: "14", type: "numberedList", content: "고급 데이터 시각화 도구" },
        { id: "15", type: "numberedList", content: "협업 기능 강화" },
        { id: "16", type: "heading2", content: "4분기 목표", level: 2 },
        { id: "17", type: "quote", content: "사용자 경험을 최우선으로 생각하며 지속적인 개선을 추구합니다." },
        { id: "18", type: "paragraph", content: "4분기에는 전체 시스템 안정화 및 성능 최적화에 집중할 예정입니다." },
        { id: "19", type: "code", content: "// 예시 코드\nfunction optimizePerformance() {\n  // 성능 최적화 로직\n  return improved;\n}" },
        { id: "20", type: "divider", content: "" },
        { id: "21", type: "paragraph", content: "이 로드맵은 상황에 따라 변경될 수 있습니다." }
      ]);
    }
  }, [params.id, isNewDocument]);
  
  // 블록 추가
  const addBlock = (afterBlockId: string, type: BlockType = "paragraph") => {
    const newBlockId = Date.now().toString();
    const blockIndex = blocks.findIndex(block => block.id === afterBlockId);
    
    if (blockIndex === -1) return;
    
    const newBlock: Block = {
      id: newBlockId,
      type,
      content: "",
      ...(type === "todo" && { checked: false })
    };
    
    const newBlocks = [...blocks];
    newBlocks.splice(blockIndex + 1, 0, newBlock);
    
    setBlocks(newBlocks);
    setActiveBlock(newBlockId);
    
    // 다음 틱에 포커스
    setTimeout(() => {
      blockRefs.current[newBlockId]?.focus();
    }, 0);
  };
  
  // 블록 삭제
  const deleteBlock = (blockId: string) => {
    if (blocks.length <= 1) return;
    
    const blockIndex = blocks.findIndex(block => block.id === blockId);
    if (blockIndex === -1) return;
    
    const newBlocks = blocks.filter(block => block.id !== blockId);
    setBlocks(newBlocks);
    
    // 이전 블록이나 다음 블록으로 포커스 이동
    const nextActiveBlockId = newBlocks[Math.max(0, blockIndex - 1)]?.id;
    setActiveBlock(nextActiveBlockId);
    
    setTimeout(() => {
      blockRefs.current[nextActiveBlockId]?.focus();
    }, 0);
  };
  
  // 블록 타입 변경
  const changeBlockType = (blockId: string, newType: BlockType) => {
    setBlocks(blocks.map(block => 
      block.id === blockId 
        ? { 
            ...block, 
            type: newType, 
            ...(newType === "todo" && { checked: false }),
            ...(newType.startsWith("heading") && { level: parseInt(newType.slice(-1)) })
          } 
        : block
    ));
    setShowBlockMenu(null);
  };
  
  // 블록 내용 변경
  const updateBlockContent = (blockId: string, content: string) => {
    setBlocks(blocks.map(block => 
      block.id === blockId ? { ...block, content } : block
    ));
  };
  
  // 체크박스 토글 (Todo 블록용)
  const toggleTodoCheck = (blockId: string) => {
    setBlocks(blocks.map(block => 
      block.id === blockId && block.type === "todo" 
        ? { ...block, checked: !block.checked } 
        : block
    ));
  };
  
  // 블록 메뉴 표시
  const showBlockTypeMenu = (blockId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({ x: rect.left, y: rect.bottom });
    setShowBlockMenu(blockId);
  };
  
  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;
    
    // Enter: 새 블록 추가
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addBlock(blockId);
    }
    
    // Backspace: 빈 블록 삭제
    if (e.key === "Backspace" && block.content === "") {
      e.preventDefault();
      deleteBlock(blockId);
    }
    
    // Tab: 들여쓰기 (미구현)
    if (e.key === "Tab") {
      e.preventDefault();
      // 들여쓰기 로직 구현 (미구현)
    }
    
    // '/' 입력 시 블록 타입 메뉴 표시
    if (e.key === "/" && block.content === "") {
      showBlockTypeMenu(blockId, e as unknown as React.MouseEvent);
    }
  };
  
  // 문서 저장
  const saveDocument = () => {
    console.log("문서 저장:", { title, emoji, blocks, folder, tags });
    // 실제로는 API 호출
    
    if (isNewDocument) {
      // 새 문서 저장 후 해당 문서 페이지로 리다이렉트
      router.push("/documents/1");
    }
  };
  
  return (
    <div className="min-h-screen bg-white">
      {/* 상단 툴바 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/documents" className="p-2 rounded-md hover:bg-gray-100 mr-2">
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex items-center">
            <button className="text-2xl mr-2">{emoji}</button>
            <div className="text-sm text-gray-500 flex items-center">
              <FolderIcon className="w-4 h-4 mr-1" />
              <span>{folder}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {tags.map((tag, index) => (
              <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            <button className="p-1 rounded-md hover:bg-gray-100">
              <TagIcon className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          
          <button 
            className="p-2 rounded-md hover:bg-gray-100"
            onClick={() => setIsStarred(!isStarred)}
          >
            <StarIcon className={`w-5 h-5 ${isStarred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
          </button>
          
          <button className="p-2 rounded-md hover:bg-gray-100">
            <ShareIcon className="w-5 h-5 text-gray-600" />
          </button>
          
          <button className="p-2 rounded-md hover:bg-gray-100">
            <UsersIcon className="w-5 h-5 text-gray-600" />
          </button>
          
          <button 
            onClick={saveDocument}
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm transition-colors"
          >
            <SaveIcon className="w-4 h-4" />
            <span>저장</span>
          </button>
        </div>
      </div>
      
      {/* 문서 편집 영역 */}
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* 문서 제목 */}
        <div className="mb-8">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-4xl font-bold text-gray-900 border-none outline-none focus:ring-0 p-0"
            placeholder="제목 없음"
          />
        </div>
        
        {/* 블록 목록 */}
        <div className="space-y-2">
          {blocks.map(block => (
            <div 
              key={block.id} 
              className={`relative group ${activeBlock === block.id ? 'ring-2 ring-blue-200 rounded-sm' : ''}`}
            >
              {/* 블록 타입 선택 버튼 */}
              <button
                className="absolute -left-10 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-gray-100"
                onClick={(e) => showBlockTypeMenu(block.id, e)}
              >
                <PlusIcon className="w-4 h-4 text-gray-400" />
              </button>
              
              {/* 블록 내용 */}
              {renderBlock(
                block, 
                activeBlock === block.id,
                (ref) => { blockRefs.current[block.id] = ref; },
                (content) => updateBlockContent(block.id, content),
                () => toggleTodoCheck(block.id),
                (e) => handleKeyDown(e, block.id),
                () => setActiveBlock(block.id)
              )}
            </div>
          ))}
        </div>
        
        {/* 블록 타입 메뉴 */}
        {showBlockMenu && (
          <div 
            className="fixed bg-white shadow-lg rounded-md border border-gray-200 w-64 z-50"
            style={{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }}
          >
            <div className="p-2 border-b border-gray-200">
              <input 
                type="text" 
                placeholder="검색..." 
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                autoFocus
              />
            </div>
            <div className="p-1 max-h-80 overflow-y-auto">
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "paragraph")}
              >
                <TypeIcon className="w-4 h-4 mr-2 text-gray-500" />
                <span>텍스트</span>
              </button>
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "heading1")}
              >
                <span className="w-4 h-4 mr-2 text-gray-500 font-bold">H1</span>
                <span>제목 1</span>
              </button>
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "heading2")}
              >
                <span className="w-4 h-4 mr-2 text-gray-500 font-bold">H2</span>
                <span>제목 2</span>
              </button>
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "heading3")}
              >
                <span className="w-4 h-4 mr-2 text-gray-500 font-bold">H3</span>
                <span>제목 3</span>
              </button>
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "bulletList")}
              >
                <ListIcon className="w-4 h-4 mr-2 text-gray-500" />
                <span>글머리 기호</span>
              </button>
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "numberedList")}
              >
                <span className="w-4 h-4 mr-2 text-gray-500 font-mono">1.</span>
                <span>번호 매기기</span>
              </button>
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "todo")}
              >
                <CheckSquareIcon className="w-4 h-4 mr-2 text-gray-500" />
                <span>할 일</span>
              </button>
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "quote")}
              >
                <span className="w-4 h-4 mr-2 text-gray-500 font-serif">"</span>
                <span>인용구</span>
              </button>
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "code")}
              >
                <CodeIcon className="w-4 h-4 mr-2 text-gray-500" />
                <span>코드</span>
              </button>
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "divider")}
              >
                <span className="w-4 h-4 mr-2 text-gray-500">—</span>
                <span>구분선</span>
              </button>
              <button 
                className="flex items-center w-full px-3 py-2 text-sm text-left hover:bg-gray-100 rounded-md"
                onClick={() => changeBlockType(showBlockMenu, "image")}
              >
                <ImageIcon className="w-4 h-4 mr-2 text-gray-500" />
                <span>이미지</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 블록 렌더링 함수
function renderBlock(
  block: Block,
  isActive: boolean,
  ref: (el: HTMLDivElement | null) => void,
  onChange: (content: string) => void,
  onToggleTodo: () => void,
  onKeyDown: (e: React.KeyboardEvent) => void,
  onFocus: () => void
) {
  const commonProps = {
    ref,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: (e: React.FormEvent<HTMLDivElement>) => onChange(e.currentTarget.textContent || ""),
    onKeyDown,
    onFocus,
    className: "outline-none w-full",
    dangerouslySetInnerHTML: { __html: block.content || "" }
  };
  
  switch (block.type) {
    case "heading1":
      return <h1 {...commonProps} className="text-3xl font-bold mb-4 outline-none" />;
    
    case "heading2":
      return <h2 {...commonProps} className="text-2xl font-bold mb-3 outline-none" />;
    
    case "heading3":
      return <h3 {...commonProps} className="text-xl font-bold mb-2 outline-none" />;
    
    case "bulletList":
      return (
        <div className="flex">
          <div className="mr-2 mt-1.5">•</div>
          <div {...commonProps} />
        </div>
      );
    
    case "numberedList":
      return (
        <div className="flex">
          <div className="mr-2 font-mono">1.</div>
          <div {...commonProps} />
        </div>
      );
    
    case "todo":
      return (
        <div className="flex items-start">
          <input 
            type="checkbox" 
            checked={block.checked} 
            onChange={onToggleTodo}
            className="mt-1.5 mr-2"
          />
          <div 
            {...commonProps} 
            className={`outline-none ${block.checked ? 'line-through text-gray-400' : ''}`} 
          />
        </div>
      );
    
    case "quote":
      return (
        <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-700">
          <div {...commonProps} />
        </blockquote>
      );
    
    case "code":
      return (
        <pre className="bg-gray-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
          <code {...commonProps} />
        </pre>
      );
    
    case "divider":
      return <hr className="my-6 border-t border-gray-300" />;
    
    case "image":
      return (
        <div className="my-4">
          <div className="bg-gray-100 rounded-md p-8 text-center">
            <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">이미지를 추가하려면 클릭하세요</p>
          </div>
        </div>
      );
    
    case "paragraph":
    default:
      return <div {...commonProps} className="outline-none min-h-[1.5em]" />;
  }
} 