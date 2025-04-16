FROM node:18

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install

CMD ["bash"]
