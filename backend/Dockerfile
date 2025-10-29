# Dockerfile para desenvolvimento
FROM node:18-alpine

# Instalar dependências necessárias para Prisma e bcrypt
RUN apk add --no-cache libc6-compat openssl

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas as dependências
RUN npm ci

# Gerar cliente Prisma
RUN npx prisma generate

# Copiar código fonte
COPY . .

# Expor porta
EXPOSE 3001

# Definir variáveis de ambiente
ENV NODE_ENV=development

# Comando de inicialização para desenvolvimento
CMD ["npm", "run", "start:dev"]

