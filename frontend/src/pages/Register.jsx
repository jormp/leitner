import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.register(form);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await api.resendVerification(form.email);
      setResent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (done) {
    return (
      <div className="auth-wrap">
        <div className="card auth">
          <h1>📬 Revisa tu correo</h1>
          <p>
            Hemos enviado un enlace de verificación a <strong>{form.email}</strong>. Debes abrirlo para
            activar tu cuenta.
          </p>
          <p className="muted">Si no lo ves, revisa la carpeta de spam.</p>
          {error && <div className="alert error">{error}</div>}
          {resent && <div className="alert success">Correo reenviado.</div>}
          <button className="btn ghost" onClick={resend}>Reenviar correo</button>
          <Link className="btn primary" to="/login" state={{ email: form.email }}>
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <form className="card auth" onSubmit={submit}>
        <h1>Crear cuenta</h1>
        <label>
          Nombre
          <input value={form.name} onChange={set('name')} required maxLength={100} autoFocus />
        </label>
        <label>
          Correo
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          Contraseña <span className="muted">(mínimo 8 caracteres)</span>
          <input type="password" value={form.password} onChange={set('password')} required minLength={8} />
        </label>

        {error && <div className="alert error">{error}</div>}

        <button className="btn primary" disabled={busy}>
          {busy ? 'Creando…' : 'Registrarme'}
        </button>
        <p className="muted center">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </form>
    </div>
  );
}
