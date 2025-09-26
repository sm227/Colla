#!/bin/bash

# Colla 프로젝트 Docker 배포 스크립트

set -e  # 에러 발생 시 스크립트 중단

echo "🚀 Colla 프로젝트 Docker 배포를 시작합니다..."

# 컬러 출력을 위한 함수
print_status() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

# 환경 변수 파일 확인
if [ ! -f ".env.production" ]; then
    print_error ".env.production 파일이 없습니다."
    print_warning "템플릿 파일을 복사하여 환경 변수를 설정해주세요:"
    echo "cp .env.production.template .env.production"
    exit 1
fi

print_status "환경 변수 파일을 확인했습니다."

# Docker 및 docker-compose 설치 확인
if ! command -v docker &> /dev/null; then
    print_error "Docker가 설치되지 않았습니다. Docker를 먼저 설치해주세요."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose가 설치되지 않았습니다. docker-compose를 먼저 설치해주세요."
    exit 1
fi

print_status "Docker 및 docker-compose가 설치되어 있습니다."

# 기존 컨테이너 중지 및 제거
print_status "기존 컨테이너를 중지하고 제거합니다..."
docker-compose down --remove-orphans || true

# 이미지 빌드
print_status "Docker 이미지를 빌드합니다..."
docker-compose build --no-cache

# 컨테이너 실행
print_status "컨테이너를 실행합니다..."
docker-compose up -d

# 컨테이너 상태 확인
print_status "컨테이너 상태를 확인합니다..."
sleep 10

# 헬스 체크
print_status "애플리케이션 헬스 체크를 수행합니다..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        print_success "메인 애플리케이션이 정상적으로 실행 중입니다!"
        break
    fi

    print_status "애플리케이션 시작을 기다리는 중... ($((RETRY_COUNT + 1))/$MAX_RETRIES)"
    sleep 10
    RETRY_COUNT=$((RETRY_COUNT + 1))
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "애플리케이션 헬스 체크에 실패했습니다."
    print_status "컨테이너 로그를 확인해주세요:"
    echo "docker-compose logs colla-app"
    exit 1
fi

# Hocuspocus 서버 확인
if nc -z localhost 1234; then
    print_success "Hocuspocus 서버가 정상적으로 실행 중입니다!"
else
    print_warning "Hocuspocus 서버에 연결할 수 없습니다. 로그를 확인해주세요:"
    echo "docker-compose logs colla-hocuspocus"
fi

print_success "🎉 배포가 완료되었습니다!"
echo ""
echo "📋 서비스 정보:"
echo "   - 메인 애플리케이션: http://localhost:3000"
echo "   - Hocuspocus 서버: ws://localhost:1234"
echo ""
echo "📊 컨테이너 상태 확인: docker-compose ps"
echo "📝 로그 확인: docker-compose logs -f"
echo "🔄 서비스 재시작: docker-compose restart"
echo "⏹️  서비스 중지: docker-compose down"