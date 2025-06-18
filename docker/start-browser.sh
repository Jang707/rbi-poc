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
  chromium --no-sandbox --disable-gpu --disable-software-rasterizer --disable-dev-shm-usage --start-maximized --remote-debugging-port=9222 "http://example.com"
fi

# 프로세스가 종료되지 않도록 대기
echo "Browser environment is running..."
tail -f /dev/null
