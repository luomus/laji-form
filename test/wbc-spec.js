import { navigateToForm } from "./test-utils.js";

describe("WBC (MHL.3)", () => {

	it("navigate to form", async () => {
		await navigateToForm("MHL.3", "&localFormData=true");
	});
});
