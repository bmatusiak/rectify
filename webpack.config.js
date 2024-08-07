var path = require("path");
module.exports = {
  mode: "development",
  entry: path.resolve(__dirname, './index.mjs'),
  output: {
    globalObject: `globalThis`,
    library: 'rectify',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, './'),
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
};
