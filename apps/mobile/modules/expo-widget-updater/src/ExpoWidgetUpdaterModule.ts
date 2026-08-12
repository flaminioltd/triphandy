import { NativeModule, requireNativeModule } from 'expo-modules-core';

declare class ExpoWidgetUpdaterModule extends NativeModule {
  setItem(key: string, value: string): void;
  updateWidget(widgetClassName: string): void;
}

let instance: ExpoWidgetUpdaterModule | null = null;
try {
  instance = requireNativeModule<ExpoWidgetUpdaterModule>('ExpoWidgetUpdater');
} catch (e) {
  console.warn("Failed to load ExpoWidgetUpdater native module:", e);
}

export default instance;
