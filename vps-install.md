# Despliegue en el VPS → https://estudi.conlazeta.com

Se asume que:

- El código ya está clonado desde GitHub en `/home/sevendaysuser/projectes_zij/` (en la carpeta del repo).
- El VPS tiene Ubuntu, Docker (con Compose), ufw, nginx y certbot (Let's Encrypt).
- El subdominio `estudi.conlazeta.com` ya apunta (registro `A`) a la IP del VPS.

Cómo queda:

```
https://estudi.conlazeta.com ──> nginx del host (443, Let's Encrypt) ──> 127.0.0.1:8090 ──> contenedores Docker
```

El único archivo de nginx que hay que tocar es **uno nuevo**: `/etc/nginx/sites-available/estudi.conlazeta.com`
(más su enlace en `sites-enabled`). No se modifica nada de tus otros sitios.

---

## 1. Configurar el `.env`

```bash
cd /home/sevendaysuser/projectes_zij/<carpeta-del-repo>

cp .env.example .env
sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|; s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 16)|" .env
chmod 600 .env
nano .env
```

Deja estos valores (rellena tus credenciales SMTP de Brevo):

```dotenv
APP_URL=https://estudi.conlazeta.com
WEB_PORT=8090
WEB_BIND=127.0.0.1
TRUST_PROXY=2

SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=No-Reply <no-reply@conlazeta.com>
```

- `APP_URL` debe ser exactamente `https://estudi.conlazeta.com` (sale en el enlace del correo de verificación).
- `WEB_BIND=127.0.0.1`: no lo cambies. Docker se salta ufw al publicar puertos, así que solo debe escuchar en local.
- `TRUST_PROXY=2` porque hay dos proxies delante del backend (nginx del host + nginx del contenedor).
- Si el puerto 8090 ya lo usa otra cosa del VPS (`ss -tlnp | grep 8090`), cambia `WEB_PORT` aquí **y** en el paso 3.

## 2. Levantar el proyecto

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:8090/api/health      # → {"status":"ok"}
```

Arranca solo tras reiniciar el VPS (`restart: unless-stopped`).

## 3. nginx: crear el sitio

```bash
sudo nano /etc/nginx/sites-available/estudi.conlazeta.com
```

```nginx
server {
    listen 80;
    server_name estudi.conlazeta.com;

    client_max_body_size 2m;   # para importar JSON grandes

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Actívalo y recarga:

```bash
sudo ln -s /etc/nginx/sites-available/estudi.conlazeta.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Certificado HTTPS

```bash
sudo certbot --nginx -d estudi.conlazeta.com
```

Certbot edita el archivo del paso 3: añade el bloque `listen 443 ssl` con el certificado y la redirección de
HTTP a HTTPS. Comprueba la renovación automática:

```bash
sudo certbot renew --dry-run
```

## 5. Firewall (ufw)

```bash
sudo ufw status
sudo ufw allow 'Nginx Full'     # 80 y 443, si aún no están abiertos
```

No abras el 8090. Si tu proveedor tiene un firewall externo, permite también 80 y 443.

## 6. Probar

Abre https://estudi.conlazeta.com, regístrate con un correo real, abre el enlace de verificación que llega
(mira en spam) e inicia sesión.

---

## Actualizar a una versión nueva

```bash
cd /home/sevendaysuser/projectes_zij/<carpeta-del-repo>
git pull
docker compose up -d --build
```

Los datos de la base de datos se conservan en un volumen de Docker.

## Copia de seguridad

```bash
mkdir -p ~/backups
docker compose exec -T db pg_dump -U leitner leitner | gzip > ~/backups/leitner_$(date +%F).sql.gz
```

Restaurar: `gunzip -c ~/backups/ARCHIVO.sql.gz | docker compose exec -T db psql -U leitner -d leitner`

> Nunca uses `docker compose down -v`: borra la base de datos.

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| `502 Bad Gateway` | Contenedores caídos o puerto distinto: `docker compose ps` y `curl http://127.0.0.1:8090/api/health`. El puerto del `proxy_pass` debe coincidir con `WEB_PORT`. |
| `certbot` falla | El DNS aún no apunta al VPS (`dig +short estudi.conlazeta.com`) o el puerto 80 está cerrado. |
| No llega el correo | `docker compose logs backend` (busca `[mailer]`). Comprueba credenciales y salida al 587: `nc -vz smtp-relay.brevo.com 587`. En el login hay un botón para reenviar. |
| El enlace del correo apunta a `localhost` | `APP_URL` incorrecto en `.env`; corrígelo y `docker compose up -d`. |
| Se entra a otro sitio en vez de a este | Otro `server` de nginx está capturando el dominio: `sudo nginx -T \| grep -n server_name`. |
| "Demasiados intentos" para todos | `TRUST_PROXY` debe ser `2`. |
| Error 413 al importar | Falta `client_max_body_size 2m;` en el nginx del host. |
