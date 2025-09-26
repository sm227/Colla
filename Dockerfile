# Multi-stage build를 위한 Dockerfile
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 종속성 설치
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 빌드 스테이지
FROM node:22-alpine AS builder
WORKDIR /app

# 빌드 인수 받기
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# 종속성 복사
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 환경 변수 설정 (빌드 시 필요)
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Prisma 클라이언트 생성
RUN npx prisma generate

# Next.js 빌드 및 서버 빌드
RUN npm run build

# 런타임 스테이지
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# 시스템 사용자 생성
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 필요한 파일들만 복사
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/hocuspocus-server.js ./

# 권한 설정
USER nextjs

# 포트 노출
EXPOSE 3000 1234

# 컨테이너 시작 시 실행될 명령어
CMD ["node", "dist/server.js"]