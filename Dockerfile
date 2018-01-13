FROM node:8.9.4-alpine

LABEL maintainer="chris@hashlab.com.br"

RUN apk add --no-cache tini bash python make g++

RUN mkdir -p /home/node/app

WORKDIR /home/node/app

COPY package.json package.json
COPY yarn.lock yarn.lock

ENV NODE_ENV production

RUN yarn

COPY . .

EXPOSE 8008

USER node

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["bin/hubot", "--adapter", "slack"]
