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
  // API routes 설정
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

module.exports = nextConfig 