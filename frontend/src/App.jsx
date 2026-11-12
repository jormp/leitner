import { Navigate, NavLink, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Questions from './pages/Questions.jsx';
import Study from './pages/Study.jsx';
import Import from './pages/Import.jsx';

function Protected() {
  const { user, loading, logout } = useAuth();
  if (loading) return <p className="center muted">Cargando…</p>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      <header className="nav">
        <span className="brand">📚 Caja Leitner</span>
        <nav>
          <NavLink to="/" end>Panel</NavLink>
          <NavLink to="/questions">Preguntas</NavLink>
          <NavLink to="/import">Importar</NavLink>
          <NavLink to="/study">Estudiar</NavLink>
        </nav>
        <div className="nav-user">
          <span className="muted">{user.name}</span>
          <button className="btn small ghost" onClick={logout}>Salir</button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  );
}

function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center muted">Cargando…</p>;
  if (user) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/questions" element={<Questions />} />
        <Route path="/import" element={<Import />} />
        <Route path="/study" element={<Study />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
