// Saf mantık testleri (lib/) için jest-expo preset'i. RN/Expo modüllerinin
// transform edilmesi gerekiyor; transformIgnorePatterns preset'in default'unu
// (jest-preset.js) genişletir — pattern stili preset ile birebir (paket adından
// sonra `/` YOK), aksi halde expo-modules-core/src gibi .ts kaynaklar ignore'a
// düşüp "Cannot use import statement outside a module" verir.
// react-native-reanimated/worklets eklenir; @sentry/react-native zaten preset'te.
module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|react-native-reanimated|react-native-worklets))',
    'node_modules/react-native-reanimated/plugin/',
  ],
};
