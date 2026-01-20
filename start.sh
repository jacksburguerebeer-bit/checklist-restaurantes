#!/bin/bash

echo "🚀 Iniciando Sistema de Checklist para Restaurantes"
echo "=================================================="

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale primeiro:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Criar arquivos de ambiente
echo "📄 Criando arquivos de configuração..."
cp backend/.env.example backend/.env 2>/dev/null || true
cp frontend/.env.example frontend/.env.local 2>/dev/null || true

echo "⚠️  Configure as variáveis em:"
echo "   - backend/.env"
echo "   - frontend/.env.local"
echo ""
echo "Para desenvolvimento rápido, use as configurações padrão."
echo ""
read -p "Pressione Enter para continuar..."

# Iniciar containers
echo "🐳 Iniciando containers Docker..."
docker-compose down 2>/dev/null
docker-compose build
docker-compose up -d

echo ""
echo "⏳ Aguardando serviços iniciarem..."
sleep 10

echo ""
echo "✅ Sistema iniciado com sucesso!"
echo ""
echo "🌐 Acesse as aplicações:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo ""
echo "🔧 Credenciais para teste:"
echo "   Email:    admin@empreendimentos.com"
echo "   Senha:    Admin@123"
echo ""
echo "📋 Comandos úteis:"
echo "   Ver logs:       docker-compose logs -f"
echo "   Parar:          docker-compose down"
echo "   Reiniciar:      docker-compose restart"
echo ""