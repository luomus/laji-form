const { createForm } = require("./test-utils.js");

describe("Collection contest form (MHL.25)", () => {
	let form;

	it("navigate to form", async () => {
		form = await createForm({id: "MHL.25"});
	});

	it("adds observation", async () => {
		await form.$locateButton("gatherings", "add").click();
	});
});
