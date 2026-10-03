import { Headphones, Smartphone, Wallet } from 'lucide-react';

type Props = {
  onOpenAudio: () => void;
  onOpenFinance: () => void;
};

export function HomeView({ onOpenAudio, onOpenFinance }: Props) {
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
      </div>
    </section>
  );
}
