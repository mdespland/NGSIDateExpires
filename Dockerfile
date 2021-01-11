FROM node
WORKDIR /app
COPY . /app/
RUN npm install -g
ENTRYPOINT ["npm", "start", "--"]