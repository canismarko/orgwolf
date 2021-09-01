const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
    mode: 'development',
    module: {
	rules: [
	    {
		test: /\.css$/,
		use: ['style-loader','css-loader'],
	    },
	    {
		test: /\.s[ac]ss$/i,
		use: ['style-loader', 'css-loader', 'sass-loader'],
	    },
	]
    }
});
