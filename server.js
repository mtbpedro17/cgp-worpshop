require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { enviarComprovanteEmail } = require('./mailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middlewares ───────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Upload de comprovantes ────────────────────────────────────
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `comp_${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Ficheiro não permitido'));
  }
});

// ─── Ligação à Base de Dados (Railway MySQL) ───────────────────
let db;
async function conectarBD() {
  db = await mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST,
    user: process.env.MYSQLUSER || process.env.DB_USER,
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQLDATABASE || process.env.DB_NAME,
    port: process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: process.env.MYSQLHOST ? { rejectUnauthorized: false } : false
  });

  // Criar tabela se não existir
  await db.execute(`
    CREATE TABLE IF NOT EXISTS inscricoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      telefone VARCHAR(50) NOT NULL,
      valor INT NOT NULL DEFAULT 5000,
      status ENUM('pendente', 'confirmado') DEFAULT 'pendente',
      comprovante VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Ligado à base de dados MySQL');
}

// ─── ROTAS DA API ──────────────────────────────────────────────

// GET /api/inscricoes — listar todas
app.get('/api/inscricoes', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM inscricoes ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/inscricoes/stats — estatísticas
app.get('/api/inscricoes/stats', async (req, res) => {
  try {
    const [[{ total }]] = await db.execute('SELECT COUNT(*) as total FROM inscricoes');
    const [[{ confirmados }]] = await db.execute("SELECT COUNT(*) as confirmados FROM inscricoes WHERE status = 'confirmado'");
    const [[{ pendentes }]] = await db.execute("SELECT COUNT(*) as pendentes FROM inscricoes WHERE status = 'pendente'");
    const [[{ arrecadado }]] = await db.execute("SELECT COALESCE(SUM(valor), 0) as arrecadado FROM inscricoes WHERE status = 'confirmado'");
    res.json({ success: true, data: { total, confirmados, pendentes, arrecadado } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/inscricoes — nova inscrição (com upload de comprovante)
app.post('/api/inscricoes', upload.single('comprovante'), async (req, res) => {
  try {
    const { nome, email, telefone } = req.body;
    if (!nome || !email || !telefone) {
      return res.status(400).json({ success: false, error: 'Nome, email e telefone são obrigatórios' });
    }

    // Validar 9 dígitos no telefone
    const apenasDigitos = telefone.replace(/\D/g, '');
    if (apenasDigitos.length < 9) {
      return res.status(400).json({ success: false, error: 'O telefone deve ter pelo menos 9 dígitos.' });
    }

    // Verificar se email já existe
    const [existe] = await db.execute('SELECT id FROM inscricoes WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({ success: false, error: 'Este email já está inscrito. Se precisas de ajuda contacta-nos pelo WhatsApp.' });
    }

    const comprovante = req.file ? `/uploads/${req.file.filename}` : null;

    const [result] = await db.execute(
      'INSERT INTO inscricoes (nome, email, telefone, valor, comprovante) VALUES (?, ?, ?, 5000, ?)',
      [nome, email, telefone, comprovante]
    );

    res.json({ success: true, message: 'Inscrição registada com sucesso!', id: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/inscricoes/:id/confirmar — confirmar inscrição e enviar comprovativo por email
app.patch('/api/inscricoes/:id/confirmar', async (req, res) => {
  try {
    const [[inscricao]] = await db.execute('SELECT * FROM inscricoes WHERE id = ?', [req.params.id]);
    if (!inscricao) return res.status(404).json({ success: false, error: 'Inscrição não encontrada' });
    if (inscricao.status === 'confirmado') return res.json({ success: true, message: 'Já estava confirmada.' });

    await db.execute("UPDATE inscricoes SET status = 'confirmado' WHERE id = ?", [req.params.id]);

    // Envia comprovativo PDF por email em background (não bloqueia a resposta)
    enviarComprovanteEmail(inscricao).catch(err =>
      console.error(`❌ Erro ao enviar email para ${inscricao.email}:`, err.message)
    );

    res.json({ success: true, message: `Confirmada! Comprovativo enviado para ${inscricao.email}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/inscricoes/:id — apagar inscrição
app.delete('/api/inscricoes/:id', async (req, res) => {
  try {
    // Apagar ficheiro do comprovante se existir
    const [[row]] = await db.execute('SELECT comprovante FROM inscricoes WHERE id = ?', [req.params.id]);
    if (row?.comprovante) {
      const filePath = path.join(__dirname, 'public', row.comprovante);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db.execute('DELETE FROM inscricoes WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Inscrição eliminada!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/inscricoes — apagar todas
app.delete('/api/inscricoes', async (req, res) => {
  try {
    await db.execute('DELETE FROM inscricoes');
    await db.execute('ALTER TABLE inscricoes AUTO_INCREMENT = 1');
    res.json({ success: true, message: 'Todas as inscrições foram removidas!' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── ROTA DE TESTE DE EMAIL (apagar depois do deploy) ──────────
app.get('/teste-email', async (req, res) => {
  try {
    await enviarComprovanteEmail({
      id: 1,
      nome: 'Teste',
      email: process.env.EMAIL_USER,
      telefone: '900000000',
      valor: 5000,
      created_at: new Date()
    });
    res.json({ success: true, message: 'Email enviado com sucesso!' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── Arrancar servidor ─────────────────────────────────────────
conectarBD().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor a correr em http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('❌ Erro ao ligar à BD:', err.message);
  process.exit(1);
});
