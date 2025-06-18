FROM rockylinux:9

# 필요한 레포지토리 설정
RUN dnf -y update && dnf -y install epel-release

# 필수 패키지 설치
RUN dnf -y install \
    xorg-x11-server-Xvfb \
    chromium \
    x11vnc \
    ffmpeg \
    nodejs \
    npm \
    xdotool \
    procps-ng \
    sudo \
    net-tools

# 작업 디렉토리 설정
WORKDIR /app

# 스크립트 추가
COPY start-browser.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/start-browser.sh

# 노출할 포트 설정 
EXPOSE 8080 8443

# 시작점 설정
ENTRYPOINT ["/usr/local/bin/start-browser.sh"]
