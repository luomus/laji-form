var path = require("path");
var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	entry: {
		"laji-form": "./src/app",
		styles: "./src/styles"
	},
	output: {
		path: path.join(__dirname, "dist"),
		filename: "[name].js",
		libraryTarget: "umd"
	},
	plugins: [
		new ExtractTextPlugin("[name].css", {allChunks: true}),
		new CopyPlugin([{from: "src/img/*.png", to: "images/", flatten: true}]),
		new webpack.IgnorePlugin(/^(buffertools)$/), // unwanted "deeper" dependency
		new webpack.DefinePlugin({"process.env.NODE_ENV": "\"production\""})
	],
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
		],
		noParse: [
			/node_modules\/proj4\/dist\/proj4\.js/
		]
	}
};
