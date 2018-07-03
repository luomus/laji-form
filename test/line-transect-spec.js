import { navigateToForm, lajiFormLocate } from "./test-utils.js";

describe("Line transect (MHL.1)", () => {

	navigateToForm("MHL.1");

	const $shorthand = $("#root_gatherings_0_units_0_shortHandText");
	const $unit = lajiFormLocate("gatherings.0.units.0.identifications.0.taxon");

	it("shorthand unit is shown", () => {
		expect($shorthand.isDisplayed()).toBe(true);
	});
	

	it("shorthand unit expands code after typing code", async done => {
		function waitUntilShorthandShowsSchema() {
			return browser.wait(protractor.ExpectedConditions.presenceOf($unit), 5000, "Code reading timeout");
		}

		$shorthand.sendKeys("llx");
		$shorthand.sendKeys(protractor.Key.ENTER);

		await waitUntilShorthandShowsSchema();

		expect($unit.isDisplayed()).toBe(true);
		done();
	});
});
