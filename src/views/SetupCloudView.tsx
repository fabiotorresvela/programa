export function SetupCloudView() {
  return (
    <div className="login-screen">
      <div className="login-card panel">
        <h1>Cuentas en la nube</h1>
        <p className="muted">
          Para que otra persona use Programa con usuario y contraseña, hay que conectar Supabase
          (gratis). El desarrollador debe agregar las claves al publicar la app.
        </p>
        <ol className="backup-steps">
          <li>Crear proyecto en supabase.com</li>
          <li>Ejecutar el archivo <code>supabase/schema.sql</code></li>
          <li>Agregar <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> al build</li>
        </ol>
        <p className="muted" style={{ marginTop: '0.75rem' }}>
          Mientras tanto puedes seguir usando la app en modo local en este dispositivo.
        </p>
      </div>
    </div>
  );
}
