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
        {
          // Every Iconify icon used in src/components/TabIcon.tsx. Must live
          // inline in this file: Metro keys its transform cache on this file's
          // content, so a require()'d list would not invalidate the cache.
          icons: [
            'material-symbols:home-outline-rounded',
            'material-symbols:account-balance-wallet-outline-rounded',
            'material-symbols:lightbulb-outline-rounded',
            'material-symbols:more-horiz',
            'material-symbols:swap-vert-rounded',
            'material-symbols:bar-chart-rounded',
            'material-symbols:search-rounded',
            'material-symbols:account-balance-outline-rounded',
            'material-symbols:autorenew-rounded',
            'material-symbols:payments-outline-rounded',
            'material-symbols:refresh-rounded',
            'material-symbols:upload-rounded',
            'material-symbols:delete-outline-rounded',
            'material-symbols:settings-outline-rounded',
            'material-symbols:location-on-outline-rounded',
            'material-symbols:info-outline-rounded',
            'material-symbols:chevron-right-rounded',
            'mdi:silverware-variant',
            'lucide:shopping-basket',
            'lucide:shopping-bag',
            'lucide:car',
            'lucide:plane',
            'lucide:receipt',
            'lucide:heart-pulse',
            'lucide:film',
            'lucide:graduation-cap',
            'lucide:scissors',
            'lucide:wallet-cards',
            'lucide:arrow-left-right',
            'lucide:credit-card',
            'lucide:trending-up',
            'lucide:gift',
            'lucide:badge-percent',
            'lucide:circle-question-mark',
            'lucide:layers',
            'lucide:house',
          ],
        },
      ],
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
