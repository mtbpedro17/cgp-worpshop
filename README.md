# CGP Inscrições — Backend Node.js + MySQL

## Estrutura do projecto
```
cgp-backend/
├── server.js          ← API principal
├── package.json
├── .env.example       ← Copia para .env e preenche
├── public/
│   ├── index.html     ← Site com formulário de inscrição
│   └── inscritos.html ← Dashboard de gestão
```

## Como correr localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edita o .env com os teus dados MySQL
```

### 3. Criar a base de dados MySQL
```sql
CREATE DATABASE cgp_inscricoes CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
> A tabela `inscricoes` é criada automaticamente ao arrancar o servidor.

### 4. Arrancar o servidor
```bash
npm start
# ou em modo dev (auto-reload):
npm run dev
```

Acede a: http://localhost:3000

---

## Deploy no Railway

1. Cria conta em https://railway.app
2. Cria novo projecto → "Deploy from GitHub" (ou faz upload do zip)
3. Adiciona um serviço **MySQL** no mesmo projecto
4. No serviço Node.js, vai a **Variables** e adiciona:
   - `DB_HOST` → hostname do MySQL do Railway
   - `DB_USER` → utilizador MySQL
   - `DB_PASSWORD` → password MySQL
   - `DB_NAME` → cgp_inscricoes
   - `PORT` → 3000
5. Faz deploy — o Railway dá-te um URL público tipo `https://cgp-xxx.up.railway.app`

### Após o deploy
No `public/index.html` e `public/inscritos.html`, muda a linha:
```js
const API_URL = '/api';
```
para:
```js
const API_URL = 'https://cgp-xxx.up.railway.app/api';
```

---

## Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/inscricoes | Listar todas as inscrições |
| GET | /api/inscricoes/stats | Estatísticas (totais, arrecadado) |
| POST | /api/inscricoes | Nova inscrição (multipart/form-data) |
| PATCH | /api/inscricoes/:id/confirmar | Confirmar inscrição |
| DELETE | /api/inscricoes/:id | Eliminar inscrição |
| DELETE | /api/inscricoes | Eliminar todas |

### POST /api/inscricoes — campos
- `nome` (obrigatório)
- `email` (obrigatório, único)
- `telefone` (obrigatório)
- `comprovante` (ficheiro opcional — JPG, PNG, PDF, max 5MB)
