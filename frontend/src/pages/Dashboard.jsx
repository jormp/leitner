import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const [boxes, setBoxes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.boxes().then((r) => setBoxes(r.boxes)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!boxes) return <p className="muted">Cargando…</p>;

  const due = boxes.reduce((s, b) => s + b.due, 0);
  const total = boxes.reduce((s, b) => s + b.total, 0);

  return (
    <>
      <div className="row between wrap">
        <div>
          <h1>Tus cajas</h1>
          <p className="muted">{total} tarjetas en total</p>
        </div>
        <div className="row gap">
          <Link className="btn ghost" to="/questions">Añadir preguntas</Link>
          <Link className={`btn primary ${due === 0 ? 'disabled' : ''}`} to="/study">
            {due > 0 ? `Estudiar (${due} pendientes)` : 'Nada pendiente hoy'}
          </Link>
        </div>
      </div>

      <div className="boxes">
        {boxes.map((b) => (
          <Link key={b.id} to={`/questions?box=${b.id}`} className={`card box box-${b.id}`}>
            <div className="box-title">{b.name}</div>
            <div className="muted">{b.description}</div>
            <div className="box-count">{b.total}</div>
            <div className={b.due > 0 ? 'badge due' : 'badge'}>
              {b.due > 0 ? `${b.due} para hoy` : 'Al día'}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
