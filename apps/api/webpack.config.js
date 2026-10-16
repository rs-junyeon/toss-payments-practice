const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      // 기본값('all')은 루트 node_modules에 있는 패키지만 번들에서 뺀다.
      // 이 앱의 의존성은 apps/api/package.json에 있으므로 목록을 직접 넘겨 node_modules에서 불러오게 한다.
      externalDependencies: Object.keys(require('./package.json').dependencies),
    }),
  ],
};
