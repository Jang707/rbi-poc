#!/bin/bash

echo "===== PixelPush RBI PoC 초기화 스크립트 ====="

# Git 초기화
echo "Git 저장소 초기화 중..."
git init

# 첫 번째 커밋 준비
git add .

# 첫 번째 커밋
git commit -m "Initial project setup for PixelPush RBI PoC"

# 기본 브랜치 이름 변경
git branch -M main

# GitHub 원격 저장소 추가 (실제 저장소 생성 후 사용)
git remote add origin https://github.com/Jang707/rbi-poc.git

# 종속성 설치
echo ""
echo "===== 종속성 설치 중... ====="

# 루트 디렉토리 종속성 설치
npm install

# 클라이언트 종속성 설치
echo ""
echo "클라이언트 종속성 설치 중..."
cd client && npm install
cd ..

# 서버 종속성 설치 (Windows 호환성 처리 포함)
echo ""
echo "서버 종속성 설치 중..."
cd server && npm install
cd ..

echo ""
echo "===== 설정 완료! ====="
echo ""
echo "다음 명령어로 애플리케이션을 시작할 수 있습니다:"
echo "npm start"
echo ""
echo "GitHub에 푸시하려면 다음 명령어를 사용하세요:"
echo "git push -u origin main"
echo ""
echo "Docker 이미지를 빌드하려면 다음 명령어를 사용하세요:"
echo "cd docker && docker build -t pixelpush-rbi ."
