import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const bodySchema = z.object({
  question: z.string().trim().min(1, 'La pregunta es obligatoria').max(2000),
  answer: z.string().trim().min(1, 'La respuesta es obligatoria').max(5000),
});

const idSchema = z.coerce.number().int().positive();

const SELECT = `
  SELECT q.id, q.text AS question, a.text AS answer, q.box_id,
         q.next_review_date::text AS next_review_date,
         q.created_at
    FROM questions q
    JOIN answers a ON a.question_id = q.id`;

router.get('/', async (req, res) => {
  const box = req.query.box ? z.coerce.number().int().min(1).max(5).parse(req.query.box) : null;
  const { rows } = await pool.query(
    `${SELECT}
      WHERE q.user_id = $1 AND ($2::int IS NULL OR q.box_id = $2)
      ORDER BY q.created_at DESC, q.id DESC`,
    [req.userId, box],
  );
  res.json({ questions: rows });
});

// Las preguntas nuevas entran siempre en la Caja 1 y se repasan desde hoy.
router.post('/', async (req, res) => {
  const { question, answer } = bodySchema.parse(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const q = await client.query(
      `INSERT INTO questions (user_id, text, box_id, next_review_date)
       VALUES ($1, $2, 1, CURRENT_DATE) RETURNING id`,
      [req.userId, question],
    );
    await client.query('INSERT INTO answers (question_id, text) VALUES ($1, $2)', [q.rows[0].id, answer]);
    await client.query('COMMIT');

    const { rows } = await pool.query(`${SELECT} WHERE q.id = $1`, [q.rows[0].id]);
    res.status(201).json({ question: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// Importación masiva desde JSON: [{ "pregunta": "...", "respuesta": "..." }, ...]
// Todo entra siempre en la Caja 1; no se admite ningún campo de caja.
const MAX_IMPORT = 500;

const importItemSchema = z.strictObject({
  pregunta: z.string({ error: 'falta el campo "pregunta"' }).trim().min(1, '"pregunta" está vacía').max(2000, '"pregunta" supera los 2000 caracteres'),
  respuesta: z.string({ error: 'falta el campo "respuesta"' }).trim().min(1, '"respuesta" está vacía').max(5000, '"respuesta" supera los 5000 caracteres'),
});

router.post('/import', async (req, res) => {
  if (!Array.isArray(req.body)) {
    return res.status(400).json({ error: 'El JSON debe ser una lista: [ { "pregunta": "...", "respuesta": "..." } ]' });
  }
  if (req.body.length === 0) {
    return res.status(400).json({ error: 'La lista está vacía' });
  }
  if (req.body.length > MAX_IMPORT) {
    return res.status(400).json({ error: `Máximo ${MAX_IMPORT} preguntas por importación` });
  }

  const items = [];
  const errors = [];
  req.body.forEach((raw, i) => {
    const parsed = importItemSchema.safeParse(raw);
    if (parsed.success) {
      items.push(parsed.data);
      return;
    }
    for (const issue of parsed.error.issues) {
      const message =
        issue.code === 'unrecognized_keys'
          ? `campo no permitido (${issue.keys.join(', ')}). Las preguntas siempre entran en la Caja 1`
          : issue.message;
      errors.push({ index: i + 1, message });
    }
  });

  if (errors.length > 0) {
    const shown = errors.slice(0, 10).map((e) => `Elemento ${e.index}: ${e.message}`);
    return res.status(400).json({
      error: `El JSON contiene errores, no se ha importado nada. ${shown.join('; ')}${errors.length > 10 ? '…' : ''}`,
      details: errors,
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of items) {
      const q = await client.query(
        `INSERT INTO questions (user_id, text, box_id, next_review_date)
         VALUES ($1, $2, 1, CURRENT_DATE) RETURNING id`,
        [req.userId, item.pregunta],
      );
      await client.query('INSERT INTO answers (question_id, text) VALUES ($1, $2)', [q.rows[0].id, item.respuesta]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  res.status(201).json({ imported: items.length });
});

router.put('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { question, answer } = bodySchema.parse(req.body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const upd = await client.query(
      'UPDATE questions SET text = $1 WHERE id = $2 AND user_id = $3 RETURNING id',
      [question, id, req.userId],
    );
    if (upd.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }
    await client.query('UPDATE answers SET text = $1 WHERE question_id = $2', [answer, id]);
    await client.query('COMMIT');

    const { rows } = await pool.query(`${SELECT} WHERE q.id = $1`, [id]);
    res.json({ question: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const { rowCount } = await pool.query('DELETE FROM questions WHERE id = $1 AND user_id = $2', [id, req.userId]);
  if (rowCount === 0) return res.status(404).json({ error: 'Pregunta no encontrada' });
  res.status(204).end();
});

export default router;
