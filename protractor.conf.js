exports.config = {
	seleniumAddress: 'http://localhost:4444/wd/hub',
	specs: ["test/*-spec.js"],
	capabilities: {
		browserName: "chrome",
		chromeOptions: {
			args: ["--disable-gpu", "--window-size=800x600"]
		},
		shardTestFiles: true,
		maxInstances: 4

	},
	onPrepare: function() {
		browser.waitForAngularEnabled(false);
		require("babel-register");
		require("babel-polyfill");
	}
};
