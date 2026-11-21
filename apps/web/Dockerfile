FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Install dependencies first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application code and build
COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
