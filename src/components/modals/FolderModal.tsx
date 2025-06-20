import React from 'react';
import { FolderIcon } from 'lucide-react';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  onCreateFolder: () => void;
  isCreating: boolean;
  error?: string;
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  folderName,
  onFolderNameChange,
  onCreateFolder,
  isCreating,
  error,
}) => {
  if (!isOpen) return null;

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating && folderName.trim()) {
      onCreateFolder();
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4">
        <div className="rounded-xl shadow-xl bg-card p-6">
          {/* 헤더 */}
          <div className="mb-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-4">
                <FolderIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">새 폴더 만들기</h3>
              </div>
            </div>
          </div>
          
          {/* 본문 */}
          <div className="mb-6">
            <label htmlFor="folderName" className="block text-sm font-medium text-foreground mb-2">
              폴더 이름
            </label>
            <input
              type="text"
              id="folderName"
              value={folderName}
              onChange={(e) => onFolderNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
              placeholder="폴더 이름을 입력하세요"
              disabled={isCreating}
              onKeyPress={handleKeyPress}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </div>
          
          {/* 버튼 */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
              disabled={isCreating}
            >
              취소
            </button>
            <button
              onClick={onCreateFolder}
              disabled={isCreating || !folderName.trim()}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isCreating ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  생성 중...
                </>
              ) : (
                '폴더 만들기'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 