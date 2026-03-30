# ================= BASE =================
FROM node:20-slim

# ================= METADATA =================
LABEL maintainer="your-name"
LABEL version="1.0"
LABEL description="Discord Bot (Production)"

# ================= APP DIR =================
WORKDIR /usr/src/app

# ================= DEPENDENCIES =================

# sadece package dosyalarını kopyala (cache için önemli)
COPY package*.json ./

# production dependency install
RUN npm ci --omit=dev && npm cache clean --force

# ================= COPY SOURCE =================
COPY . .

# ================= SECURITY =================

# non-root user oluştur
RUN useradd -m botuser
USER botuser

# ================= ENV =================
ENV NODE_ENV=production

# ================= PORT =================
EXPOSE 8080

# ================= HEALTHCHECK =================
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

# ================= START =================
CMD ["node", "bot.js"]