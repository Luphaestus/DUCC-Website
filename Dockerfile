FROM node:20-slim

# Install build dependencies for native modules (like bcrypt and sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Build assets (SASS)
RUN npm run sass -- --no-watch

# Create a directory for the database to ensure persistence
RUN mkdir -p /app/data

# Set environment to production
ENV NODE_ENV=prod
# Move database path via environment variable (I'll need to update server.js to use this)
ENV DATABASE_PATH=/app/data/database.db

EXPOSE 3000

# Run database init then start
CMD ["sh", "-c", "npm run db:init && npm start"]
