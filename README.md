<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=fitspec

# 애플리케이션 설정
NODE_ENV=development
PORT=3000

# JWT 설정
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

애플리케이션을 실행하면 TypeORM이 Code First 방식으로 데이터베이스 스키마를 자동 생성합니다.

## 인증 API

### 회원가입

```bash
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "gymName": "헬스장 이름",
  "ownerName": "사장 이름"
}
```

### 로그인

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

응답:

- `accessToken`: 액세스 토큰 (15분 유효)
- `gym`: 사용자 정보
- `refreshToken`: 쿠키에 자동 저장 (7일 유효)

### 토큰 갱신

```bash
POST /auth/refresh
```

쿠키에서 리프레시 토큰을 읽어서 새로운 액세스 토큰을 발급합니다.

### 로그아웃

```bash
POST /auth/logout
```

리프레시 토큰을 무효화하고 쿠키를 삭제합니다.

## 보안 기능

- **패스워드 해시화**: bcrypt를 사용하여 패스워드를 해시화하여 저장
- **리프레시 토큰 해시화**: DB에 저장되는 리프레시 토큰은 해시화되어 저장
- **HTTP-only 쿠키**: 리프레시 토큰은 HTTP-only 쿠키에 저장되어 XSS 공격 방지
- **SameSite 쿠키**: CSRF 공격 방지

## 체력 측정 결과 처리 API

### 개요

회원의 체력 측정 결과를 받아 데이터베이스에 저장하고, 나이와 체중을 고려한 등급을 자동으로 계산하여 반환하는 API입니다.

### 엔드포인트

```bash
POST /members/calculate-measurements
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### 요청 본문

```json
{
  "memberId": 10,
  "measurements": [
    {
      "categoryId": 1,
      "value": 100,
      "trainerFeedback": "좋은 자세로 수행했습니다." // 선택사항
    },
    { "categoryId": 2, "value": 15 },
    { "categoryId": 3, "value": 60 },
    { "categoryId": 4, "value": 140 },
    { "categoryId": 5, "value": 55 }
  ]
}
```

**필드 설명:**

- `memberId`: 측정할 회원의 ID
- `measurements`: 측정 결과 배열
  - `categoryId`: 운동 종목 카테고리 ID (필수)
  - `value`: 측정값 (필수, 0 이상)
  - `trainerFeedback`: 트레이너 피드백 (선택사항)

### 응답 구조

```json
{
  "results": [
    {
      "categoryId": 1,
      "exerciseName": "벤치프레스",
      "value": 100,
      "unit": "kg",
      "score": 3,
      "adjustedLevels": {
        "elite": 150.5,
        "advanced": 109.76,
        "intermediate": 85.2,
        "novice": 65.3,
        "beginner": 45.1
      }
    }
  ]
}
```

**응답 필드 설명:**

- `categoryId`: 운동 종목 카테고리 ID
- `exerciseName`: 운동 종목 이름
- `value`: 측정값
- `unit`: 단위 (kg, reps 등)
- `score`: 등급 점수 (1~5)
- `adjustedLevels`: 나이 계수를 적용한 각 등급별 기준치

### 처리 로직 상세 설명

#### 1단계: 회원 정보 조회

- `memberId`와 `gymId`로 회원 존재 여부 확인
- 회원의 **성별(gender)**, **나이(age)**, **체중(weight)** 정보 추출

#### 2단계: 트랜잭션 시작

- TypeORM의 QueryRunner를 사용하여 트랜잭션 시작
- 모든 측정값 저장이 성공해야만 커밋되며, 하나라도 실패하면 전체 롤백

#### 3단계: 각 측정값 처리 (반복)

각 측정값에 대해 다음 과정을 수행합니다:

##### 3-1. 카테고리 정보 조회

- `categoryId`로 `test_categories` 테이블에서 운동 종목 정보 조회
- 운동 이름(`name`)과 단위(`unit`) 추출

##### 3-2. 평가 기준 조회 (체중 매칭)

- `evaluation_standards` 테이블에서 다음 조건으로 검색:
  - 회원의 성별(`gender`)과 일치
  - 카테고리 ID(`categoryId`)와 일치
  - 체중(`bodyWeight`)이 회원 체중보다 작거나 같음
- **가장 가까운 내림값(Floor)**을 찾기 위해 `bodyWeight DESC`로 정렬하여 첫 번째 결과 선택
- 예: 회원 체중이 75kg이고 표에 70kg, 75kg, 80kg이 있다면 → 75kg 선택

##### 3-3. 나이 계수 조회

- `age_coefficients` 테이블에서 다음 조건으로 검색:
  - 회원의 성별(`gender`)과 일치
  - 카테고리 ID(`categoryId`)와 일치
  - 나이(`age`)가 회원 나이보다 작거나 같은 값 중 최대값
  - 나이(`age`)가 회원 나이보다 큰 값 중 최소값
- **가장 가까운 나이**의 계수를 선택 (위/아래 중 차이가 작은 쪽)
- 예: 회원 나이가 32세이고 표에 30세, 35세만 있다면 → 30세와 35세 중 더 가까운 값 선택

##### 3-4. 기준치 보정 (나이 계수 적용)

- 각 등급(Beginner, Novice, Intermediate, Advanced, Elite)의 기준치에 나이 계수를 곱함
- **수식**: `보정된 기준치 = 기준표 수치 × 나이 계수`
- 예: Intermediate 기준치가 100이고 나이 계수가 0.95라면 → 95

##### 3-5. 등급 판정

- 보정된 기준치를 높은 순서(Elite → Advanced → Intermediate → Novice → Beginner)로 확인
- 측정값(`value`)이 보정된 기준치 이상인 **최상위 등급**을 현재 등급으로 결정
- 등급에 따른 점수(score) 할당:
  - Beginner: 1점
  - Novice: 2점
  - Intermediate: 3점
  - Advanced: 4점
  - Elite: 5점

##### 3-6. 데이터베이스 저장

- `physical_records` 테이블에 다음 정보 저장:
  - `value`: 측정값
  - `measuredAt`: 측정 일시 (한국 시간대, YYYY-MM-DD HH:mm:ss 형식)
  - `weightAtMeasured`: 측정 당시 몸무게
  - `heightAtMeasured`: 측정 당시 키
  - `ageAtMeasured`: 측정 당시 나이
  - `gradeScore`: 등급 점수 (1~5)
  - `trainerFeedback`: 트레이너 피드백 (있는 경우)
  - `member_id`: 회원 ID
  - `category_id`: 카테고리 ID

#### 4단계: 트랜잭션 커밋

- 모든 측정값이 성공적으로 저장되면 트랜잭션 커밋
- 에러 발생 시 자동 롤백

#### 5단계: 결과 반환

- 각 종목별 상세 결과와 보정된 기준치를 포함한 응답 반환

### 등급 체계

```
Beginner (1점) → Novice (2점) → Intermediate (3점) → Advanced (4점) → Elite (5점)
```

### 주요 특징

1. **트랜잭션 처리**: 모든 측정값이 원자적으로 저장되며, 하나라도 실패하면 전체 롤백
2. **나이 보정**: 나이에 따른 체력 감소를 고려한 계수 적용
3. **체중 매칭**: 회원 체중과 가장 가까운 내림값의 평가 기준 사용
4. **가장 가까운 나이 계수**: 정확한 나이가 없을 경우 가장 가까운 나이의 계수 사용
5. **측정 시점 정보 저장**: 측정 당시의 몸무게, 키, 나이를 함께 저장하여 추후 분석 가능

### 에러 처리

- 회원을 찾을 수 없는 경우: `404 NotFoundException`
- 카테고리를 찾을 수 없는 경우: `404 NotFoundException`
- 평가 기준을 찾을 수 없는 경우: `404 NotFoundException`
- 나이 계수를 찾을 수 없는 경우: `404 NotFoundException`
- 트랜잭션 중 에러 발생 시: 자동 롤백 후 에러 반환

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## 배포 (Deployment)

프로덕션 환경에 NestJS 애플리케이션을 배포할 준비가 되었다면, 효율적으로 실행되도록 하기 위한 몇 가지 주요 단계가 있습니다. 자세한 내용은 [NestJS 배포 문서](https://docs.nestjs.com/deployment)를 참조하세요.

클라우드 기반 플랫폼에서 NestJS 애플리케이션을 배포하려면 [Mau](https://mau.nestjs.com)를 확인해보세요. NestJS 애플리케이션을 AWS에 배포하기 위한 공식 플랫폼입니다.

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

## 유용한 리소스

NestJS 작업 시 유용한 리소스들:

- [NestJS 공식 문서](https://docs.nestjs.com) - 프레임워크에 대해 더 알아보기
- [Discord 채널](https://discord.gg/G7Qnnhy) - 질문 및 지원
- [공식 비디오 강의](https://courses.nestjs.com/) - 실습 경험 쌓기
- [NestJS Devtools](https://devtools.nestjs.com) - 애플리케이션 그래프 시각화 및 실시간 상호작용

## 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
