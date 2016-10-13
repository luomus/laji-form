var path = require("path");
var webpack = require("webpack");
var CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
	entry: [
		path.join(__dirname, "playground", "app"),
	],
	output: {
		publicPath: "/build/",
		filename: "main.js"
	},
	devServer: {
		outputpath: path.join(__dirname, 'build')
	},
	plugins: [
		new webpack.IgnorePlugin(/^(buffertools)$/), // unwanted "deeper" dependency
		new webpack.DefinePlugin({'process.env.NODE_ENV': '"development"'}),
		new CopyWebpackPlugin([{from: path.join(__dirname, "src", "img"), to: "."}])
	],
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				loader: "babel",
				include: [
					path.join(__dirname, "src"),
					path.join(__dirname, "playground")
				]
			},
			{
				test: /\.json$/,
				loader: "json",
				include: [
					path.join(__dirname)
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
				test: /\.less$/,
				loader: "style-loader!css-loader!less-loader"
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
				loader: "file-loader?name=[name].[ext]",
				exclude: [
					path.join(__dirname, "src", "img")
				]
			},
		]
	}
};
