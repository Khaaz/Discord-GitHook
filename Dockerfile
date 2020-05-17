# from base image node
FROM node:14.2.0-alpine

USER node

RUN mkdir -p /home/node/app
WORKDIR /home/node/app

# copying all the files from your file system to container file system
COPY package.json .

# install all dependencies
RUN yarn

# copy oter files as well
COPY ./ .

#expose the port
EXPOSE 3000

# command to run when intantiate an image
CMD ["yarn","start:pm2"]
