import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Estado de las cajas: total de tarjetas y cuántas toca repasar hoy.
router.get('/boxes', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT b.id, b.name, b.description, b.interval_days,
            COUNT(q.id)::int AS total,
            COUNT(q.id) FILTER (WHERE q.next_review_date <= CURRENT_DATE)::int AS due
       FROM boxes b
       LEFT JOIN questions q ON q.box_id = b.id AND q.user_id = $1
      GROUP BY b.id
      ORDER BY b.id`,
    [req.userId],
  );
  res.json({ boxes: rows });
});

// Tarjetas pendientes de hoy, empezando por las cajas de repaso más frecuente.
router.get('/session', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT q.id, q.text AS question, a.text AS answer, q.box_id
       FROM questions q
       JOIN answers a ON a.question_id = q.id
      WHERE q.user_id = $1 AND q.next_review_date <= CURRENT_DATE
      ORDER BY q.box_id, q.next_review_date, q.id`,
    [req.userId],
  );
  res.json({ cards: rows });
});

// Acierto: sube a la siguiente caja (máx. 5). Fallo: vuelve a la Caja 1.
router.post('/review/:id', async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const { correct } = z.object({ correct: z.boolean() }).parse(req.body);

  const { rows } = await pool.query(
    `UPDATE questions q
        SET box_id = n.new_box,
            next_review_date = CURRENT_DATE + b.interval_days,
            last_reviewed_at = now()
       FROM (SELECT id, CASE WHEN $3 THEN LEAST(box_id + 1, 5) ELSE 1 END AS new_box
               FROM questions WHERE id = $1 AND user_id = $2) n
       JOIN boxes b ON b.id = n.new_box
      WHERE q.id = n.id
        AND q.next_review_date <= CURRENT_DATE
      RETURNING q.id, q.box_id, q.next_review_date::text AS next_review_date`,
    [id, req.userId, correct],
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'Tarjeta no encontrada o ya repasada hoy' });
  }
  res.json({ card: rows[0] });
});

export default router;
