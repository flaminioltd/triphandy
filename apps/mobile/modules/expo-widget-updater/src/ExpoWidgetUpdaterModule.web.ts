import { registerWebModule, NativeModule } from 'expo';

class ExpoWidgetUpdaterModule extends NativeModule<{}> {}

export default registerWebModule(ExpoWidgetUpdaterModule, 'ExpoWidgetUpdaterModule');
