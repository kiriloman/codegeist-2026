// Bundles src/frontend/frontend.jsx → src/frontend/frontend.js (Custom UI).
const path = require('path');

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'src/frontend/frontend.jsx'),
  output: {
    path: path.resolve(__dirname, 'src/frontend'),
    filename: 'frontend.js',
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['@babel/preset-react'] },
        },
      },
    ],
  },
  resolve: { extensions: ['.js', '.jsx'] },
};
