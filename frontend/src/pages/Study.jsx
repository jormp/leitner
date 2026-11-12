import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Study() {
  const [cards, setCards] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  useEffect(() => {
    api.session().then((r) => setCards(r.cards)).catch((e) => setError(e.message));
  }, []);

  const answer = async (correct) => {
    setBusy(true);
    setError('');
    try {
      await api.review(cards[index].id, correct);
      setStats((s) => ({ ...s, [correct ? 'correct' : 'wrong']: s[correct ? 'correct' : 'wrong'] + 1 }));
      setFlipped(false);
      setIndex((i) => i + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !cards) return <div className="alert error">{error}</div>;
  if (!cards) return <p className="muted">Cargando…</p>;

  if (cards.length === 0) {
    return (
      <div className="card center">
        <h1>🎉 No tienes tarjetas pendientes hoy</h1>
        <p className="muted">Vuelve mañana o añade nuevas preguntas.</p>
        <div className="row gap center-row">
          <Link className="btn ghost" to="/questions">Añadir preguntas</Link>
          <Link className="btn primary" to="/">Ver cajas</Link>
        </div>
      </div>
    );
  }

  if (index >= cards.length) {
    return (
      <div className="card center">
        <h1>✅ ¡Sesión completada!</h1>
        <p>
          Aciertos: <strong>{stats.correct}</strong> · Fallos: <strong>{stats.wrong}</strong>
        </p>
        <Link className="btn primary" to="/">Volver al panel</Link>
      </div>
    );
  }

  const card = cards[index];

  return (
    <>
      <div className="row between">
        <h1>Estudiar</h1>
        <span className="muted">{index + 1} / {cards.length}</span>
      </div>
      <div className="progress"><div style={{ width: `${(index / cards.length) * 100}%` }} /></div>

      <div className="flashcard-wrap">
        <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
          <div className="face front">
            <span className={`badge box-badge box-${card.box_id}`}>Caja {card.box_id}</span>
            <p className="flash-label">Pregunta</p>
            <p className="flash-text">{card.question}</p>
          </div>
          <div className="face back" aria-hidden={!flipped}>
            <span className={`badge box-badge box-${card.box_id}`}>Caja {card.box_id}</span>
            <p className="flash-label">Respuesta</p>
            <p className="flash-text">{card.answer}</p>
          </div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {!flipped ? (
        <div className="row center-row">
          <button className="btn primary big" onClick={() => setFlipped(true)}>
            Dar la vuelta
          </button>
        </div>
      ) : (
        <div className="row gap center-row">
          <button className="btn danger big" disabled={busy} onClick={() => answer(false)}>
            ✗ No la sabía
          </button>
          <button className="btn success big" disabled={busy} onClick={() => answer(true)}>
            ✓ La sabía
          </button>
        </div>
      )}
    </>
  );
}
