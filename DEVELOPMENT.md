# 개발 환경 설정 방법

```bash
# 프로젝트 루트 디렉토리에서
npm install         # 루트 디렉토리의 종속성 설치
npm run install:all # 서버 및 클라이언트 종속성 설치
```

## 개발 환경 실행 방법

```bash
# 방법 1: 동시에 서버 및 클라이언트 실행
npm start

# 방법 2: 개별 실행
# 터미널 1
npm run server  # 서버 실행 (http://localhost:3000)

# 터미널 2
npm run client  # 클라이언트 실행 (http://localhost:5173)
```

## 프로덕션 빌드 및 실행

```bash
# 클라이언트 빌드 후 서버 실행
npm run start:prod
```

## 도커 이미지 빌드 방법

```bash
# 도커 이미지 빌드
npm run build:docker
```
