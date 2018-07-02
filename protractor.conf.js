exports.config = {
	seleniumAddress: 'http://localhost:4444/wd/hub',
	specs: ["test/*-spec.js"],
	capabilities: {
		browserName: "chrome",
		chromeOptions: {
			args: ["--disable-gpu", "--window-size=800x600"]
		}
	},
	onPrepare: function() {
		browser.ignoreSynchronization = true;
		require("babel-register");
		require("babel-polyfill");
	}
};
