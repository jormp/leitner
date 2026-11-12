import crypto from 'node:crypto';
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { pool } from '../db.js';
import { config } from '../config.js';
import { sendVerificationEmail } from '../mailer.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, inténtalo más tarde' },
});
router.use(limiter);

const emailSchema = z.string().trim().toLowerCase().email('Correo no válido').max(255);

const registerSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
  email: emailSchema,
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(100),
});

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

// Genera un token nuevo, guarda su hash y envía el correo.
async function issueVerification(user) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(
    `UPDATE users
        SET verification_token_hash = $1,
            verification_expires_at = now() + make_interval(hours => $2::int)
      WHERE id = $3`,
    [sha256(token), config.verificationTtlHours, user.id],
  );
  try {
    await sendVerificationEmail({ to: user.email, name: user.name, token });
  } catch (err) {
    // No revelamos el fallo al cliente; el usuario puede pedir un reenvío.
    console.error('[mailer] Error enviando correo de verificación:', err.message);
  }
}

const GENERIC_REGISTER_MESSAGE =
  'Cuenta creada. Te hemos enviado un correo para verificar tu dirección.';

router.post('/register', async (req, res) => {
  const data = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(data.password, 10);

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [data.email]);
  const existing = rows[0];

  if (existing?.email_verified) {
    // Respuesta idéntica para no revelar qué correos están registrados.
    return res.status(201).json({ message: GENERIC_REGISTER_MESSAGE });
  }

  let user = existing;
  if (existing) {
    // Cuenta aún sin verificar: se actualizan datos y se reenvía el correo.
    const upd = await pool.query(
      'UPDATE users SET name = $1, password_hash = $2 WHERE id = $3 RETURNING *',
      [data.name, passwordHash, existing.id],
    );
    user = upd.rows[0];
  } else {
    const ins = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [data.name, data.email, passwordHash],
    );
    user = ins.rows[0];
  }

  await issueVerification(user);
  res.status(201).json({ message: GENERIC_REGISTER_MESSAGE });
});

router.post('/verify-email', async (req, res) => {
  const { token } = z.object({ token: z.string().min(10).max(200) }).parse(req.body);

  const { rows } = await pool.query(
    `UPDATE users
        SET email_verified = TRUE,
            verification_token_hash = NULL,
            verification_expires_at = NULL
      WHERE verification_token_hash = $1
        AND verification_expires_at > now()
      RETURNING id`,
    [sha256(token)],
  );

  if (rows.length === 0) {
    return res.status(400).json({ error: 'El enlace de verificación no es válido o ha caducado' });
  }
  res.json({ message: 'Correo verificado correctamente. Ya puedes iniciar sesión.' });
});

router.post('/resend-verification', async (req, res) => {
  const { email } = z.object({ email: emailSchema }).parse(req.body);
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (user && !user.email_verified) {
    await issueVerification(user);
  }
  res.json({ message: 'Si la cuenta existe y no está verificada, recibirás un nuevo correo.' });
});

router.post('/login', async (req, res) => {
  const data = loginSchema.parse(req.body);
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [data.email]);
  const user = rows[0];

  const ok = user && (await bcrypt.compare(data.password, user.password_hash));
  if (!ok) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  }
  if (!user.email_verified) {
    return res.status(403).json({
      code: 'EMAIL_NOT_VERIFIED',
      error: 'Debes verificar tu correo antes de iniciar sesión',
    });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.userId]);
  if (!rows[0]) return res.status(401).json({ error: 'Usuario no encontrado' });
  res.json({ user: rows[0] });
});

export default router;
