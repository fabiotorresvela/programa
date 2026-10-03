import { Capacitor } from '@capacitor/core';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function platformLabel() {
  const p = Capacitor.getPlatform();
  if (p === 'ios') return 'iPhone';
  if (p === 'android') return 'Android';
  return 'Web';
}

export async function initNativeShell() {
  if (!isNativeApp()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0F1F17' });
  } catch {
    // optional on web preview
  }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    // optional
  }
}

export async function pickReceiptPhoto(): Promise<string | undefined> {
  if (!isNativeApp()) return undefined;
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 80,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      promptLabelHeader: 'Foto del recibo',
      promptLabelPhoto: 'Galería',
      promptLabelPicture: 'Cámara',
    });
    return photo.dataUrl;
  } catch {
    return undefined;
  }
}
