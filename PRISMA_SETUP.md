# Prisma 설정 가이드

이 프로젝트는 데이터베이스 ORM으로 Prisma를 사용합니다. 아래 단계에 따라 Prisma를 설정하고 마이그레이션을 실행하세요.

## 환경 변수 설정

1. 프로젝트 루트에 `.env` 파일이 없다면 생성하고 다음 내용을 추가하세요:

```
DATABASE_URL="postgresql://username:password@localhost:5432/your_database_name?schema=public"
JWT_SECRET="your_jwt_secret_key"
```

- `DATABASE_URL`을 실제 데이터베이스 연결 정보로 변경하세요.
- `JWT_SECRET`은 토큰 생성 및 검증에 사용되는 비밀 키입니다.

## Prisma 클라이언트 생성

Prisma 스키마가 변경될 때마다 Prisma 클라이언트를 다시 생성해야 합니다:

```bash
npm run prisma:generate
```

## 데이터베이스 마이그레이션

스키마 변경사항을 데이터베이스에 적용하려면 마이그레이션을 실행하세요:

```bash
npm run prisma:migrate
```

이 명령은 새 마이그레이션을 생성하고 데이터베이스에 적용합니다.

## Prisma Studio

데이터베이스 내용을 시각적으로 확인하고 편집하려면 Prisma Studio를 사용하세요:

```bash
npx prisma studio
```

이 명령은 브라우저에서 Prisma Studio를 열어 데이터베이스 테이블을 확인하고 편집할 수 있게 해줍니다.

## 참고 사항

- 프로덕션 환경에서는 `prisma migrate deploy` 명령을 사용하여 마이그레이션을 적용하세요.
- 개발 중에 스키마를 리셋하려면 `npx prisma migrate reset` 명령을 사용하세요 (주의: 모든 데이터가 삭제됩니다).
- 자세한 내용은 [Prisma 공식 문서](https://www.prisma.io/docs)를 참조하세요. 