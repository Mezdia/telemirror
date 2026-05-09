import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.telemirror.android',
  appName: 'TeleMirror',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    cleartext: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
