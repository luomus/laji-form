import { navigateToForm, lajiFormLocate, createForm, getFocusedId } from "./test-utils.js";

describe("Line transect (MHL.1)", () => {

	let form;
	let $taxon;

	it("navigate to form", async () => {
		form = await createForm({id: "MHL.1", localFormData: true});
		$taxon = form.$locate("gatherings.0.units.0.identifications.0.taxon");
	});

	const $shortHandForIdx = (idx) =>  $(`#root_gatherings_0_units_${idx}_shortHandText`);
	const $shorthand = $shortHandForIdx(0);

	it("shorthand unit is shown", async () => {
		expect(await $shorthand.isDisplayed()).toBe(true);
	});
	

	it("shorthand unit expands code after typing code", async () => {
		function waitUntilShorthandShowsSchema() {
			return browser.wait(protractor.ExpectedConditions.presenceOf($taxon), 5000, "Code reading timeout");
		}

		await $shorthand.sendKeys("llx");
		await $shorthand.sendKeys(protractor.Key.ENTER);

		await waitUntilShorthandShowsSchema();

		expect(await $taxon.isDisplayed()).toBe(true);
	});

	it("next unit is automatically added", async () => {
		expect(await $shortHandForIdx(1).isDisplayed()).toBe(true);
	});

	it("next unit is focused", async () => {
		expect(await getFocusedId() === await $shortHandForIdx(1).getAttribute("id")).toBe(true);
	});
});
