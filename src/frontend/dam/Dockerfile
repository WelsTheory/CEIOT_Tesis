FROM node:20

WORKDIR /src/frontend/dam

COPY package*.json ./

RUN npm install -g @ionic/cli @angular-devkit/build-angular && npm install

COPY . .

EXPOSE 8100

CMD ["ionic", "serve", "--external", "--host", "0.0.0.0", "--port", "8100", "--no-open", "--disable-host-check"]
