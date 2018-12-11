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
	    // For handling TinyMCE editor skins
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
	    },
	    // For loading CSS files
	    {
		test: /\.(png|woff|woff2|eot|ttf|svg)$/,
		exclude: /tinymce\/skins/,
		loader: 'url-loader?limit=100000'
	    },
	    {
	    	test: /\.css$/,
	    	exclude: /tinymce\/skins/,
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
};
