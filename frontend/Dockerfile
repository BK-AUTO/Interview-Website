FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
# Exclude node_modules and other unnecessary files
COPY . .

# Remove any existing node_modules to prevent conflicts
RUN rm -rf node_modules && npm install

EXPOSE 5173

# Use dev script with host flag for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]