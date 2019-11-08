FROM node:alpine as base
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY ./package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY . .

FROM base as prod

CMD ["node", "./src/server.js"]

FROM base as dev
ENV NODE_ENV=development
ENV PATH /app/node_modules/.bin/:$PATH
EXPOSE 9229
RUN npm install --only=development
CMD ["nodemon", "--legacy-watch", "--inspect=0.0.0.0", "./src/server.js"]

#FROM base as test
#ENV PATH /app/node_modules/.bin/:$PATH
#EXPOSE 9229
#RUN npm run test

# COPY --from=builder /app/build /app/public

