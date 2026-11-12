# Caja Leitner

Aplicación web para estudiar con el método Leitner.

- **Frontend:** React + Vite, servido por nginx (que también hace proxy de `/api` al backend)
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL (tablas `users`, `questions`, `answers`, `boxes`)
- **Correo:** SMTP de Brevo (verificación de cuenta)

## Arranque

```bash
cp .env.example .env   # y rellena los valores (JWT_SECRET, SMTP_*, ...)
docker compose up -d --build
```

Abre http://localhost:8090 (puerto configurable con `WEB_PORT`).

## Funcionamiento

| Caja | Repaso |
|------|--------|
| 1 | Diario (tarjetas nuevas o falladas) |
| 2 | Cada 3 días |
| 3 | Semanal |
| 4 | Quincenal (15 días) |
| 5 | Mensual (30 días) |

- Las preguntas nuevas entran en la Caja 1.
- Al estudiar se muestran las tarjetas cuyo repaso toca hoy. El usuario da la vuelta a la tarjeta y decide si la sabía:
  - **Acierto:** sube a la siguiente caja (la Caja 5 se mantiene).
  - **Fallo:** vuelve a la Caja 1.
- Los intervalos están en la tabla `boxes` (`backend/src/schema.sql`). "Hoy" se calcula con `APP_TIMEZONE`.

## Importar preguntas (JSON)

En la sección **Importar** se puede pegar o cargar un archivo con este formato (hay un ejemplo en la propia página):

```json
[
  { "pregunta": "¿Capital de Francia?", "respuesta": "París" },
  { "pregunta": "¿Cuánto es 7 x 8?", "respuesta": "56" }
]
```

Todas las preguntas entran siempre en la Caja 1 (cualquier otro campo, como `caja`, se rechaza). Máximo 500 por
importación; si hay algún error no se importa nada.

## Registro

`POST /api/auth/register` crea la cuenta y envía un correo con un enlace a `APP_URL/verify-email?token=...`
(caduca en 24 h). Sin verificar no se puede iniciar sesión. Si `SMTP_HOST` está vacío, el enlace se imprime en
los logs del backend (`docker compose logs backend`).

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` · `/login` · `/verify-email` · `/resend-verification` | Autenticación |
| GET | `/api/auth/me` | Usuario actual |
| GET/POST | `/api/questions` | Listar (`?box=N`) / crear pregunta + respuesta |
| POST | `/api/questions/import` | Importar lista `[{pregunta, respuesta}]` (siempre a la Caja 1) |
| PUT/DELETE | `/api/questions/:id` | Editar / borrar |
| GET | `/api/study/boxes` | Cajas con total y pendientes de hoy |
| GET | `/api/study/session` | Tarjetas a repasar hoy |
| POST | `/api/study/review/:id` | `{ "correct": true \| false }` |
