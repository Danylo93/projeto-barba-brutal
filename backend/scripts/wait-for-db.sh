#!/bin/sh

# Script para aguardar o banco de dados estar pronto
echo "Aguardando banco de dados..."

# Função para testar conexão com PostgreSQL usando netcat
wait_for_postgres() {
    until nc -z "$1" "$2" > /dev/null 2>&1; do
        echo "Aguardando PostgreSQL em $1:$2..."
        sleep 2
    done
    echo "PostgreSQL está pronto!"
}

# Extrair informações da DATABASE_URL
DB_HOST=$(echo $DATABASE_URL | sed 's/.*@\([^:]*\):.*/\1/')
DB_PORT=$(echo $DATABASE_URL | sed 's/.*:\([0-9]*\)\/.*/\1/')
DB_USER=$(echo $DATABASE_URL | sed 's/.*:\/\/\([^:]*\):.*/\1/')

# Aguardar banco estar pronto
wait_for_postgres $DB_HOST $DB_PORT

# Executar migrações
echo "Executando migrações..."
npx prisma migrate deploy

# Executar seed (pular se houver erro)
echo "Executando seed..."
npx prisma db seed || echo "Seed falhou, continuando..."

# Iniciar aplicação com ts-node (desenvolvimento)
echo "Iniciando aplicação..."
npx ts-node src/main.ts
