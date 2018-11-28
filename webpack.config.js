const path = require('path');

module.exports = {
    mode: 'development',
    entry: './orgwolf/static/orgwolf/main.js',
    output: {
	filename: 'orgwolf.js',
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
};
