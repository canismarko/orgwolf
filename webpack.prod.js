const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');

// Minify and combine CSS
const TerserPlugin = require("terser-webpack-plugin");
const OptimizeCSSAssetsPlugin = require("optimize-css-assets-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
var miniCssLoader = {
    loader: MiniCssExtractPlugin.loader,
    options: {
	// you can specify a publicPath here
	// by default it use publicPath in webpackOptions.output
	publicPath: '../'
    }
}

module.exports = merge(common, {
    mode: 'production',
    optimization: {
	minimize: true,
	minimizer: [
	    new TerserPlugin(),
	    new OptimizeCSSAssetsPlugin({}),
	]
    },
    plugins: [
	new MiniCssExtractPlugin({
	    // Options similar to the same options in webpackOptions.output
	    // both options are optional
	    filename: "[name].css",
	    chunkFilename: "[id].css"
	})
    ],
    module: {
	rules: [
	    {
	    	test: /\.css$/,
	    	use: [miniCssLoader, 'css-loader'],
	    },
	    {
	    	test: /\.s[ac]ss$/,
	    	use: [miniCssLoader,pack, 'css-loader', 'sass-loader']
	    },
	],
    }
});
