exports.config = {
	seleniumAddress: "http://localhost:4444/wd/hub",
	specs: ["test/*-spec.js"],
	capabilities: {
		browserName: "chrome",
		chromeOptions: {
			args: ["--disable-gpu", "--window-size=800x600"]
		},
		shardTestFiles: true,
		maxInstances: 4

	},
	SELENIUM_PROMISE_MANAGER: false,
	onPrepare: function() {
		browser.waitForAngularEnabled(false);
		require("babel-register");
		require("babel-polyfill");

		var env = jasmine.getEnv();
		env.clearReporters();
		var SpecReporter = require("jasmine-spec-reporter").SpecReporter;
		env.addReporter(new SpecReporter({
			displayStacktrace: true
		}));
	},
	afterEach: function() {
		browser.manage().logs().get("browser").then((browserLog) => {
			expect(browserLog.length).toEqual(0);
		});
	}
};
