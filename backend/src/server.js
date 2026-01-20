const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'admin',
  password: process.env.DB_PASSWORD || 'senha123',
  database: process.env.DB_DATABASE || 'checklist_restaurantes',
});

// Configuração do Multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'checklist-restaurantes-api',
    version: '1.0.0'
  });
});

// Rota de login
app.post('/api/auth/login', async (req, res) => {
  const { email, senha } = req.body;

  try {
    // Buscar usuário
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE email = $1 AND ativo = true',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    // Verificar senha (em produção, usar bcrypt)
    // Para demo, vamos aceitar senha fixa
    const validPassword = await bcrypt.compare(senha, user.senha_hash) || senha === 'Admin@123';

    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    // Atualizar último login
    await pool.query(
      'UPDATE usuarios SET ultimo_login = $1 WHERE id = $2',
      [new Date(), user.id]
    );

    // Gerar token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        perfil: user.perfil,
        unidade_id: user.unidade_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      access_token: token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        perfil: user.perfil,
        unidade_id: user.unidade_id
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para obter checklists disponíveis
app.get('/api/checklists', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM checklists WHERE ativo = true ORDER BY nome'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar checklists:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para iniciar execução de checklist
app.post('/api/checklists/:id/executar', authenticateToken, async (req, res) => {
  const checklistId = req.params.id;
  const userId = req.user.id;
  const unidadeId = req.user.unidade_id;

  try {
    // Verificar se checklist existe e está ativo
    const checklistResult = await pool.query(
      'SELECT * FROM checklists WHERE id = $1 AND ativo = true',
      [checklistId]
    );

    if (checklistResult.rows.length === 0) {
      return res.status(404).json({ message: 'Checklist não encontrado' });
    }

    // Criar execução
    const execucaoResult = await pool.query(
      `INSERT INTO execucoes_checklist 
       (checklist_id, unidade_id, usuario_id, status) 
       VALUES ($1, $2, $3, 'EM_ANDAMENTO') 
       RETURNING *`,
      [checklistId, unidadeId, userId]
    );

    // Buscar perguntas do checklist
    const perguntasResult = await pool.query(
      'SELECT * FROM perguntas WHERE checklist_id = $1 AND ativo = true ORDER BY ordem',
      [checklistId]
    );

    res.json({
      execucao: execucaoResult.rows[0],
      perguntas: perguntasResult.rows,
      checklist: checklistResult.rows[0]
    });

  } catch (error) {
    console.error('Erro ao iniciar checklist:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para responder pergunta
app.post('/api/execucoes/:id/responder', authenticateToken, upload.single('foto'), async (req, res) => {
  const execucaoId = req.params.id;
  const { pergunta_id, resposta, observacao } = req.body;
  const fotoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    // Validar resposta
    if (!['CONFORME', 'NAO_CONFORME', 'NAO_SE_APLICA'].includes(resposta)) {
      return res.status(400).json({ message: 'Resposta inválida' });
    }

    // Se não conforme e pergunta exige foto, validar foto
    if (resposta === 'NAO_CONFORME') {
      const perguntaResult = await pool.query(
        'SELECT exige_foto FROM perguntas WHERE id = $1',
        [pergunta_id]
      );

      if (perguntaResult.rows[0]?.exige_foto && !fotoUrl) {
        return res.status(400).json({ message: 'Foto obrigatória para não conformidade' });
      }
    }

    // Salvar resposta
    const respostaResult = await pool.query(
      `INSERT INTO respostas 
       (execucao_id, pergunta_id, resposta, observacao, foto_url) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [execucaoId, pergunta_id, resposta, observacao, fotoUrl]
    );

    res.json({
      resposta: respostaResult.rows[0],
      message: 'Resposta registrada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao responder:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para finalizar checklist
app.post('/api/execucoes/:id/finalizar', authenticateToken, async (req, res) => {
  const execucaoId = req.params.id;

  try {
    // Calcular percentual de conformidade
    const respostasResult = await pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN resposta = 'CONFORME' THEN 1 END) as conforme,
        COUNT(CASE WHEN resposta = 'NAO_CONFORME' THEN 1 END) as nao_conforme
       FROM respostas 
       WHERE execucao_id = $1 AND resposta != 'NAO_SE_APLICA'`,
      [execucaoId]
    );

    const { total, conforme } = respostasResult.rows[0];
    const percentual = total > 0 ? (conforme / total) * 100 : 0;

    // Atualizar execução
    await pool.query(
      `UPDATE execucoes_checklist 
       SET status = 'CONCLUIDO', 
           data_hora_fim = NOW(),
           percentual_conformidade = $1
       WHERE id = $2`,
      [percentual, execucaoId]
    );

    // Gerar PDF e enviar email (simulado)
    console.log(`Checklist ${execucaoId} finalizado com ${percentual}% de conformidade`);

    res.json({
      message: 'Checklist finalizado com sucesso',
      percentual_conformidade: percentual
    });

  } catch (error) {
    console.error('Erro ao finalizar checklist:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Rota para dashboard admin
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
  try {
    // Verificar se é admin
    if (req.user.perfil !== 'ADMIN') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Buscar estatísticas
    const [
      unidadesResult,
      usuariosResult,
      checklistsResult,
      execucoesResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM unidades WHERE ativo = true'),
      pool.query('SELECT COUNT(*) FROM usuarios WHERE ativo = true'),
      pool.query('SELECT COUNT(*) FROM checklists WHERE ativo = true'),
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'CONCLUIDO' THEN 1 END) as concluidas,
          COUNT(CASE WHEN status = 'EM_ANDAMENTO' THEN 1 END) as em_andamento
        FROM execucoes_checklist
      `)
    ]);

    res.json({
      unidades: parseInt(unidadesResult.rows[0].count),
      usuarios: parseInt(usuariosResult.rows[0].count),
      checklists: parseInt(checklistsResult.rows[0].count),
      execucoes: {
        total: parseInt(execucoesResult.rows[0].total),
        concluidas: parseInt(execucoesResult.rows[0].concluidas),
        em_andamento: parseInt(execucoesResult.rows[0].em_andamento)
      }
    });

  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
  console.log(`📚 API disponível em http://localhost:${PORT}/api`);
});