import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.programa.mobile',
  appName: 'Programa',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0F1F17',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F1F17',
    },
    Keyboard: {
      resize: 'body',
    },
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    // Audio en segundo plano se declara en Info.plist (UIBackgroundModes: audio)
    contentInset: 'automatic',
  },
};

export default config;
