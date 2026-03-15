module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [require('babel-preset-expo'), { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      'react-native-worklets/plugin',
      'react-native-reanimated/plugin',
    ],
  };
};
