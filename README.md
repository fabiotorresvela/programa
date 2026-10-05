# Programa (Android + iPhone)

App personal con dos funciones:

1. **Audio de práctica** — resúmenes para escuchar en la ruta.
2. **Finanzas** — gastos, ingresos y préstamos por voz o foto.

Está preparada para **Android** e **iPhone** con Capacitor, y también se puede instalar como **PWA** desde el navegador del celular.

## Desarrollo web

```bash
npm install
npm run dev
```

## Construir app móvil

```bash
npm install
npm run mobile:sync
```

Eso genera/actualiza los proyectos nativos en `android/` e `ios/`.

### Android

1. Instala [Android Studio](https://developer.android.com/studio).
2. Ejecuta `npm run mobile:android` (o abre la carpeta `android/` en Android Studio).
3. Conecta un teléfono o usa un emulador y pulsa Run.

### iPhone / iOS

1. En un Mac, instala Xcode.
2. Ejecuta `npm run mobile:ios` (o abre `ios/App/App.xcworkspace` en Xcode).
3. Elige un iPhone/simulador y pulsa Run.

> La primera vez, si `android/` o `ios/` no existen: `npm run cap:add` y luego `npm run mobile:sync`.

## Instalar rápido en el celular (PWA)

1. Sube o sirve la app (`npm run build && npm run preview`) o publícala en un hosting HTTPS.
2. En **Android (Chrome)**: menú → “Instalar app” / “Añadir a pantalla de inicio”.
3. En **iPhone (Safari)**: Compartir → “Añadir a pantalla de inicio”.

Así queda con icono propio, pantalla completa y sin barra del navegador.

## Permisos

- Micrófono: dictado de gastos y lectura de resúmenes.
- Cámara / fotos: recibos en Finanzas (plugin Capacitor Camera en app nativa).

## Cuentas (compartir con otra persona)

Cada persona entra con **correo + contraseña**. Sus datos quedan en la nube (Supabase, plan gratis).

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, pega y ejecuta `supabase/schema.sql`.
3. En **Authentication → Providers → Email**, puedes desactivar “Confirm email” para entrar más rápido.
4. Copia **Project URL** y **anon public key** (Settings → API).
5. En GitHub → repo **programa** → Settings → Secrets → Actions, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Sube cambios a `main` (el workflow publica la app con login).

Comparte el enlace: https://fabiotorresvela.github.io/programa/  
La otra persona toca **Crear cuenta**, elige su correo y contraseña, e instala la app en su iPhone.
