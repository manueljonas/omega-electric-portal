# Omega Electric — Portal do Cliente

Sistema Web para consulta de **laudos de calibração/aferição de relés de proteção** em
subestações elétricas. Cada cliente (concessionária/empresa) acessa apenas os seus
equipamentos e baixa os certificados em PDF; o administrador gerencia clientes, laudos e
certificados por uma interface CRUD.

Projeto desenvolvido para a disciplina **Desenvolvimento de Sistemas Web I** (Prof. Jair C. Leite) —
3ª avaliação, Parte 2 (backend + finalização do frontend).

---

## Tecnologias

**Frontend** (estático — HTML, CSS e JavaScript puro)
- Sem frameworks; `fetch` para consumir a API
- Autenticação via token JWT guardado em `sessionStorage`
- Layout responsivo, baseado na identidade visual do site da Omega Electric

**Backend** (Node.js)
- [Express](https://expressjs.com/) — servidor e rotas
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) — autenticação JWT (validade de 8h)
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) — hash das senhas
- [multer](https://github.com/expressjs/multer) — upload dos PDFs dos certificados
- [cors](https://github.com/expressjs/cors) — liberação de origem para o frontend
- Persistência em **arquivos JSON** (`data/users.json`, `data/laudos.json`)

---

## Estrutura

```
omega-electric-portal/
├── index.html              # Redireciona para o login
├── login.html              # Tela de login
├── dashboard.html          # Painel do cliente (consulta de laudos)
├── admin.html              # Painel administrativo (CRUD)
├── style.css               # Estilos compartilhados
└── backend/
    ├── server.js           # Servidor Express
    ├── package.json
    ├── render.yaml         # Configuração de deploy (Render)
    ├── middleware/
    │   └── auth.js         # autenticar() + apenasAdmin()
    ├── routes/
    │   ├── auth.js         # POST /api/auth/login
    │   ├── clientes.js     # CRUD de clientes
    │   ├── laudos.js       # CRUD de laudos + cálculo de status
    │   └── certificados.js # Upload/download dos PDFs
    ├── scripts/
    │   └── gerar-senhas.js # Seed: gera os hashes das senhas iniciais
    └── data/
        ├── users.json      # Usuários (admin e clientes)
        └── laudos.json     # Laudos de calibração
```

---

## Como rodar localmente

### 1. Backend

```bash
cd backend
npm install
npm run dev      # com nodemon (recarrega ao salvar)
# ou: npm start  # node simples
```

O servidor sobe em `http://localhost:3000`.

> **Primeiro uso / dados de demonstração:** para (re)criar os usuários com senhas
> conhecidas, rode `node scripts/gerar-senhas.js`.
> **Atenção:** isso **sobrescreve** o `data/users.json` atual com o conjunto de demonstração.

### 2. Frontend

Os arquivos da raiz são estáticos. Sirva-os com o **Live Server** do VS Code
(ou qualquer servidor estático) e acesse `login.html`.

> As páginas detectam o ambiente automaticamente: em `localhost`/`127.0.0.1` apontam
> para `http://localhost:3000`; publicadas, apontam para a URL de produção (Render).
> A constante `API_PROD` no topo do `<script>` de cada página define essa URL.

---

## Credenciais

Administrador (já presente no `users.json` versionado):

| Perfil | E-mail                          | Senha       |
|--------|---------------------------------|-------------|
| Admin  | `admin@omega-electric.com.br`   | `admin2026` |

O script `gerar-senhas.js` também cria clientes de demonstração
(`cliente@demo.com` / `omega123`, entre outros) — consulte o próprio arquivo para a lista.

---

## API (resumo)

Todas as rotas, exceto o login, exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota                              | Acesso  | Descrição                                  |
|--------|-----------------------------------|---------|--------------------------------------------|
| POST   | `/api/auth/login`                 | Público | Autentica e retorna o token JWT            |
| GET    | `/api/laudos`                     | Logado  | Laudos do cliente (admin recebe todos)     |
| GET    | `/api/laudos/:id`                 | Logado  | Detalhe de um laudo                        |
| POST   | `/api/laudos`                     | Admin   | Cadastra laudo (ID automático ou manual)   |
| PUT    | `/api/laudos/:id`                 | Admin   | Atualiza laudo                             |
| DELETE | `/api/laudos/:id`                 | Admin   | Remove laudo                               |
| GET    | `/api/clientes`                   | Admin   | Lista clientes (sem expor senhas)          |
| POST   | `/api/clientes`                   | Admin   | Cadastra cliente                           |
| PUT    | `/api/clientes/:id`               | Admin   | Atualiza cliente                           |
| DELETE | `/api/clientes/:id`               | Admin   | Remove cliente (bloqueia se houver laudos) |
| POST   | `/api/certificados/upload/:id`    | Admin   | Envia o PDF do certificado                 |
| GET    | `/api/certificados/status/:id`    | Admin   | Verifica se o PDF existe                   |
| GET    | `/api/certificados/:id`           | Logado  | Baixa o PDF do certificado                 |

O **status** de cada laudo é calculado pelo servidor a partir da data de validade:
`valida`, `a-vencer` (≤ 90 dias) ou `vencida`.

---

## Deploy

**Backend → [Render](https://render.com/)**

O `backend/render.yaml` descreve o serviço (`npm install` + `npm start`) e gera a variável
`JWT_SECRET` automaticamente. Para o deploy via *Blueprint*, o Render espera o `render.yaml`
na **raiz do repositório**; se for usar essa forma, mova/copie o arquivo para a raiz.

Após o deploy, confirme a URL pública e atualize a constante `API_PROD` nas três páginas
(`login.html`, `dashboard.html`, `admin.html`) caso o nome do serviço seja diferente de
`omega-electric-portal`.

**Frontend → GitHub Pages**

Publique a raiz do repositório. O `server.js` já libera, via CORS, a origem
`https://manueljonas.github.io`.

---

## Segurança e limitações

- Senhas armazenadas apenas como hash bcrypt; o login responde com mensagem genérica
  para não revelar se um e-mail existe.
- Os arquivos JSON e os PDFs (`backend/certificados/*.pdf`) não são versionados (ver `.gitignore`).
- Por usar arquivos JSON como armazenamento, o projeto é adequado a fins acadêmicos e de
  demonstração; para produção real, recomenda-se um banco de dados.
