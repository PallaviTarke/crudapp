# Use official lightweight Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install only production deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Set environment
ENV NODE_ENV=production
EXPOSE 4000

# Start backend
CMD ["node", "server.js"]









#FROM node:18-alpine
#
#WORKDIR /app
#
#COPY package.json package-lock.json ./
#RUN npm install
#
#COPY . .
#
#ENV NODE_ENV=production
#
#CMD ["node", "server.js"]
