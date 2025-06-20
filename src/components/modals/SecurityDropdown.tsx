import React from 'react';
import { UsersIcon, ShieldIcon, KeyIcon } from 'lucide-react';

interface SecurityDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onAccessPermissions: () => void;
  onPermissionHistory: () => void;
  onPasswordSettings: () => void;
  isPasswordProtected?: boolean;
}

export const SecurityDropdown: React.FC<SecurityDropdownProps> = ({
  isOpen,
  onClose,
  onAccessPermissions,
  onPermissionHistory,
  onPasswordSettings,
  isPasswordProtected = false,
}) => {
  if (!isOpen) return null;

  const handleMenuClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-[#2a2a2c] rounded-xl shadow-lg z-10 border border-gray-100 dark:border-gray-700 py-1 overflow-hidden">
      <div className="py-1">
        <button 
          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors" 
          onClick={() => handleMenuClick(onAccessPermissions)}
        >
          <UsersIcon className="w-4 h-4 mr-2" />
          <span>접근 권한 설정</span>
        </button>
        
        <button 
          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors" 
          onClick={() => handleMenuClick(onPermissionHistory)}
        >
          <ShieldIcon className="w-4 h-4 mr-2" />
          <span>권한 이력 보기</span>
        </button>
        
        <button 
          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-colors" 
          onClick={() => handleMenuClick(onPasswordSettings)}
        >
          <KeyIcon className="w-4 h-4 mr-2" />
          <span>{isPasswordProtected ? "암호 변경" : "암호 설정"}</span>
        </button>
      </div>
    </div>
  );
}; 