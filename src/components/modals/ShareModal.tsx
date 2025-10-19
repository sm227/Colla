import React, { useState, useEffect } from 'react';
import { XIcon, CopyIcon, CheckIcon, LinkIcon } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

export function ShareModal({ isOpen, onClose, documentId }: ShareModalProps) {
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isShareEnabled, setIsShareEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string>('');

  // 모달이 열릴 때 자동으로 공유 활성화
  useEffect(() => {
    if (isOpen && documentId) {
      enableSharing();
    }
  }, [isOpen, documentId]);

  const enableSharing = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 먼저 현재 상태 확인
      const statusResponse = await fetch(`/api/documents/${documentId}/share`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();

        // 이미 공유가 활성화되어 있으면 그대로 사용
        if (statusData.isShareEnabled && statusData.shareUrl) {
          setIsShareEnabled(true);
          setShareUrl(statusData.shareUrl);
          setIsLoading(false);
          return;
        }
      }

      // 공유가 비활성화되어 있으면 활성화
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enable: true,
        }),
      });

      if (!response.ok) {
        throw new Error('공유 링크 생성 실패');
      }

      const data = await response.json();
      setIsShareEnabled(true);
      setShareUrl(data.shareUrl || '');
    } catch (error) {
      console.error('공유 활성화 실패:', error);
      setError('공유 링크 생성 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('클립보드 복사 실패:', error);
      setError('링크 복사에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#2a2a2c] rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <LinkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              문서 공유
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-4">
          {/* 로딩 중 */}
          {isLoading && !shareUrl && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-gray-600 dark:text-gray-400">공유 링크 생성 중...</p>
              </div>
            </div>
          )}

          {/* 공유 링크 */}
          {!isLoading && shareUrl && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  공유 링크
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="w-4 h-4" />
                        <span>복사됨</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-4 h-4" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      프로젝트 멤버가 아닌 사용자는 <strong>읽기 전용 모드</strong>로만
                      문서를 볼 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
