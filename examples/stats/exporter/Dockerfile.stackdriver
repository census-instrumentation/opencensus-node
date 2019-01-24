FROM node:10

WORKDIR /usr/src/app

COPY package.json .
RUN npm install

COPY stackdriver.js .
COPY test.txt .

ENTRYPOINT ["node","stackdriver.js"]