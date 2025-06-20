import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://colla-peach.vercel.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // API 경로는 크롤링 금지
          '/admin/',         // 관리자 페이지 크롤링 금지
          '/private/',       // 비공개 페이지 크롤링 금지
          '/_next/',         // Next.js 내부 파일 크롤링 금지
          '/socket/',        // 소켓 경로 크롤링 금지
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/private/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
} 