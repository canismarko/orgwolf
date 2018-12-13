const path = require('path');
var webpack = require('webpack');

module.exports = {
    entry: {
	orgwolf: './orgwolf/static/main-entry.ts',
	tests: './orgwolf/static/test-entry.ts',
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
	    // For loading CSS files
	    {
		test: /\.(png|woff|woff2|eot|ttf|svg)$/,
		loader: 'url-loader?limit=100000'
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
