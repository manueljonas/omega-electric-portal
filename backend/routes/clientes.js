// ============================================================
// routes/clientes.js
// Rotas de clientes
// GET  /api/clientes     → lista todos os clientes (admin)
// POST /api/clientes     → cadastra novo cliente (admin)
// ============================================================

const express = require('express');
const bcrypt  = require('bcryptjs');
const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');

const { autenticar, apenasAdmin } = require('../middleware/auth');

const router  = express.Router();
const ARQUIVO = path.join(__dirname, '../data/users.json');

// ── Utilitários ───────────────────────────────────────────────
function lerUsuarios() {
  const conteudo = fs.readFileSync(ARQUIVO, 'utf-8');
  return JSON.parse(conteudo);
}

function gravarUsuarios(usuarios) {
  fs.writeFileSync(ARQUIVO, JSON.stringify(usuarios, null, 2), 'utf-8');
}

// ── GET /api/clientes ─────────────────────────────────────────
// Lista todos os clientes (sem expor senhas)
router.get('/', autenticar, apenasAdmin, (req, res) => {
  const usuarios = lerUsuarios();

  // Remove a senha antes de retornar
  const clientes = usuarios
    .filter(u => u.perfil === 'cliente')
    .map(({ senha, ...dados }) => dados);

  res.json(clientes);
});

// ── POST /api/clientes ────────────────────────────────────────
// Cadastra novo cliente (somente admin)
// Body esperado:
// {
//   "nome":  "Energisa RN",
//   "email": "contato@energisa.com.br",
//   "senha": "senha123"
// }
router.post('/', autenticar, apenasAdmin, (req, res) => {
  const { nome, email, senha } = req.body;

  // Validação dos campos obrigatórios
  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
  }

  if (senha.length < 6) {
    return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  const usuarios = lerUsuarios();

  // Verifica se o e-mail já está cadastrado
  const emailExiste = usuarios.some(
    u => u.email.toLowerCase() === email.toLowerCase()
  );

  if (emailExiste) {
    return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
  }

  // Criptografa a senha com bcrypt (custo 10)
  const senhaCriptografada = bcrypt.hashSync(senha, 10);

  const novoCliente = {
    id:       uuidv4(),
    nome,
    email:    email.toLowerCase(),
    senha:    senhaCriptografada,
    perfil:   'cliente',
    criadoEm: new Date().toISOString()
  };

  usuarios.push(novoCliente);
  gravarUsuarios(usuarios);

  // Retorna sem a senha
  const { senha: _, ...clientePublico } = novoCliente;

  res.status(201).json({
    mensagem: 'Cliente cadastrado com sucesso.',
    cliente:  clientePublico
  });
});

// ── PUT /api/clientes/:id ─────────────────────────────────────
// Atualiza nome, e-mail e opcionalmente a senha
router.put('/:id', autenticar, apenasAdmin, (req, res) => {
  const { nome, email, senha } = req.body;
  const usuarios = lerUsuarios();
  const idx      = usuarios.findIndex(u => u.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ erro: 'Cliente não encontrado.' });
  }
  if (usuarios[idx].perfil === 'admin') {
    return res.status(403).json({ erro: 'Não é possível editar o administrador por aqui.' });
  }

  // Verifica duplicidade de e-mail em outro registro
  if (email) {
    const emailNorm = email.toLowerCase();
    const duplicado = usuarios.some((u, i) => u.email.toLowerCase() === emailNorm && i !== idx);
    if (duplicado) return res.status(409).json({ erro: 'Este e-mail já está cadastrado.' });
    usuarios[idx].email = emailNorm;
  }

  if (nome)  usuarios[idx].nome  = nome;
  if (senha) {
    if (senha.length < 6) return res.status(400).json({ erro: 'A senha deve ter pelo menos 6 caracteres.' });
    usuarios[idx].senha = bcrypt.hashSync(senha, 10);
  }
  usuarios[idx].atualizadoEm = new Date().toISOString();

  gravarUsuarios(usuarios);
  const { senha: _, ...pub } = usuarios[idx];
  res.json({ mensagem: 'Cliente atualizado com sucesso.', cliente: pub });
});

// ── DELETE /api/clientes/:id ──────────────────────────────────
// Remove um cliente — bloqueia se ele tiver laudos vinculados
router.delete('/:id', autenticar, apenasAdmin, (req, res) => {
  const usuarios = lerUsuarios();
  const idx      = usuarios.findIndex(u => u.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ erro: 'Cliente não encontrado.' });
  }
  if (usuarios[idx].perfil === 'admin') {
    return res.status(403).json({ erro: 'Não é possível excluir o administrador.' });
  }

  // Verifica se existem laudos vinculados a este cliente
  const laudosPath = path.join(__dirname, '../data/laudos.json');
  const laudos     = JSON.parse(fs.readFileSync(laudosPath, 'utf-8'));
  const vinculados = laudos.filter(l => l.clienteId === req.params.id);

  if (vinculados.length > 0) {
    return res.status(409).json({
      erro: `Não é possível excluir: este cliente possui ${vinculados.length} laudo(s) vinculado(s).`
    });
  }

  const [removido] = usuarios.splice(idx, 1);
  gravarUsuarios(usuarios);

  res.json({ mensagem: `Cliente "${removido.nome}" removido com sucesso.` });
});

module.exports = router;
