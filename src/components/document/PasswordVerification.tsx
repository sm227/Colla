"use client";

import { useState } from "react";
import { KeyIcon, EyeIcon, EyeOffIcon } from "lucide-react";

interface PasswordVerificationProps {
  documentId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function PasswordVerification({ documentId, onSuccess, onCancel }: PasswordVerificationProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError("암호를 입력해주세요.");
      return;
    }
    
    try {
      setIsVerifying(true);
      setError("");
      
      const response = await fetch(`/api/documents/${documentId}/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "암호 확인 중 오류가 발생했습니다.");
      }
      
      // 암호 확인 성공
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-medium">문서 암호 확인</h3>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <form onSubmit={handleVerify} className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-4">
              이 문서는 암호로 보호되어 있습니다. 접근하시려면 암호를 입력해주세요.
            </p>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                암호
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 sm:text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="문서 접근 암호 입력"
                  autoFocus
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="text-sm text-red-600 mt-2">
                {error}
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                취소
              </button>
            )}
            <button
              type="submit"
              disabled={isVerifying}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isVerifying ? "확인 중..." : "확인"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 