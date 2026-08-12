import { NativeModule, requireNativeModule } from 'expo';

declare class ExpoWidgetUpdaterModule extends NativeModule {
  setItem(key: string, value: string): void;
  updateWidget(widgetClassName: string): void;
}

export default requireNativeModule<ExpoWidgetUpdaterModule>('ExpoWidgetUpdater');
