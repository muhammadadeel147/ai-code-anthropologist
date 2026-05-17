FROM node:20-alpine

# Install git for repository cloning
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Create storage directory
RUN mkdir -p /app/storage/repositories

# Expose port
EXPOSE 4000

# Start application
CMD ["npm", "start"]

# Made with Bob
