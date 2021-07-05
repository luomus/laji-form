//import path from "path";
//import webpack from "webpack";
//import CopyWebpackPlugin from "copy-webpack-plugin";
const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
	mode: "development",
	devtool: "eval",
	entry: [
		path.join(path.resolve(), "playground", "app"),
	],
	output: {
		publicPath: "/build/",
		filename: "main.js"
	},
	plugins: [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.DefinePlugin({"process.env.NODE_ENV": "\"development\""}),
		new CopyWebpackPlugin({patterns: [{from: path.join(path.resolve(), "src", "img"), to: "."}]})
	],
	devServer: {
		contentBase: path.join(path.resolve(), "playground"),
		host: "0.0.0.0",
		port: 8083,
		inline: true
	},
	module: {
		rules: [
			{
				test: /\.(j|t)sx?$/,
				use: [{
					loader: "ts-loader"
				}],
				include: [
					path.join(path.resolve(), "src"),
					path.join(path.resolve(), "playground")
				]
			},
			{
				test: /\.png$/,
				type: "asset/inline"
			},
			{
				test: /\.(jpg|gif|ttf|eot|svg|woff2?)$/,
				type: "asset/resource"
			},
			{
				test: /\.css$/,
				use: [
					{
						loader: "style-loader"
					},
					{
						loader: "css-loader"
					}
				]
			},
		],
		noParse: [
			/node_modules\/proj4\/dist\/proj4\.js/
		]
	},
	resolve: {
		extensions: [".tsx", ".ts",  ".jsx", ".js"]
	},
	watchOptions: {
		  ignored: /\.swp$/,
	}
};
