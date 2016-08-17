var path = require("path");
var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
	//entry: path.join(__dirname, "src", "components", "LajiForm"),
	entry: {
		"laji-form": "./src/components/LajiForm",
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
	externals: {
		"react": "umd react",
		'react/lib/ReactCSSTransitionGroup': "umd react-addons-css-transition-group"
	},
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
				loader: "file-loader?name=images/[name].[ext]"
			},
			// Extract css files
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract("css-loader")
				//include: [
					//path.join(__dirname, "src"),
					//path.join(__dirname, "node_modules")
					//path.join(__dirname, "node_modules", "rc-switch", "assets", "index.css")
				//]
			},
			// Optionally extract less files
			// or any other compile-to-css language
			{
				test: /\.less$/,
				loader: ExtractTextPlugin.extract("css-loader!less-loader")
			},
			{ test: /\.gif$/, loader: "url-loader?mimetype=image/png" },
			{ test: /\.woff(2)?(\?v=[0-9].[0-9].[0-9])?$/, loader: "url-loader?mimetype=application/font-woff" },
			{ test: /\.(ttf|eot|svg)(\?v=[0-9].[0-9].[0-9])?$/, loader: "file-loader?name=images/[name].[ext]" },
		]
	}
};
