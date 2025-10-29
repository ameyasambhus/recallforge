FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies (this layer will be cached if package.json doesn't change)
RUN npm install --prefix backend && npm install --prefix frontend

# Copy the rest of the application
COPY . .

# Build the frontend
RUN npm run build --prefix frontend

# Expose the port (optional but good practice)
EXPOSE 4000

# Start the application
CMD ["npm", "run", "start"]
