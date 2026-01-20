FROM node:18-alpine

WORKDIR /app

# Instalar dependências
COPY package*.json ./
RUN npm install

# Copiar código
COPY . .

# Expor porta
EXPOSE 3000

# Comando de desenvolvimento
CMD ["npm", "run", "dev"]