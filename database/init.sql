-- Sistema de Checklist para Restaurantes
-- Banco de dados inicial

-- Tabela de marcas
CREATE TABLE IF NOT EXISTS marcas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    logo_url TEXT,
    email_matriz VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de unidades
CREATE TABLE IF NOT EXISTS unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marca_id UUID REFERENCES marcas(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    endereco TEXT NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    cep VARCHAR(10),
    telefone VARCHAR(20),
    email VARCHAR(255) NOT NULL,
    responsavel VARCHAR(100),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidade_id UUID REFERENCES unidades(id) ON DELETE SET NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('ADMIN', 'GESTOR', 'OPERACIONAL')),
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de checklists
CREATE TABLE IF NOT EXISTS checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL,
    periodicidade VARCHAR(20),
    ativo BOOLEAN DEFAULT true,
    criado_por UUID REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de perguntas
CREATE TABLE IF NOT EXISTS perguntas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE,
    ordem INTEGER NOT NULL,
    texto TEXT NOT NULL,
    categoria VARCHAR(50),
    exige_foto BOOLEAN DEFAULT false,
    obrigatoria BOOLEAN DEFAULT true,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de execuções de checklist
CREATE TABLE IF NOT EXISTS execucoes_checklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID REFERENCES checklists(id),
    unidade_id UUID REFERENCES unidades(id),
    usuario_id UUID REFERENCES usuarios(id),
    data_hora_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_hora_fim TIMESTAMP,
    status VARCHAR(20) DEFAULT 'EM_ANDAMENTO' CHECK (status IN ('EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO')),
    percentual_conformidade DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de respostas
CREATE TABLE IF NOT EXISTS respostas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execucao_id UUID REFERENCES execucoes_checklist(id) ON DELETE CASCADE,
    pergunta_id UUID REFERENCES perguntas(id),
    resposta VARCHAR(20) NOT NULL CHECK (resposta IN ('CONFORME', 'NAO_CONFORME', 'NAO_SE_APLICA')),
    observacao TEXT,
    foto_url TEXT,
    data_hora_resposta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_usuarios_unidade ON usuarios(unidade_id);
CREATE INDEX idx_execucoes_unidade ON execucoes_checklist(unidade_id);
CREATE INDEX idx_execucoes_usuario ON execucoes_checklist(usuario_id);
CREATE INDEX idx_execucoes_checklist ON execucoes_checklist(checklist_id);
CREATE INDEX idx_respostas_execucao ON respostas(execucao_id);
CREATE INDEX idx_perguntas_checklist ON perguntas(checklist_id);

-- Inserir dados iniciais
INSERT INTO marcas (nome, email_matriz, telefone) VALUES
('Empreendimentos de Restaurantes', 'matriz@empreendimentos.com', '(11) 9999-8888');

INSERT INTO unidades (marca_id, nome, endereco, cidade, estado, email) VALUES
((SELECT id FROM marcas LIMIT 1), 'Unidade Centro', 'Rua Principal, 123', 'São Paulo', 'SP', 'centro@empreendimentos.com'),
((SELECT id FROM marcas LIMIT 1), 'Unidade Zona Sul', 'Av. Secundária, 456', 'Rio de Janeiro', 'RJ', 'sul@empreendimentos.com');

-- Senha: Admin@123 (bcrypt hash)
INSERT INTO usuarios (nome, email, senha_hash, perfil, unidade_id) VALUES
('Administrador', 'admin@empreendimentos.com', '$2b$10$YourHashedPasswordHere', 'ADMIN', NULL),
('Gerente Centro', 'gerente@empreendimentos.com', '$2b$10$YourHashedPasswordHere', 'GESTOR', (SELECT id FROM unidades WHERE nome = 'Unidade Centro' LIMIT 1)),
('Operacional Centro', 'operacional@empreendimentos.com', '$2b$10$YourHashedPasswordHere', 'OPERACIONAL', (SELECT id FROM unidades WHERE nome = 'Unidade Centro' LIMIT 1));

INSERT INTO checklists (nome, descricao, tipo, periodicidade, criado_por) VALUES
('Checklist Abertura', 'Verificações para abertura do restaurante', 'DIARIO', 'DIARIA', (SELECT id FROM usuarios WHERE perfil = 'ADMIN' LIMIT 1)),
('Checklist Fechamento', 'Verificações para fechamento', 'DIARIO', 'DIARIA', (SELECT id FROM usuarios WHERE perfil = 'ADMIN' LIMIT 1)),
('Checklist Limpeza', 'Verificações de limpeza geral', 'SEMANAL', 'SEMANAL', (SELECT id FROM usuarios WHERE perfil = 'ADMIN' LIMIT 1));

INSERT INTO perguntas (checklist_id, ordem, texto, categoria, exige_foto) VALUES
((SELECT id FROM checklists WHERE nome = 'Checklist Abertura' LIMIT 1), 1, 'As luzes estão todas funcionando?', 'ILUMINAÇÃO', false),
((SELECT id FROM checklists WHERE nome = 'Checklist Abertura' LIMIT 1), 2, 'Os equipamentos estão ligados e funcionando?', 'EQUIPAMENTOS', false),
((SELECT id FROM checklists WHERE nome = 'Checklist Abertura' LIMIT 1), 3, 'O estoque de ingredientes está abastecido?', 'ESTOQUE', true),
((SELECT id FROM checklists WHERE nome = 'Checklist Abertura' LIMIT 1), 4, 'A limpeza do ambiente está adequada?', 'LIMPEZA', true),
((SELECT id FROM checklists WHERE nome = 'Checklist Fechamento' LIMIT 1), 1, 'Todos os equipamentos foram desligados?', 'EQUIPAMENTOS', false),
((SELECT id FROM checklists WHERE nome = 'Checklist Fechamento' LIMIT 1), 2, 'As portas e janelas estão trancadas?', 'SEGURANÇA', false);