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
			},
			{
				test: /\.png$/,
				loader: "url-loader?limit=100000"
			},
			{
				test: /\.jpg$/,
				loader: "file-loader"
			},
			{ test: /\.css$/,  loader: "style-loader!css-loader" },
			{ test: /\.less$/, loader: "style-loader!css-loader!less-loader" },
			{ test: /\.gif$/, loader: "url-loader?mimetype=image/png" },
			{ test: /\.woff(2)?(\?v=[0-9].[0-9].[0-9])?$/, loader: "url-loader?mimetype=application/font-woff" },
			{ test: /\.(ttf|eot|svg)(\?v=[0-9].[0-9].[0-9])?$/, loader: "file-loader?name=[name].[ext]" },
		]
	}
};
