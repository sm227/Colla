# Docker 배포 가이드

Colla 프로젝트를 우분투 서버에서 Docker로 배포하기 위한 가이드입니다.

## 📋 사전 준비사항

### 1. 시스템 요구사항
- Ubuntu Server 18.04 이상
- Docker 20.10.0 이상
- docker-compose 1.29.0 이상
- 최소 4GB RAM
- 최소 10GB 디스크 공간

### 2. Docker 설치
```bash
# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose 설치
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 🚀 배포 과정

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd Video-conferencing-platforms
```

### 2. 환경 변수 설정
`.env.production` 파일을 수정하여 프로덕션 환경에 맞게 설정합니다:

```bash
cp .env.production .env.production.local
nano .env.production.local
```

**중요: 다음 값들을 실제 환경에 맞게 수정해주세요:**

- `DATABASE_URL`: 외부 PostgreSQL 컨테이너의 연결 정보
- `NEXT_PUBLIC_SOCKET_URL`: 프로덕션 도메인 URL
- `NEXT_PUBLIC_MEET_SOCKET_URL`: 프로덕션 도메인 URL
- API 키들을 프로덕션 환경용으로 교체

### 3. 외부 PostgreSQL 컨테이너 연결
기존에 실행 중인 PostgreSQL 컨테이너와 연결하기 위해 네트워크를 확인합니다:

```bash
# 기존 PostgreSQL 컨테이너가 사용하는 네트워크 확인
docker network ls
docker inspect <postgres-container-name>
```

`docker-compose.yml`에서 `database-network` 부분을 실제 네트워크명으로 수정합니다.

### 4. 배포 실행
```bash
# 배포 스크립트 실행 권한 부여
chmod +x deploy.sh

# 배포 실행
./deploy.sh
```

### 5. 서비스 확인
배포 완료 후 다음 URL들을 통해 서비스를 확인할 수 있습니다:

- 메인 애플리케이션: `http://your-server-ip:3000`
- 헬스 체크: `http://your-server-ip:3000/api/health`
- Hocuspocus 서버: `ws://your-server-ip:1234`

## 🔧 관리 명령어

### 컨테이너 상태 확인
```bash
docker-compose ps
```

### 로그 확인
```bash
# 모든 서비스 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f colla-app
docker-compose logs -f colla-hocuspocus
```

### 서비스 재시작
```bash
# 모든 서비스 재시작
docker-compose restart

# 특정 서비스 재시작
docker-compose restart colla-app
```

### 서비스 중지
```bash
docker-compose down
```

### 이미지 재빌드
```bash
docker-compose build --no-cache
docker-compose up -d
```

## 🛠️ 트러블슈팅

### 1. 데이터베이스 연결 실패
```bash
# 데이터베이스 연결 확인
docker-compose exec colla-app npx prisma db push

# 환경 변수 확인
docker-compose exec colla-app printenv | grep DATABASE_URL
```

### 2. Prisma 관련 오류
```bash
# Prisma 클라이언트 재생성
docker-compose exec colla-app npx prisma generate
```

### 3. 포트 충돌
현재 사용 중인 포트를 확인하고 `docker-compose.yml`에서 다른 포트로 변경합니다:
```bash
netstat -tulpn | grep :3000
netstat -tulpn | grep :1234
```

### 4. 메모리 부족
```bash
# 시스템 리소스 확인
free -h
docker stats
```

### 5. 로그에서 오류 확인
```bash
# 상세한 오류 로그 확인
docker-compose logs --tail=100 colla-app
```

## 🔄 업데이트 배포

새로운 버전을 배포할 때:

```bash
# 코드 업데이트
git pull origin main

# 컨테이너 중지
docker-compose down

# 이미지 재빌드 및 실행
docker-compose build --no-cache
docker-compose up -d

# 상태 확인
docker-compose ps
```

## 📊 모니터링

### 헬스 체크 API
```bash
curl http://localhost:3000/api/health
```

### 시스템 리소스 모니터링
```bash
# 컨테이너 리소스 사용량
docker stats

# 디스크 사용량
df -h

# 메모리 사용량
free -h
```

## 🔐 보안 고려사항

1. `.env.production` 파일에 민감한 정보가 포함되어 있으므로 적절한 권한 설정
2. 방화벽에서 필요한 포트만 열기 (3000, 1234)
3. SSL/TLS 인증서 설정 (nginx 등 리버스 프록시 사용 권장)
4. 정기적인 보안 업데이트 적용

## 📞 지원

배포 관련 문제가 발생할 경우:
1. 로그를 확인하여 오류 메시지 확인
2. 환경 변수 설정 재검토
3. 네트워크 및 포트 설정 확인
4. 시스템 리소스 상태 점검