# PREPARE NODE_MODULES IN PRODUCTION MODE
FROM node:16-alpine as runner
WORKDIR /usr/src/app
COPY package.json ./
RUN yarn global add --production --add-python-to-path windows-build-tools
RUN yarn add solium
RUN yarn --non-interactive --prod && yarn autoclean

# BUILD FROM SOURCE
FROM runner as builder
WORKDIR /usr/src/app
# RUN npm install -g typescript@4.3.2
COPY . .
RUN yarn 
RUN yarn build

# COPY FROM PREVIOUS STAGES  
FROM runner
WORKDIR /usr/src/app
COPY --from=runner /usr/src/app/node_modules node_modules
COPY --from=builder /usr/src/app/dist dist
USER 1
CMD ["yarn", "prod"]