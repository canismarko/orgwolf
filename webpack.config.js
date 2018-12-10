const path = require('path');
var webpack = require('webpack');

module.exports = {
    mode: 'development',
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
    },
    plugins: [
	new webpack.ProvidePlugin({
	    $: 'jquery',
	    jQuery: 'jquery',
	    'window.jQuery': 'jquery',
	}),
    ],
    // webpack.config.js
    module: {
	rules: [
	    {
		test: /tinymce\/skins\/lightgray\/*/,
		use: [
		    {
			loader: 'file-loader',
			options: {
			    // outputPath: 'tinymce/skins/lightgray',
			    name: '[path][name].[ext]',
			    context: 'node_modules/tinymce/',
			}
		    }
		]
	    }
	]
    }
};
