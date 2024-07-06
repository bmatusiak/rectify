var path = require("path");
module.exports = {
  mode: "development",
  entry: path.resolve(__dirname, '../index.js'),
  output: {
    library: 'rectify',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, '../'),
    filename: 'browser.js',
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
