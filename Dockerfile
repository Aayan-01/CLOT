# Multi-stage build for production

# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build backend
FROM node:18-alpine AS backend-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Production
FROM node:18-alpine
WORKDIR /app

# Install production dependencies
COPY server/package*.json ./
RUN npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/server/dist ./dist
COPY --from=backend-builder /app/server/data ./data

# Copy built frontend to serve statically
COPY --from=frontend-builder /app/client/dist ./public

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "dist/index.js"]