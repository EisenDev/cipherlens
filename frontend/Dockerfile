# Stage 1: Build React application
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Pass VITE_API_URL during build time (or default to empty so it falls back to window.location origin/URL)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the production bundle
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration for React Router fallback support
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose Nginx port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
