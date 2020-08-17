const { navigateToForm } = require("./test-utils.js");

describe("NAFI (MHL.6)", () => {

	it("navigate to form", async () => {
		await navigateToForm("MHL.6");
	});
});
