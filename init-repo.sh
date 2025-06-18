#!/bin/bash

# Git 초기화
git init

# 첫 번째 커밋 준비
git add .

# 첫 번째 커밋
git commit -m "Initial project setup for PixelPush RBI PoC"

# 기본 브랜치 이름 변경
git branch -M main

# GitHub 원격 저장소 추가 (실제 저장소 생성 후 사용)
git remote add origin https://github.com/Jang707/rbi-poc.git

# 푸시
echo "Repository initialized and files committed."
echo "To push to GitHub, use: git push -u origin main"
echo "Make sure the GitHub repository has been created first."
