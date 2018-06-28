exports.config = {
	seleniumAddress: 'http://localhost:4444/wd/hub',
	specs: ["test/*-spec.js"],
	capabilities: {
		browserName: "chrome",
		chromeOptions: {
			args: ["--headless", "--disable-gpu", "--window-size=1920x1080"]
		}
	},
	onPrepare: function() {
		    browser.ignoreSynchronization = true;
	}
};
