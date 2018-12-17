const path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: {
	orgwolf: './orgwolf/static/main-entry.js',
	tests: './orgwolf/static/test-entry.js',
    },
    output: {
	filename: '[name].js',
	path: path.resolve(__dirname, 'orgwolf', 'static',)
    },
    resolve: {
	modules: [
	    path.resolve(__dirname, 'node_modules'),
	    path.resolve(__dirname, 'orgwolf', 'static', 'orgwolf'),
	    path.resolve(__dirname, 'gtd', 'static'),
	    path.resolve(__dirname, 'wolfmail', 'static'),
	],
	extensions: ['.ts', '.js'],
    },
    plugins: [
	new webpack.ProvidePlugin({
	    $: 'jquery',
	    jQuery: 'jquery',
	    'window.jQuery': 'jquery',
	}),
    ],
    module: {
	rules: [
	    // For loading fonts and glyphs
	    // {
	    // 	test: /\.(png|woff|woff2|eot|ttf|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
	    // 	loader: 'url-loader?limit=10000?name=[name].[ext]&publicPath=/static/'
	    // 	// use: {
	    // 	//     loader: "url-loader",
	    // 	//     options: {
	    // 	// 	limit=10000,
	    // 	// 	name: '[name].[ext]',
	    // 	// 	publicPath: '/static/',
	    // 	//     }
	    // 	// }
	    // },
	    {
	    	test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
	    	loader: "url-loader?limit=10000&mimetype=application/font-woff&name=[name].[ext]&publicPath=/static/",
	    },
	    {
	    	test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
	    	loader: "file-loader?&name=[name].[ext]&publicPath=/static/"
	    },
	    {
	    	test: /\.(png|jpg)$/,
	    	loader: 'url-loader?limit=100000&name=[name].[ext]&publicPath=/static/'
	    },
	    // For converting typescript to javascript
	    {
		test: /\.ts$/,
		use: 'ts-loader',
		exclude: /node_modules/,
	    },
	],
    }
};
