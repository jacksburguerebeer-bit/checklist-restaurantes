# 🍽️ Sistema de Checklist para Restaurantes

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Docker](https://img.shields.io/badge/docker-ready-blue)

Sistema web profissional de checklist operacional para restaurantes com múltiplas unidades.

## ✨ Funcionalidades

- ✅ Checklist operacional por perguntas
- 📱 Interface mobile-first (PWA)
- 🏪 Multi-unidades
- 👥 Três perfis de usuário (Admin, Gestor, Operacional)
- 📸 Captura de fotos direto da câmera
- 📊 Relatórios em PDF automáticos
- 📧 Envio automático de relatórios por e-mail
- 🔐 Autenticação JWT
- 🐳 Docker e Docker Compose

## 🚀 Como Rodar

### Pré-requisitos
- Docker e Docker Compose
- Node.js 18+ (opcional)

### Passos Rápidos
```bash
# Clone o repositório
git clone https://github.com/jacksburguerebeer-bit/checklist-restaurantes.git

# Entre na pasta
cd checklist-restaurantes

# Inicie com Docker
docker-compose up --build

# Acesse:
# Frontend: http://localhost:3000
# Backend: http://localhost:3001