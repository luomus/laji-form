FROM mcr.microsoft.com/playwright:v1.40.1

WORKDIR /app

# Copy application files (see .dockerignore for what's excluded)
COPY . .

# Install dependencies
RUN npm ci

ENTRYPOINT ["npx", "playwright", "test"]
