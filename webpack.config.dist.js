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
			}
		]
	}
};
