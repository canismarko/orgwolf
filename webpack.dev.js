const merge = require('webpack-merge');
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
		use: [{loader: 'style-loader'},
		      {loader: 'css-loader'},
		      {loader: 'sass-loader'}
		     ],
	    },
	]
    }
});
