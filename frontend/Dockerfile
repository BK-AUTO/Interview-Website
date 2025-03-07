FROM node:18-alpine

WORKDIR /app

# Copy both package.json and package-lock.json
COPY package*.json ./

# Install dependencies including vite from devDependencies
RUN npm install -g vite
RUN npm install

COPY . .

EXPOSE 3000

# Use dev script with host flag for Docker
CMD ["npm", "run", "dev"]