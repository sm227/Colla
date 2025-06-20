import React from 'react';
import { XIcon, SettingsIcon, SunIcon, MoonIcon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempSettings: {
    theme: 'light' | 'dark';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      desktop: boolean;
    };
    privacy: {
      profileVisible: boolean;
      activityVisible: boolean;
    };
  };
  onSettingsChange: (settings: any) => void;
  onSave: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  tempSettings,
  onSettingsChange,
  onSave,
}) => {
  if (!isOpen) return null;

  const updateTheme = (theme: 'light' | 'dark') => {
    onSettingsChange({ ...tempSettings, theme });
  };

  const updateNotification = (key: string, value: boolean) => {
    onSettingsChange({
      ...tempSettings,
      notifications: { ...tempSettings.notifications, [key]: value }
    });
  };

  const updatePrivacy = (key: string, value: boolean) => {
    onSettingsChange({
      ...tempSettings,
      privacy: { ...tempSettings.privacy, [key]: value }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="rounded-lg shadow-xl bg-card text-card-foreground">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center mr-4">
                <SettingsIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">설정</h3>
                <p className="text-sm text-muted-foreground">애플리케이션 설정을 관리합니다</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* 설정 내용 */}
          <div className="p-6 space-y-6">
            {/* 외관 설정 */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-4">외관</h4>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">테마</label>
                  <div className="mt-2 flex space-x-3">
                    <button
                      onClick={() => updateTheme('light')}
                      className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
                        tempSettings.theme === 'light'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <SunIcon className="w-4 h-4" />
                      라이트
                    </button>
                    <button
                      onClick={() => updateTheme('dark')}
                      className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 ${
                        tempSettings.theme === 'dark'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <MoonIcon className="w-4 h-4" />
                      다크
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 알림 설정 */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-4">알림</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-foreground">이메일 알림</label>
                    <p className="text-xs text-muted-foreground">중요한 업데이트를 이메일로 받기</p>
                  </div>
                  <button
                    onClick={() => updateNotification('email', !tempSettings.notifications.email)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      tempSettings.notifications.email ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tempSettings.notifications.email ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-foreground">푸시 알림</label>
                    <p className="text-xs text-muted-foreground">브라우저 푸시 알림 받기</p>
                  </div>
                  <button
                    onClick={() => updateNotification('push', !tempSettings.notifications.push)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      tempSettings.notifications.push ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tempSettings.notifications.push ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-foreground">데스크톱 알림</label>
                    <p className="text-xs text-muted-foreground">데스크톱 알림 표시</p>
                  </div>
                  <button
                    onClick={() => updateNotification('desktop', !tempSettings.notifications.desktop)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      tempSettings.notifications.desktop ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tempSettings.notifications.desktop ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            {/* 개인정보 설정 */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-4">개인정보</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-foreground">프로필 공개</label>
                    <p className="text-xs text-muted-foreground">다른 사용자에게 프로필 정보 공개</p>
                  </div>
                  <button
                    onClick={() => updatePrivacy('profileVisible', !tempSettings.privacy.profileVisible)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      tempSettings.privacy.profileVisible ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tempSettings.privacy.profileVisible ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm text-foreground">활동 내역 공개</label>
                    <p className="text-xs text-muted-foreground">프로젝트 활동 내역 공개</p>
                  </div>
                  <button
                    onClick={() => updatePrivacy('activityVisible', !tempSettings.privacy.activityVisible)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      tempSettings.privacy.activityVisible ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      tempSettings.privacy.activityVisible ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 푸터 */}
          <div className="flex justify-end space-x-3 p-6 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
            >
              취소
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 