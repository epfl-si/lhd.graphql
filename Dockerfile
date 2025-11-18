# pull official base image
FROM node:20

# set working directory
WORKDIR /app

# add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH
ENV HAZARD_DOCUMENT_FOLDER=hazards/
ENV DOCUMENTS_PATH=/var/documents

# install app dependencies
COPY package.json ./
COPY yarn.lock ./
# Installs all node packages
RUN env INSTALL_ONLY=1 yarn

# Copies everything over to Docker environment
COPY . ./

# Runs yarn a second time to generate types from the Prisma schema
RUN yarn codegen
EXPOSE 3001
# start app
CMD ["yarn", "start"]
