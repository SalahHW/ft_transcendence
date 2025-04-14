FROM node:18

RUN apt-get update && apt-get upgrade -y && apt-get install -y \
    git \
    build-essential \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENTRYPOINT npm install && bash
