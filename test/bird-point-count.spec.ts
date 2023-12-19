import { test, expect, Page, Locator } from "@playwright/test";
import { DemoPageForm, createForm, getFocusedElement, updateValue } from "./test-utils";

test.describe("Bird point count (MHL.75)", () => {
	let form: DemoPageForm;
	let page: Page;
	let $addUnit: Locator;

	test.beforeAll(async ({browser}) => {
		page = await browser.newPage();
		form = await createForm(page, {id: "MHL.75"});
		$addUnit = form.$locateButton("gatherings.0.units", "add");
	});

	test.beforeAll(async () => {
		await form.putMarkerToMap();
		await $addUnit.click();
	});

	test("unit pair count doesn't lose value when typed and new unit entered by shortcut key", async () => {
		const text = "123";
		await form.$getInputWidget("gatherings.0.units.0.unitFact.pairCountInner").fill(text);
		await getFocusedElement(page).press("Alt+u");

		await expect(form.$getInputWidget("gatherings.0.units.0.unitFact.pairCountInner")).toHaveValue(text);

		// Cleanup
		await form.$locateButton("gatherings.0.units.0", "delete").click();
		await form.$locateButton("gatherings.0.units.0", "delete").click();
	});

	test("when two units and 1st is removed, the autosuggest input value updated to the value of the 1st", async () => {
		const taxonAutosuggest1 = form.getTaxonAutosuggestWidget("gatherings.0.units.0.identifications.0.taxonVerbatim");
		const taxonAutosuggest2 = form.getTaxonAutosuggestWidget("gatherings.0.units.1.identifications.0.taxonVerbatim");
		const mockQueue = await form.createMockResponseQueue("/autocomplete/taxon");
		const peippoMock = await mockQueue.create();
		const mustarastasMock = await mockQueue.create();

		await $addUnit.click();
		await updateValue(taxonAutosuggest1.$input, "peippo");

		await peippoMock.resolve([{
			key: "MX.36237",
			value: "peippo",
		}]);

		await $addUnit.click();
		await updateValue(taxonAutosuggest2.$input, "mustarastas");

		await mustarastasMock.resolve([{
			key: "MX.33106",
			value: "mustarastas",
		}]);

		await mockQueue.remove();

		await form.$locateButton("gatherings.0.units.0", "delete").click();

		expect(await taxonAutosuggest1.$input.getAttribute("value")).toBe("mustarastas");
	});
});
