FROM node:8-alpine
WORKDIR /ledgerdatasvc
COPY package.json /ledgerdatasvc
RUN npm install
COPY . /ledgerdatasvc
EXPOSE 8099
CMD PORT=8099 REQUEST_TIMEOUT=100000 node ledgerdatasvc.js >> ./logs/ledgerdatasvc-"$(date +%Y-%m-%d)".log 2>&1