# --- Stage 1: Build the Angular app ---
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build (SSR + browser)
COPY . .
RUN npm run build

# --- Stage 2: Serve with Node.js ---
FROM node:20-alpine AS production

WORKDIR /app

# Copy only package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy built app
COPY --from=build /app/dist/project ./dist/project

ENV PORT=4000
EXPOSE ${PORT}

# Start the SSR server
CMD ["node", "dist/project/server/server.mjs"]
