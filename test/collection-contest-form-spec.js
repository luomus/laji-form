const { createForm } = require("./test-utils.js");

describe("Collection contest form (MHL.25)", () => {
	let form;

	describe("Without data", () => {
		beforeAll(async () => {
			form = await createForm({id: "MHL.25"});
		});

		it("adds observation", async () => {
			await form.$locateButton("gatherings", "add").click();
		});

		it("shows gathering date and hides unit date", async () => {
			expect(await form.$locate("gatherings.0.dateBegin").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.0.unitGathering.dateBegin").isPresent()).toBe(false);
		});


		describe("injected date field", () => {
			let dateWidget;
			it("is date widget", async () => {
				dateWidget = form.getDateWidget("gatherings.0.dateBegin");

				expect(await dateWidget.$input.isDisplayed()).toBe(true);
			});

			it("onChange works", async () => {
				await dateWidget.buttons.$today.click();

				expect((await dateWidget.$input.getAttribute("value")).length).not.toBe(0);
			});
		});
	});
});
