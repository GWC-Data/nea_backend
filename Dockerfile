FROM node:20.18.0-slim

WORKDIR /usr/src/app/~~name~~

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# Remove source files to reduce image size
RUN rm -rf src test node_modules/@types

EXPOSE 5050

CMD ["npm", "run", "start"]