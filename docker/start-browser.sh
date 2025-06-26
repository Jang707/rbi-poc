#!/bin/bash

# Xvfb 설정 (가상 디스플레이 서버)
export DISPLAY=:99
Xvfb $DISPLAY -screen 0 1920x1080x24 &
sleep 1

# x11vnc 시작 (화면 캡처를 위한 VNC 서버)
x11vnc -display $DISPLAY -forever -nopw -quiet &
sleep 1

# 스트리밍 서버 실행 여부를 확인하는 인자
if [ "$1" == "server" ]; then
  echo "Starting Node.js server..."
  cd /app/server && npm start
else
  # 헤드리스 Chrome 실행
  echo "Starting headless Chromium..."
  
  # 여러 가능한 경로 시도
  if command -v /usr/bin/chromium &> /dev/null; then
    CHROME_PATH="/usr/bin/chromium"
  elif command -v /usr/bin/chromium-browser &> /dev/null; then
    CHROME_PATH="/usr/bin/chromium-browser"
  elif command -v chromium &> /dev/null; then
    CHROME_PATH="chromium"
  elif command -v chromium-browser &> /dev/null; then
    CHROME_PATH="chromium-browser" 
  else
    echo "Error: Chromium not found"
    exit 1
  fi
  
  echo "Using Chromium at: $CHROME_PATH"
  $CHROME_PATH --no-sandbox --disable-gpu --disable-software-rasterizer --disable-dev-shm-usage --start-maximized --remote-debugging-port=9222 "http://example.com"
fi

# 프로세스가 종료되지 않도록 대기
echo "Browser environment is running..."
tail -f /dev/null
