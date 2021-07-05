const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
	mode: "production",
	entry: {
		"laji-form": path.join(path.resolve(), "src", "index"),
		styles: path.join(path.resolve(), "src", "styles")
	},
	output: {
		path: path.join(path.resolve(), "dist"),
		filename: "[name].js",
		libraryTarget: "umd"
	},
	plugins: [
		new MiniCssExtractPlugin({filename: "[name].css"}),
		new CopyPlugin({patterns: [{from: "src/img/*.png", to: "images/[name][ext]"}]}),
		new webpack.IgnorePlugin(/^(buffertools)$/), // unwanted "deeper" dependency
		new webpack.DefinePlugin({"process.env.NODE_ENV": "\"production\""})
	],
	module: {
		rules: [
			{
				test: /\.(j|t)sx?$/,
				use: [{
					loader: "ts-loader"
				}],
				include: [
					path.join(path.resolve(), "src"),
				]
			},
			{
				test: /\.css$/,
				use: [
					MiniCssExtractPlugin.loader,
					"css-loader"
				],
				exclude: [
					path.join(path.resolve(), "playground", "styles-dev.css")
				]
			},
			{
				test: /\.(jpg|gif|ttf|eot|svg|woff2?)$/,
				type: "asset/inline"
			},
		],
		noParse: [
			/node_modules\/proj4\/dist\/proj4\.js/
		]
	},
	resolve: {
		extensions: [".tsx", ".ts",  ".jsx", ".js", ".json"]
	}
};
