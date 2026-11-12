import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';

function QuestionForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [question, setQuestion] = useState(initial?.question || '');
  const [answer, setAnswer] = useState(initial?.answer || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await onSubmit({ question, answer });
      if (!initial) {
        setQuestion('');
        setAnswer('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack">
      <label>
        Pregunta
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} required maxLength={2000} rows={2} />
      </label>
      <label>
        Respuesta correcta
        <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} required maxLength={5000} rows={3} />
      </label>
      {error && <div className="alert error">{error}</div>}
      <div className="row gap">
        <button className="btn primary" disabled={busy}>{submitLabel}</button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
        )}
      </div>
    </form>
  );
}

export default function Questions() {
  const [params, setParams] = useSearchParams();
  const box = params.get('box') || '';
  const [questions, setQuestions] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.listQuestions(box).then((r) => setQuestions(r.questions)).catch((e) => setError(e.message));
  }, [box]);

  useEffect(() => {
    setQuestions(null);
    load();
  }, [load]);

  const create = async (data) => {
    await api.createQuestion(data);
    load();
  };

  const update = async (id, data) => {
    await api.updateQuestion(id, data);
    setEditingId(null);
    load();
  };

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar esta pregunta?')) return;
    try {
      await api.deleteQuestion(id);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <h1>Preguntas</h1>

      <section className="card">
        <h2>Nueva pregunta</h2>
        <p className="muted">
          Las preguntas nuevas empiezan en la Caja 1. ¿Muchas a la vez? <Link to="/import">Impórtalas desde JSON</Link>.
        </p>
        <QuestionForm submitLabel="Añadir" onSubmit={create} />
      </section>

      <div className="row between wrap" style={{ marginTop: 24 }}>
        <h2>Tus tarjetas</h2>
        <select
          value={box}
          onChange={(e) => setParams(e.target.value ? { box: e.target.value } : {})}
          aria-label="Filtrar por caja"
        >
          <option value="">Todas las cajas</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>Caja {n}</option>
          ))}
        </select>
      </div>

      {error && <div className="alert error">{error}</div>}
      {!questions && !error && <p className="muted">Cargando…</p>}
      {questions?.length === 0 && <p className="muted">No hay preguntas todavía.</p>}

      <div className="stack">
        {questions?.map((q) => (
          <article key={q.id} className="card">
            {editingId === q.id ? (
              <QuestionForm
                initial={q}
                submitLabel="Guardar"
                onSubmit={(d) => update(q.id, d)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="row between">
                  <span className={`badge box-badge box-${q.box_id}`}>Caja {q.box_id}</span>
                  <span className="muted small-text">Próximo repaso: {q.next_review_date}</span>
                </div>
                <p className="q-text">{q.question}</p>
                <p className="a-text">{q.answer}</p>
                <div className="row gap">
                  <button className="btn small ghost" onClick={() => setEditingId(q.id)}>Editar</button>
                  <button className="btn small danger" onClick={() => remove(q.id)}>Eliminar</button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
