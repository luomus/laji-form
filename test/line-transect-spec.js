import { navigateToForm, lajiFormLocate } from "./test-utils.js";

describe("Line transect (MHL.1)", () => {

	it("navigate to form", async () => {
		await navigateToForm("MHL.1", "&localFormData=true");
	});

	const $shorthand = $("#root_gatherings_0_units_0_shortHandText");
	const $unit = lajiFormLocate("gatherings.0.units.0.identifications.0.taxon");

	it("shorthand unit is shown", async () => {
		expect(await $shorthand.isDisplayed()).toBe(true);
	});
	

	it("shorthand unit expands code after typing code", async () => {
		function waitUntilShorthandShowsSchema() {
			return browser.wait(protractor.ExpectedConditions.presenceOf($unit), 5000, "Code reading timeout");
		}

		await $shorthand.sendKeys("llx");
		await $shorthand.sendKeys(protractor.Key.ENTER);

		await waitUntilShorthandShowsSchema();

		expect(await $unit.isDisplayed()).toBe(true);
	});
});
