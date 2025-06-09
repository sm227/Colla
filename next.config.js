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
}

module.exports = nextConfig 