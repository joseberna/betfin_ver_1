
const webpack = require('webpack');

const transpileModules = [
  '@rainbow-me/rainbowkit',
  'wagmi',
  'viem',
];

module.exports = {
  webpack: {
    configure: (config) => {
      // 1) Polyfills de Node (CRA 5 los quitó)
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
      };
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        })
      );

      // 2) Transpilar ESM moderno de ciertos node_modules
      const oneOfRule = config.module.rules.find((r) => r.oneOf);
      if (oneOfRule) {
        oneOfRule.oneOf.forEach((rule) => {
          if (rule.loader && rule.loader.includes('babel-loader') && rule.exclude) {
            // Transpila solo estos paquetes
            rule.exclude = new RegExp(
              `node_modules\\/(?!(${transpileModules.join('|')})\\/)`
            );
          }
        });
      }

      return config;
    },
  },
};
