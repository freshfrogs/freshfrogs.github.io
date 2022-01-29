const webpack = require('webpack');
module.exports = {
  entry: "./index.js",
  mode: 'production',
  output: {
    filename: 'ipfsh.min.js',
    library: 'ipfsh',
  },
//  plugins: [
//    new webpack.ProvidePlugin({
//    	process: 'process/browser',
//      Buffer: ['buffer', 'Buffer'],
//    }),
//  ],
//  resolve: {
//    extensions: [ '.js' ],
//    fallback: {
//      "stream": require.resolve("stream-browserify"),
//      "buffer": require.resolve("buffer")
//    }
//  },
};
