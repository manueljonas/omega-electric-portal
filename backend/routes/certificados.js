// ============================================================
// routes/certificados.js
// GET  /api/certificados/status/:id → verifica se PDF existe (admin)
// POST /api/certificados/upload/:id → upload do PDF (admin)
// GET  /api/certificados/:id        → download do PDF
// ORDEM IMPORTA: rotas específicas ANTES de /:id (rota genérica)
// ============================================================

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const multer  = require('multer');

const { autenticar, apenasAdmin } = require('../middleware/auth');

const router      = express.Router();
const LAUDOS_FILE = path.join(__dirname, '../data/laudos.json');
const CERT_DIR    = path.join(__dirname, '../certificados');

// Garante que a pasta de certificados existe
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

// ── Configuração do multer ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CERT_DIR),
  filename:    (req, file, cb) => cb(null, `${req.params.id}.pdf`)
});

const upload = multer({
  storage,
  limits:     { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Apenas arquivos PDF são aceitos.'));
  }
});

function lerLaudos() {
  return JSON.parse(fs.readFileSync(LAUDOS_FILE, 'utf-8'));
}

// ── GET /api/certificados/status/:id ─────────────────────────
// DEVE vir ANTES de /:id — caso contrário "status" seria tratado como id
router.get('/status/:id', autenticar, apenasAdmin, (req, res) => {
  const caminho = path.join(CERT_DIR, `${req.params.id}.pdf`);
  const existe  = fs.existsSync(caminho);
  res.json({
    id:     req.params.id,
    temPDF: existe,
    tamanho: existe ? fs.statSync(caminho).size : null
  });
});

// ── POST /api/certificados/upload/:id ────────────────────────
// DEVE vir ANTES de /:id pelo mesmo motivo
router.post('/upload/:id', autenticar, apenasAdmin, (req, res) => {
  const laudos = lerLaudos();
  const laudo  = laudos.find(l => l.id === req.params.id);

  if (!laudo) {
    return res.status(404).json({ erro: 'Laudo não encontrado.' });
  }

  upload.single('pdf')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ erro: `Erro no upload: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ erro: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhum arquivo PDF enviado.' });
    }

    res.json({
      mensagem: `Certificado do laudo ${laudo.id} enviado com sucesso.`,
      arquivo:  req.file.filename,
      tamanho:  req.file.size
    });
  });
});

// ── GET /api/certificados/:id ─────────────────────────────────
// Rota genérica por último — download do PDF pelo cliente
router.get('/:id', autenticar, (req, res) => {
  const laudos = lerLaudos();
  const laudo  = laudos.find(l => l.id === req.params.id);

  if (!laudo) {
    return res.status(404).json({ erro: 'Laudo não encontrado.' });
  }

  if (req.usuario.perfil !== 'admin' && laudo.clienteId !== req.usuario.id) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  const caminho = path.join(CERT_DIR, `${laudo.id}.pdf`);

  if (!fs.existsSync(caminho)) {
    return res.status(404).json({ erro: 'Certificado PDF ainda não disponível.' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${laudo.id}.pdf"`);
  res.sendFile(caminho);
});

module.exports = router;
