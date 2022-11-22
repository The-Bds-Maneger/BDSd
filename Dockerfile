FROM debian:latest
LABEL org.opencontainers.image.title="Bds Maneger Docker"
LABEL org.opencontainers.image.description="Start Minecraft Server with Docker containers and Auto Control Server wirh Bds Maneger Core."
LABEL org.opencontainers.image.vendor="Sirherobrine23"
LABEL org.opencontainers.image.licenses="AGPL-3.0-or-later"
LABEL org.opencontainers.image.source="https://github.com/The-Bds-Maneger/Container.git"

# Install base core
ARG DEBIAN_FRONTEND="noninteractive"
RUN apt update && \
  apt install -y git curl wget sudo procps zsh tar screen ca-certificates procps lsb-release && \
  apt install -y xdg-utils g++ libatomic1 libnss3 libatk-bridge2.0-0 gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxrandr2 libxrender1 libxss1 libxtst6 fonts-liberation libnss3 libgbm-dev

# Install openjdk
RUN apt update && apt list | grep -E 'openjdk-[0-9\.]+-(jre|jdk)' | grep -v -E 'headless|zero' | cut -d / -f 1 | xargs apt install -y

# Install latest node
RUN (wget -qO- https://raw.githubusercontent.com/Sirherobrine23/DebianNodejsFiles/main/debianInstall.sh | bash) || (curl https://deb.nodesource.com/setup_lts.x | bash - && apt install nodejs -y)

# Install extra libries to Bedrock another archs
RUN if [[ $(uname -m) != "x86_64" ]]; then\
  apt update && apt install -y qemu-user-static unzip && \
  wget -q "https://github.com/The-Bds-Maneger/external_files/raw/main/Linux/libs_amd64.zip" -O /tmp/tmp.zip && \
  unzip -o /tmp/tmp.zip -d / && \
  rm -rfv /tmp/tmp.zip && \
  apt remove -y --purge unzip \
; fi

VOLUME [ "/data" ]
WORKDIR /usr/local/node_app
EXPOSE 3000:3000/tcp
ENV PORT="3000" ENABLE_AUTH="true" PATH="/usr/local/node_app/node_modules/.bin:${PATH}"
ENTRYPOINT [ "bash", "-c", "BDS_HOME=/data DEBUG='bdscore:*,express:*' next dev --port ${PORT:-3000}" ]
COPY package*.json ./
RUN npm install --no-save
COPY ./ ./
RUN npm ci