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
	    {
	    	test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
		type: "asset/inline",
	    },
	    {
	    	test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
		type: "asset/inline",
	    },
	    {
	    	test: /\.(png|jpg)$/,
		type: "asset/inline",
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
