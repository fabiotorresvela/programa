import { Headphones, Smartphone, UserCircle, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isCloudAuthEnabled } from '../lib/supabase';

type Props = {
  onOpenAudio: () => void;
  onOpenFinance: () => void;
};

export function HomeView({ onOpenAudio, onOpenFinance }: Props) {
  const { user } = useAuth();

  return (
    <section className="hero" aria-label="Inicio Programa">
      <div className="hero-media" aria-hidden />
      <div className="hero-content">
        <h1>Programa</h1>
        <p>
          Hecha para Android e iPhone: escucha práctica en la ruta y controla gastos, ingresos y
          préstamos desde el bolsillo.
        </p>
        <div className="cta-row">
          <button className="btn btn-primary" onClick={onOpenAudio}>
            <Headphones size={18} />
            Escuchar y practicar
          </button>
          <button className="btn btn-ghost" onClick={onOpenFinance}>
            <Wallet size={18} />
            Controlar finanzas
          </button>
        </div>
        <p className="install-hint">
          <Smartphone size={16} />
          En el teléfono puedes instalarla como app (PWA) o generar el proyecto nativo Android / iOS
          con Capacitor.
        </p>
        {isCloudAuthEnabled && user && (
          <p className="install-hint">
            <UserCircle size={16} />
            Sesión: {user.email}. Comparte el enlace de Programa; cada persona crea su cuenta con
            correo y contraseña.
          </p>
        )}
      </div>
    </section>
  );
}
