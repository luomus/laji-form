import { navigateToForm, lajiFormLocate } from "./test-utils.js";

describe("Line transect (MHL.1)", () => {

	it("navigate to form", async () => {
		await navigateToForm("MHL.1");
	});

	const $shorthand = $("#root_gatherings_0_units_0_shortHandText");
	const $unit = lajiFormLocate("gatherings.0.units.0.identifications.0.taxon");

	it("shorthand unit is shown", async () => {
		await expect($shorthand.isDisplayed()).toBe(true);
	});
	

	it("shorthand unit expands code after typing code", async () => {
		function waitUntilShorthandShowsSchema() {
			return browser.wait(protractor.ExpectedConditions.presenceOf($unit), 5000, "Code reading timeout");
		}

		await $shorthand.sendKeys("llx");
		await $shorthand.sendKeys(protractor.Key.ENTER);

		await waitUntilShorthandShowsSchema();

		await expect($unit.isDisplayed()).toBe(true);
	});
});
