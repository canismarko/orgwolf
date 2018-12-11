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
		test: /\.less$/,
		use: [{loader: 'style-loader'},
		      {loader: 'css-loader'},
		      {loader: 'less-loader', options: {
	    		  strictMath: true,
	    		  noIeCompat: true
		      }
		      }]
	    },
	]
    }
});
