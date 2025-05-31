# Build stage
FROM node:20-alpine AS build

WORKDIR /build

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Production stage - lighter image
FROM node:20-alpine AS production

WORKDIR /frontend

# Install serve for lightweight serving
RUN npm install -g serve@latest

# Copy built assets from build stage
COPY --from=build /build/dist ./dist

# Expose port
EXPOSE 5200

# Run with serve
CMD ["serve", "-s", "dist", "-l", "5200"]