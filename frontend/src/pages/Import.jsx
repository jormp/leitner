import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const EXAMPLE = [
  { pregunta: '¿Cuál es la capital de Francia?', respuesta: 'París' },
  { pregunta: '¿Cuánto es 7 x 8?', respuesta: '56' },
  { pregunta: '¿Quién escribió "Don Quijote de la Mancha"?', respuesta: 'Miguel de Cervantes' },
];
const EXAMPLE_TEXT = JSON.stringify(EXAMPLE, null, 2);

export default function Import() {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [imported, setImported] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setText(await file.text());
    setError('');
    setImported(null);
    e.target.value = '';
  };

  const downloadExample = () => {
    const url = URL.createObjectURL(new Blob([EXAMPLE_TEXT], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ejemplo-preguntas.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setImported(null);

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      setError(`El texto no es un JSON válido: ${err.message}`);
      return;
    }

    setBusy(true);
    try {
      const r = await api.importQuestions(data);
      setImported(r.imported);
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Importar preguntas</h1>
      <p className="muted">
        Añade muchas preguntas de golpe con un archivo JSON. <strong>Todas entran en la Caja 1</strong>; no es
        posible importarlas en otras cajas.
      </p>

      <section className="card stack">
        <h2>Formato</h2>
        <p>
          Una lista de objetos, cada uno con los campos <code>pregunta</code> y <code>respuesta</code> (texto).
          No se admiten otros campos. Máximo 500 preguntas por importación; si hay algún error no se importa
          nada.
        </p>
        <pre className="code">{EXAMPLE_TEXT}</pre>
        <div className="row gap wrap">
          <button type="button" className="btn small ghost" onClick={() => setText(EXAMPLE_TEXT)}>
            Usar este ejemplo
          </button>
          <button type="button" className="btn small ghost" onClick={downloadExample}>
            Descargar ejemplo (.json)
          </button>
        </div>
      </section>

      <form className="card stack" onSubmit={submit} style={{ marginTop: 20 }}>
        <h2>Tu JSON</h2>
        <div className="row gap wrap">
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={onFile} hidden />
          <button type="button" className="btn ghost" onClick={() => fileRef.current.click()}>
            📁 Cargar archivo .json
          </button>
          <span className="muted small-text">o pega el contenido aquí abajo</span>
        </div>
        <textarea
          className="mono"
          rows={12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={EXAMPLE_TEXT}
          spellCheck={false}
          required
        />

        {error && <div className="alert error">{error}</div>}
        {imported !== null && (
          <div className="alert success">
            ✅ Se han importado {imported} {imported === 1 ? 'pregunta' : 'preguntas'} en la Caja 1.{' '}
            <Link to="/questions?box=1">Verlas</Link>
          </div>
        )}

        <div>
          <button className="btn primary" disabled={busy || !text.trim()}>
            {busy ? 'Importando…' : 'Importar a la Caja 1'}
          </button>
        </div>
      </form>
    </>
  );
}
