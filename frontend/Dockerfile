# --- Stage 1: Build the Application ---
# Use a Node.js image that includes build tools. 'alpine' is for a smaller image size.
FROM node:20-alpine AS build

# Set the working directory inside the container.
WORKDIR /app

# Copy package files first to leverage Docker's layer caching.
COPY package*.json ./

# Install all dependencies, including devDependencies needed for the build.
RUN npm install

# Copy the rest of the application source code.
COPY . .

# Build the application for production.
RUN npm run build

# --- Stage 2: Create the Production Image ---
# Start from a fresh, lightweight Node.js image.
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files again.
COPY package*.json ./

# Install ONLY production dependencies to keep the image small.
RUN npm install --omit=dev

# Copy the built application server and browser files from the 'build' stage.
# The 'dist/project' directory contains both the 'server' and 'browser' folders.
COPY --from=build /app/dist/project ./dist/project

# Set the port the server will run on. The Angular SSR default is 4000.
ENV PORT=4000

# Expose the port to the host.
EXPOSE ${PORT}

# The command to start the Node.js server.
# This path comes directly from your "serve:ssr:project" script.
CMD [ "node", "dist/project/server/server.mjs" ]


