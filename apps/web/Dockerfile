FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Install all dependencies (Next.js build requires devDependencies like Tailwind & TypeScript)
COPY package.json package-lock.json ./
RUN npm ci

# Copy application code and build
COPY . .
RUN npm run build

# Prune devDependencies to reduce final container size
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "run", "start"]
