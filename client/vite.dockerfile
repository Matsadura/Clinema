FROM node:18-alpine

WORKDIR /movie_name/client

COPY /client/package*.json .

RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]

