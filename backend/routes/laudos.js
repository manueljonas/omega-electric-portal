// ============================================================
// routes/laudos.js
// Rotas de laudos de calibração
// GET  /api/laudos       → lista laudos do cliente logado
// GET  /api/laudos/:id   → detalhe de um laudo específico
// POST /api/laudos       → cadastra novo laudo (admin)
// ============================================================

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');

const { autenticar, apenasAdmin } = require('../middleware/auth');

const router   = express.Router();
const ARQUIVO  = path.join(__dirname, '../data/laudos.json');
const CERT_DIR = path.join(__dirname, '../certificados');

// ── Utilitários ───────────────────────────────────────────────
function lerLaudos() {
  const conteudo = fs.readFileSync(ARQUIVO, 'utf-8');
  return JSON.parse(conteudo);
}

function gravarLaudos(laudos) {
  fs.writeFileSync(ARQUIVO, JSON.stringify(laudos, null, 2), 'utf-8');
}

// Calcula o status da calibração com base na data atual
function calcularStatus(validUntil) {
  const hoje    = new Date();
  const validade = new Date(validUntil);
  const diff    = (validade - hoje) / (1000 * 60 * 60 * 24); // dias

  if (diff < 0)   return 'vencida';
  if (diff <= 90) return 'a-vencer';
  return 'valida';
}

// ── GET /api/laudos ───────────────────────────────────────────
// Retorna apenas os laudos do cliente autenticado
// Admin recebe todos os laudos
router.get('/', autenticar, (req, res) => {
  const todos = lerLaudos();

  const laudos = req.usuario.perfil === 'admin'
    ? todos
    : todos.filter(l => l.clienteId === req.usuario.id);

  // Calcula o status e verifica se o PDF existe no servidor
  const resultado = laudos.map(l => ({
    ...l,
    status: calcularStatus(l.validUntil),
    temPDF: fs.existsSync(path.join(CERT_DIR, `${l.id}.pdf`))
  }));

  res.json(resultado);
});

// ── GET /api/laudos/:id ───────────────────────────────────────
// Retorna um laudo específico
router.get('/:id', autenticar, (req, res) => {
  const todos = lerLaudos();
  const laudo = todos.find(l => l.id === req.params.id);

  if (!laudo) {
    return res.status(404).json({ erro: 'Laudo não encontrado.' });
  }

  // Cliente só pode ver seus próprios laudos
  if (req.usuario.perfil !== 'admin' && laudo.clienteId !== req.usuario.id) {
    return res.status(403).json({ erro: 'Acesso negado.' });
  }

  res.json({ ...laudo, status: calcularStatus(laudo.validUntil) });
});

// ── POST /api/laudos ──────────────────────────────────────────
// Cadastra novo laudo (somente admin)
// Body esperado:
// {
//   "id":         "OE-2025-0099",   ← opcional; gerado automaticamente se omitido
//   "clienteId":  "uuid-do-cliente",
//   "model":      "SEL-311C",
//   "type":       "sobrecorrente",
//   "typeLabel":  "Sobrecorrente",
//   "sub":        "SE Mossoró 230kV",
//   "bay":        "Bay 03",          ← opcional
//   "calibDate":  "2025-06-10",
//   "validUntil": "2027-06-10"
// }
router.post('/', autenticar, apenasAdmin, (req, res) => {
  const { id: idCustom, clienteId, model, type, typeLabel, sub, bay, calibDate, validUntil } = req.body;

  // bay é opcional — demais campos são obrigatórios
  if (!clienteId || !model || !type || !typeLabel || !sub || !calibDate || !validUntil) {
    return res.status(400).json({ erro: 'Campos obrigatórios: clienteId, model, type, typeLabel, sub, calibDate, validUntil.' });
  }

  if (validUntil <= calibDate) {
    return res.status(400).json({ erro: 'A data de validade deve ser posterior à data de calibração.' });
  }

  const todos = lerLaudos();

  // Nº do Laudo: usa o informado ou gera automaticamente
  let numeroLaudo;
  if (idCustom && idCustom.trim()) {
    numeroLaudo = idCustom.trim().toUpperCase();
    // Verifica duplicidade
    if (todos.some(l => l.id === numeroLaudo)) {
      return res.status(409).json({ erro: `O Nº de laudo "${numeroLaudo}" já está cadastrado.` });
    }
  } else {
    // Auto-gera no formato OE-YYYY-NNNN
    const ano       = new Date().getFullYear();
    const laudosAno = todos.filter(l => l.id.startsWith(`OE-${ano}`));
    const seq       = String(laudosAno.length + 1).padStart(4, '0');
    numeroLaudo     = `OE-${ano}-${seq}`;
  }

  const novoLaudo = {
    id:        numeroLaudo,
    clienteId,
    model,
    type,
    typeLabel,
    sub,
    bay:       bay || '',          // bay vazio quando não informado
    calibDate,
    validUntil,
    criadoEm:  new Date().toISOString()
  };

  todos.push(novoLaudo);
  gravarLaudos(todos);

  res.status(201).json({
    mensagem: 'Laudo cadastrado com sucesso.',
    laudo: { ...novoLaudo, status: calcularStatus(validUntil) }
  });
});

// ── PUT /api/laudos/:id ───────────────────────────────────────
// Atualiza um laudo existente (somente admin)
// Permite alterar o próprio Nº do Laudo via campo "novoId"
router.put('/:id', autenticar, apenasAdmin, (req, res) => {
  const todos = lerLaudos();
  const idx   = todos.findIndex(l => l.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ erro: 'Laudo não encontrado.' });
  }

  const { novoId, clienteId, model, type, typeLabel, sub, bay, calibDate, validUntil } = req.body;

  // Validação: validade deve ser posterior à calibração
  const novaCalib = calibDate  || todos[idx].calibDate;
  const novaValid = validUntil || todos[idx].validUntil;

  if (novaValid <= novaCalib) {
    return res.status(400).json({
      erro: 'A data de validade deve ser posterior à data de calibração.'
    });
  }

  // Verifica se o novo Nº do Laudo já existe em outro registro
  if (novoId && novoId.trim() && novoId.trim().toUpperCase() !== req.params.id) {
    const novoIdNorm = novoId.trim().toUpperCase();
    if (todos.some((l, i) => l.id === novoIdNorm && i !== idx)) {
      return res.status(409).json({ erro: `O Nº de laudo "${novoIdNorm}" já está cadastrado.` });
    }
    todos[idx].id = novoIdNorm;
  }

  // Mescla os campos enviados com os existentes
  // bay aceita string vazia (remoção do bay)
  todos[idx] = {
    ...todos[idx],
    ...(clienteId             && { clienteId  }),
    ...(model                 && { model      }),
    ...(type                  && { type       }),
    ...(typeLabel             && { typeLabel  }),
    ...(sub                   && { sub        }),
    ...(bay   !== undefined      && { bay      }),  // aceita '' para limpar
    ...(calibDate             && { calibDate  }),
    ...(validUntil            && { validUntil }),
    atualizadoEm: new Date().toISOString()
  };

  gravarLaudos(todos);

  res.json({
    mensagem: 'Laudo atualizado com sucesso.',
    laudo: { ...todos[idx], status: calcularStatus(todos[idx].validUntil) }
  });
});

// ── DELETE /api/laudos/:id ────────────────────────────────────
// Remove um laudo (somente admin)
router.delete('/:id', autenticar, apenasAdmin, (req, res) => {
  const todos = lerLaudos();
  const idx   = todos.findIndex(l => l.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ erro: 'Laudo não encontrado.' });
  }

  const [removido] = todos.splice(idx, 1);
  gravarLaudos(todos);

  res.json({
    mensagem: `Laudo ${removido.id} removido com sucesso.`,
    id: removido.id
  });
});

module.exports = router;
