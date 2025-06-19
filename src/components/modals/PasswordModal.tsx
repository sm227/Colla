"use client";

import { useState } from "react";
import { XIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { useTheme } from "next-themes";

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPassword: string | null;
  isPasswordProtected: boolean;
  onSave: (password: string | null, isProtected: boolean) => void;
  isLoading: boolean;
}

export function PasswordModal({ 
  isOpen, 
  onClose, 
  currentPassword, 
  isPasswordProtected, 
  onSave, 
  isLoading 
}: PasswordModalProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  
  const [password, setPassword] = useState(currentPassword || '');
  const [confirmPassword, setConfirmPassword] = useState(currentPassword || '');
  const [isProtected, setIsProtected] = useState(isPasswordProtected);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (isProtected) {
      if (password !== confirmPassword) {
        alert('비밀번호가 일치하지 않습니다.');
        return;
      }
      if (password.length < 4) {
        alert('비밀번호는 최소 4자 이상이어야 합니다.');
        return;
      }
    }
    
    onSave(isProtected ? password : null, isProtected);
  };

  const handleToggleProtection = (isProtectedValue: boolean) => {
    setIsProtected(isProtectedValue);
    if (!isProtectedValue) {
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className={`${isDarkMode ? 'bg-[#1f1f21] border-gray-700' : 'bg-white border-gray-200'} border rounded-lg shadow-lg max-w-md w-full mx-4`}>
        {/* 헤더 */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            🔒 문서 보안 설정
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-md hover:${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
            disabled={isLoading}
          >
            <XIcon className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 보호 설정 토글 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="no-protection"
                name="protection"
                checked={!isProtected}
                onChange={() => handleToggleProtection(false)}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="no-protection" className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>
                비밀번호 보호 없음
              </label>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="with-protection"
                name="protection"
                checked={isProtected}
                onChange={() => handleToggleProtection(true)}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="with-protection" className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>
                비밀번호로 보호
              </label>
            </div>
          </div>

          {/* 비밀번호 입력 (보호 설정 시에만 표시) */}
          {isProtected && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="최소 4자 이상 입력하세요"
                    className={`w-full px-3 py-2 pr-10 rounded-md border ${
                      isDarkMode 
                        ? 'bg-[#2a2a2c] border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  비밀번호 확인
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="비밀번호를 다시 입력하세요"
                    className={`w-full px-3 py-2 pr-10 rounded-md border ${
                      isDarkMode 
                        ? 'bg-[#2a2a2c] border-gray-600 text-white placeholder-gray-400 focus:border-blue-500' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                    } focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    {showConfirmPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                ⚠️ 비밀번호를 잊어버리면 문서에 접근할 수 없으니 주의하세요.
              </p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className={`flex justify-end space-x-3 p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md transition-colors ${
              isLoading ? 'cursor-not-allowed opacity-50' : ''
            } ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'}`}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={`px-4 py-2 rounded-md transition-colors ${
              isLoading ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-600'
            } bg-blue-500 text-white`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>저장 중...</span>
              </div>
            ) : (
              '저장'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 