/** @param {import('@babel/core').ConfigAPI} api */
module.exports = function (api) {
  api.cache.forever();
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'react-native-iconify/babel',
        { icons: require('./icon-manifest.js') },
      ],
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
