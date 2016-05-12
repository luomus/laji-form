var path = require("path");
var webpack = require("webpack");

module.exports = {
	context: __dirname + "/src",
	entry: "./components/LajiForm.js",
	output: {
		path: "./dist",
		publicPath: "/dist/",
		filename: "laji-form.js",
		library: "LajiForm",
		libraryTarget: "umd"
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
				],
				loader: "babel"
			},
			{ test: /\.css$/,  loader: "style-loader!css-loader" },
			{ test: /\.less$/, loader: "style-loader!css-loader!less-loader" },
			{ test: /\.gif$/, loader: "url-loader?mimetype=image/png" },
			{ test: /\.woff(2)?(\?v=[0-9].[0-9].[0-9])?$/, loader: "url-loader?mimetype=application/font-woff" },
			{ test: /\.(ttf|eot|svg)(\?v=[0-9].[0-9].[0-9])?$/, loader: "file-loader?name=[name].[ext]" },
		]
	}
};
