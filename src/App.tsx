import { useEffect, useState } from 'react';
import { Headphones, Home, LogOut, RefreshCw, Wallet } from 'lucide-react';
import type { View } from './types';
import { useAuth } from './context/AuthContext';
import { HomeView } from './views/HomeView';
import { AudioView } from './views/AudioView';
import { FinanceView } from './views/FinanceView';
import { LoginView } from './views/LoginView';
import { refreshApp } from './lib/appRefresh';
import { initNativeShell, platformLabel } from './lib/native';

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 18V6l8 6 8-6v12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function AppMain() {
  const { enabled, user, signOut } = useAuth();
  const [view, setView] = useState<View>('home');
  const [platform, setPlatform] = useState('Web');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void initNativeShell();
    setPlatform(platformLabel());
  }, []);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await refreshApp();
  };

  const userLabel = user?.email?.split('@')[0] ?? '';

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <button className="brand" onClick={() => setView('home')} aria-label="Ir al inicio">
            <BrandMark />
            <div>
              <div className="brand-name">Programa</div>
              <div className="brand-tag">
                Audio + finanzas · {platform}
                {enabled && userLabel ? ` · ${userLabel}` : ''}
              </div>
            </div>
          </button>
          <div className="topbar-actions">
            <button
              className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
              onClick={() => void onRefresh()}
              aria-label="Actualizar aplicación"
              title="Actualizar app"
            >
              <RefreshCw size={18} />
              <span>Actualizar</span>
            </button>
            {enabled && user && (
              <button className="refresh-btn" onClick={() => void signOut()} title="Cerrar sesión">
                <LogOut size={18} />
                <span>Salir</span>
              </button>
            )}
            <nav className="nav-pills desktop-nav" aria-label="Secciones">
              <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>
                <Home size={15} style={{ marginRight: 4, verticalAlign: -2 }} />
                Inicio
              </button>
              <button className={view === 'audio' ? 'active' : ''} onClick={() => setView('audio')}>
                <Headphones size={15} style={{ marginRight: 4, verticalAlign: -2 }} />
                Audio
              </button>
              <button
                className={view === 'finance' ? 'active' : ''}
                onClick={() => setView('finance')}
              >
                <Wallet size={15} style={{ marginRight: 4, verticalAlign: -2 }} />
                Finanzas
              </button>
            </nav>
          </div>
        </header>

        <main className="app-main">
          {view === 'home' && (
            <HomeView onOpenAudio={() => setView('audio')} onOpenFinance={() => setView('finance')} />
          )}
          {view === 'audio' && <AudioView />}
          {view === 'finance' && <FinanceView />}
        </main>
      </div>

      <nav className="tabbar" aria-label="Navegación móvil">
        <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>
          <Home size={20} />
          <span>Inicio</span>
        </button>
        <button className={view === 'audio' ? 'active' : ''} onClick={() => setView('audio')}>
          <Headphones size={20} />
          <span>Audio</span>
        </button>
        <button className={view === 'finance' ? 'active' : ''} onClick={() => setView('finance')}>
          <Wallet size={20} />
          <span>Finanzas</span>
        </button>
      </nav>
    </>
  );
}

export default function App() {
  const { enabled, loading, user } = useAuth();

  if (enabled && loading) {
    return (
      <div className="login-screen">
        <p className="muted">Cargando sesión…</p>
      </div>
    );
  }

  if (enabled && !user) {
    return <LoginView />;
  }

  return <AppMain />;
}
