FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Install all dependencies (explicitly include devDependencies for Next.js build)
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy application code and build
COPY . .
RUN npm run build

# Prune devDependencies to reduce final container size
RUN npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "run", "start"]
