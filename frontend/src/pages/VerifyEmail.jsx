import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : 'Falta el token de verificación');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api
      .verifyEmail(token)
      .then((r) => {
        setState('ok');
        setMessage(r.message);
      })
      .catch((err) => {
        setState('error');
        setMessage(err.message);
      });
  }, [token]);

  return (
    <div className="auth-wrap">
      <div className="card auth center">
        {state === 'loading' && <p>Verificando tu correo…</p>}
        {state === 'ok' && (
          <>
            <h1>✅ ¡Correo verificado!</h1>
            <p>{message}</p>
            <Link className="btn primary" to="/login">Iniciar sesión</Link>
          </>
        )}
        {state === 'error' && (
          <>
            <h1>❌ No se pudo verificar</h1>
            <p>{message}</p>
            <p className="muted">Puedes iniciar sesión para pedir un nuevo correo de verificación.</p>
            <Link className="btn primary" to="/login">Ir a iniciar sesión</Link>
          </>
        )}
      </div>
    </div>
  );
}
