// ============================================================
// OMEGA ELECTRIC — Portal de Calibrações
// server.js — Servidor principal Express
// ============================================================

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRouter         = require('./routes/auth');
const laudosRouter       = require('./routes/laudos');
const clientesRouter     = require('./routes/clientes');
const certificadosRouter = require('./routes/certificados');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares globais ───────────────────────────────────────
// Permite que o frontend (GitHub Pages) chame esta API
app.use(cors({
  origin: [
    'https://manueljonas.github.io',  // GitHub Pages (produção)
    'http://localhost:5500',           // VS Code Live Server (desenvolvimento)
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Interpreta o corpo das requisições como JSON
// Equivalente ao @RequestBody do Spring Boot
app.use(express.json());

// Servir arquivos estáticos da pasta /certificados
// (PDFs dos certificados de calibração)
app.use('/certificados', express.static(path.join(__dirname, 'certificados')));

// ── Rotas da API ──────────────────────────────────────────────
// Equivalente aos @RestController do Spring Boot
app.use('/api/auth',         authRouter);
app.use('/api/laudos',       laudosRouter);
app.use('/api/clientes',     clientesRouter);
app.use('/api/certificados', certificadosRouter);

// ── Rota raiz (health check) ──────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status:  'online',
    sistema: 'Omega Electric — Portal de Calibrações',
    versao:  '2.0.0',
    rotas: [
      'POST /api/auth/login',
      'GET  /api/laudos',
      'GET  /api/laudos/:id',
      'POST /api/laudos',
      'GET  /api/clientes',
      'POST /api/clientes',
      'GET  /api/certificados/:id'
    ]
  });
});

// ── Tratamento de rota não encontrada ─────────────────────────
app.use((req, res) => {
  res.status(404).json({ erro: 'Rota não encontrada.' });
});

// ── Tratamento de erros globais ───────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERRO]', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// ── Inicialização ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
});
