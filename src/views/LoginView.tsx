import { useState } from 'react';
import { LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function LoginView() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6) {
      setMessage('Usa tu correo y una contraseña de al menos 6 caracteres.');
      return;
    }
    setBusy(true);
    setMessage('');
    const err =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp(email, password);
    setBusy(false);
    if (err) setMessage(err);
    else if (mode === 'register') setMessage('Cuenta lista. Ya puedes entrar.');
  };

  return (
    <div className="login-screen">
      <div className="login-card panel">
        <h1>Programa</h1>
        <p className="muted">
          Entra con tu usuario (correo) y contraseña. Cada persona tiene sus propios datos en la
          nube y puede usar la app en su celular.
        </p>

        <div className="kind-toggle" style={{ marginTop: '1rem' }}>
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Entrar
          </button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Crear cuenta
          </button>
        </div>

        <div className="form-grid" style={{ marginTop: '1rem' }}>
          <div className="field">
            <label>Correo (usuario)</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={busy} onClick={() => void submit()}>
          {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
          {mode === 'login' ? 'Iniciar sesión' : 'Registrarme'}
        </button>

        {message && <p className="muted" style={{ marginTop: '0.85rem' }}>{message}</p>}
      </div>
    </div>
  );
}
