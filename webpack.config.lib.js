var path = require("path");
var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var nodeExternals = require('webpack-node-externals');

module.exports = {
	entry: {
		"laji-form": "./src/app",
		styles: "./src/styles",
		utils: ["./src/utils"],
	},
	output: {
		path: path.join(__dirname, "lib"),
		filename: "[name].js",
		libraryTarget: "umd"
	},
	plugins: [
		new ExtractTextPlugin("[name].css", {allChunks: true}),
		new webpack.IgnorePlugin(/^(buffertools)$/), // unwanted "deeper" dependency
		new webpack.DefinePlugin({'process.env.NODE_ENV': '"production"'})
	],
	target: 'node', // in order to ignore built-in modules like path, fs, etc.
	externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				include: [
					path.join(__dirname, "src"),
				],
				loader: "babel"
			},
			{
				test: /\.json$/,
				loader: "json"
			},
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract("css-loader"),
				exclude: [
					path.join(__dirname, "playground", "styles-dev.css")
				]

			},
			{
				test: /\.less$/,
				loader: ExtractTextPlugin.extract("css-loader!less-loader")
			},
			{
				test: /\.woff(2)?(\?v=[0-9].[0-9].[0-9])?$/,
				loader: "url-loader?mimetype=application/font-woff"
			},
			{
				test: /\.(ttf|eot|svg|png|jpg|gif)(\?v=[0-9].[0-9].[0-9])?$/,
				loader: "file-loader?name=images/[name].[ext]"
			},
		]
	}
};
