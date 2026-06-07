module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // WatermelonDB requires legacy decorators on its model classes
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // Reanimated / Worklets plugin MUST be listed last
      'react-native-worklets/plugin',
    ],
  };
};
