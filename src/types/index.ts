// 사용자 타입 정의
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

// 로그인 요청 타입
export interface LoginRequest {
  email: string;
  password: string;
}

// 회원가입 요청 타입
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// API 응답 타입
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
} 