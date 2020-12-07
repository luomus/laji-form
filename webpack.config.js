var path = require("path");
var webpack = require("webpack");
var CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
	mode: "development",
	devtool: "eval",
	entry: [
		path.join(__dirname, "playground", "app"),
	],
	output: {
		publicPath: "/build/",
		filename: "main.js"
	},
	plugins: [
		new webpack.HotModuleReplacementPlugin(),
		new webpack.DefinePlugin({"process.env.NODE_ENV": "\"development\""}),
		new CopyWebpackPlugin({patterns: [{from: path.join(__dirname, "src", "img"), to: "."}]})
	],
	module: {
		rules: [
			{
				test: /\.(j|t)sx?$/,
				loader: "awesome-typescript-loader?module=es6",
				include: [
					path.join(__dirname, "src"),
					path.join(__dirname, "playground")
				]
			},
			{
				test: /\.png$/,
				loader: "url-loader?limit=100000"
			},
			{
				test: /\.jpg$/,
				loader: "file-loader"
			},
			{
				test: /\.css$/,
				loader: "style-loader!css-loader"
			},
			{
				test: /\.(gif|ttf|eot|svg|woff2?)$/,
				loader: "url-loader?name=[name].[ext]",
			}
		],
		noParse: [
			/node_modules\/proj4\/dist\/proj4\.js/
		]
	},
	resolve: {
		extensions: [".tsx", ".ts",  ".jsx", ".js", ".json"]
	},
	watchOptions: {
		  ignored: /\.swp$/,
	}
};
