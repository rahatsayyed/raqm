/** @param {import('@babel/core').ConfigAPI} api */
module.exports = function (api) {
  api.cache.forever();
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'], // must be last
  };
};
