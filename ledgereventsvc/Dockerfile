FROM node:8-alpine
WORKDIR /ledgereventsvc
COPY package.json /ledgereventsvc
RUN npm install
COPY . /ledgereventsvc
EXPOSE 1010
CMD node ledgereventsvc.js >> ./logs/ledgereventsvc-"$(date +%Y-%m-%d)".log 2>&1
