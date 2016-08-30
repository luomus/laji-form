var path = require("path");
var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

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
		new webpack.IgnorePlugin(/^(buffertools)$/) // unwanted "deeper" dependency
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
				test: /\.png$/,
				loader: "url-loader?limit=100000"
			},
			{
				test: /\.jpg$/,
				loader: "file-loader?name=images/[name].[ext]"
			},
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract("css-loader")
			},
			{
				test: /\.less$/,
				loader: ExtractTextPlugin.extract("css-loader!less-loader")
			},
			{
				test: /\.gif$/,
				loader: "url-loader?mimetype=image/png"
			},
			{
				test: /\.woff(2)?(\?v=[0-9].[0-9].[0-9])?$/,
				loader: "url-loader?mimetype=application/font-woff"
			},
			{
				test: /\.(ttf|eot|svg)(\?v=[0-9].[0-9].[0-9])?$/,
				loader: "file-loader?name=images/[name].[ext]"
			},
		]
	}
};
