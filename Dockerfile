FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
