import express from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { config } from './config.js';
import { initDb, pool } from './db.js';
import authRoutes from './routes/auth.js';
import questionRoutes from './routes/questions.js';
import studyRoutes from './routes/study.js';

// Express 4 no captura rechazos de promesas en handlers async: lo hacemos aquí.
const wrap = (router) => {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const l of layer.route.stack) {
      const fn = l.handle;
      if (fn.length <= 3) {
        l.handle = (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
      }
    }
  }
  return router;
};

const app = express();
app.set('trust proxy', config.trustProxy); // nº de proxies delante (nginx del front [+ proxy del host])
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', wrap(authRoutes));
app.use('/api/questions', wrap(questionRoutes));
app.use('/api/study', wrap(studyRoutes));

app.use('/api', (_req, res) => res.status(404).json({ error: 'No encontrado' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: err.issues[0]?.message || 'Datos no válidos',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON no válido' });
  }
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

await initDb();
const server = app.listen(config.port, () => {
  console.log(`API Leitner escuchando en el puerto ${config.port}`);
});

const shutdown = () => {
  server.close(() => pool.end().finally(() => process.exit(0)));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
