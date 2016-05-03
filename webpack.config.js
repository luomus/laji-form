var path = require("path");
var webpack = require("webpack");

module.exports = {
	entry: [
		path.join(__dirname, "playground", "app"),
	],
	output: {
		publicPath: "/build/",
		filename: "main.js"
	},
	plugins: [
		new webpack.IgnorePlugin(/^(buffertools)$/) // unwanted "deeper" dependency
	],
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				include: [
					path.join(__dirname, "src"),
					path.join(__dirname, "playground")
				],
				loader: "babel"
			},
			{
				test: /\.json$/,
				loader: "json",
				include: [
					path.join(__dirname)
				]
			}
		]
	}
};
