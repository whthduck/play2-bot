# PREPARE NODE_MODULES IN PRODUCTION MODE
FROM node:16-alpine as runner
WORKDIR /usr/src/app
COPY package.json ./
RUN yarn global add --production --add-python-to-path windows-build-tools
RUN yarn add solium
RUN yarn --non-interactive --prod && yarn autoclean

# COPY FROM PREVIOUS STAGES  
FROM runner
WORKDIR /usr/src/app
COPY --from=runner /usr/src/app/node_modules node_modules
COPY . .
USER 1
CMD ["yarn", "prod"]
