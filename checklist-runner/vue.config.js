module.exports = {
  // Configure project name:
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].title = 'Checklist Runner';
        return args;
      });
    config
      .performance
        .maxEntrypointSize(1e6)
        .maxAssetSize(1e6);
  },
  // Ignore hidden files:
  configureWebpack: {
    devServer: {
      watchOptions: {
        ignored: [/\/\./],
      },
    },
  },
  transpileDependencies: [
    'vuetify'
  ],
  publicPath: './'
}
