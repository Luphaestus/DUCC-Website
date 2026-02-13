FROM node:20-slim

# Install build dependencies for native modules (like bcrypt)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (skip husky and use ci for reliable builds)
ENV HUSKY=0
RUN npm ci

# Copy project files
COPY . .

# Build assets (SASS and Client)
ARG BUILD_ID=unknown
RUN echo "Building version: $BUILD_ID"
# Only build if dist doesn't exist (optimization for local pre-builds)
RUN if [ ! -d "dist" ] || [ ! -f "public/assets/main.css" ]; then \
        npm run sass:build && \
        npm run build:client; \
    else \
        echo "Using pre-compiled assets found in build context."; \
    fi

# Create a directory for the database to ensure persistence
RUN mkdir -p /app/data

# Set environment to production
ENV NODE_ENV=prod
ENV DOCKER=true
# Move database path via environment variable
ENV DATABASE_PATH=/app/data/database.db

EXPOSE 3000

# Run database init then start
CMD ["npm", "start"]
