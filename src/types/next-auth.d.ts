import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * NextAuth 세션 타입 확장
   */
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  /**
   * JWT 토큰 타입 확장
   */
  interface JWT {
    id: string;
  }
} 