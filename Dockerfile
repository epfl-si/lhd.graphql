# pull official base image
FROM node:16

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# install app dependencies
COPY package.json ./
COPY yarn.lock ./
ADD prisma ./prisma
ADD schema ./schema
COPY nexus ./nexus
# Installs all node packages
RUN yarn

# Copies everything over to Docker environment
COPY . ./
EXPOSE 3001
# start app
CMD ["yarn", "start"]