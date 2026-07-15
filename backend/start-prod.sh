#!/bin/sh

# Falha imediatamente se algum comando falhar
set -e

echo "=> Iniciando deploy das migrações do Prisma..."
npx prisma migrate deploy

echo "=> Iniciando servidor NestJS em modo produção..."
node dist/main
