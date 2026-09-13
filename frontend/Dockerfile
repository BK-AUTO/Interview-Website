# Stage 1: Build React application
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm v9 (matching lockfileVersion 9.0)
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./

# Install dependencies using frozen lockfile
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build arg for VITE_API_URL (defaults to empty string for Nginx reverse proxy)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN pnpm run build

# Stage 2: Production web server with Nginx
FROM nginx:alpine

# Replace default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5700

HEALTHCHECK --interval=20s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5700/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
