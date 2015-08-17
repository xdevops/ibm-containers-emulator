FROM node:slim

COPY . /hello
RUN cd /hello; npm install express --save

EXPOSE 5000
ENTRYPOINT ["node", "/hello/app.js"]
