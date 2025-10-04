FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build for production
RUN npm run build

EXPOSE 5700

# Use preview for production build
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5700"]