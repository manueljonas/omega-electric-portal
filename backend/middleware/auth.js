// ============================================================
// middleware/auth.js
// Verificação do token JWT nas rotas protegidas
// Equivalente a um @PreAuthorize / SecurityFilter do Spring
// ============================================================

const jwt = require('jsonwebtoken');

const CHAVE_SECRETA = process.env.JWT_SECRET || 'omega-electric-secret-2026';

// ── Middleware de autenticação ────────────────────────────────
// Aplicado nas rotas que exigem login
function autenticar(req, res, next) {
  // O token chega no cabeçalho: Authorization: Bearer <token>
  const cabecalho = req.headers['authorization'];

  if (!cabecalho || !cabecalho.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
  }

  const token = cabecalho.split(' ')[1];

  try {
    // Verifica e decodifica o token
    const payload = jwt.verify(token, CHAVE_SECRETA);

    // Injeta os dados do usuário na requisição
    // Equivalente ao SecurityContextHolder do Spring
    req.usuario = payload;
    next(); // Continua para o próximo handler
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// ── Middleware de autorização (apenas admin) ──────────────────
function apenasAdmin(req, res, next) {
  if (!req.usuario || req.usuario.perfil !== 'admin') {
    return res.status(403).json({ erro: 'Acesso restrito ao administrador.' });
  }
  next();
}

module.exports = { autenticar, apenasAdmin, CHAVE_SECRETA };
