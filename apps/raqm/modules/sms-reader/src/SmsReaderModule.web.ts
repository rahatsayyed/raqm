import { registerWebModule, NativeModule } from 'expo';

class SmsReaderModule extends NativeModule<{}> {}

export default registerWebModule(SmsReaderModule, 'SmsReaderModule');
