/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  typescript: {
    // !! 경고 !!
    // 타입 오류가 있어도 프로덕션 빌드를 성공시키게 합니다.
    ignoreBuildErrors: true,
  },
  // 파일 업로드를 위한 설정
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Docker 배포를 위한 설정
  output: 'standalone',
  // 프로덕션 최적화
  compress: true,
  poweredByHeader: false,
  // 이미지 최적화 설정
  images: {
    unoptimized: false,
    domains: [],
  },
  // 환경별 설정
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

}

module.exports = nextConfig 