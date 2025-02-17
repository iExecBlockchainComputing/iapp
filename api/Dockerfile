FROM node:20.18-alpine

# Curl installation for healthchek set-up
RUN apk add --no-cache curl

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json .
COPY package-lock.json .

RUN npm ci --omit=dev && \
    rm -rf /var/cache/apk/*

# Copy the rest of the application code
COPY /src ./src

# Expose port 3000
EXPOSE 3000

# Start the app
CMD ["npm", "run", "start"]
