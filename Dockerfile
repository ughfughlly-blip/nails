FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
# If package-lock.json exists use npm ci for reproducible builds, otherwise fallback to npm install
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]