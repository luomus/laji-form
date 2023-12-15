import { test, expect, Locator } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";

test.describe.configure({ mode: "serial" });

test.describe("Bird point count (MHL.75)", () => {
	let form: DemoPageForm;
	let $addUnit: Locator;

	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage(), {id: "MHL.75"});
		await form.putMarkerToMap();
		$addUnit = form.$locateButton("gatherings.0.units", "add");
		await $addUnit.click();
	});

	test("unit pair count doesn't lose value when typed and new unit entered by shortcut key", async () => {
		const text = "123";
		const $input = form.$getInputWidget("gatherings.0.units.0.unitFact.pairCountInner");
		await $input.fill(text);
		await $input.press("Alt+u");

		expect(await form.$getInputWidget("gatherings.0.units.0.unitFact.pairCountInner").getAttribute("value")).toBe(text);

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
		await form.updateValue(taxonAutosuggest1.$input, "peippo");

		await peippoMock.resolve([{
			key: "MX.36237",
			value: "peippo",
		}]);

		await $addUnit.click();
		await form.updateValue(taxonAutosuggest2.$input, "mustarastas");

		await mustarastasMock.resolve([{
			key: "MX.33106",
			value: "mustarastas",
		}]);

		await mockQueue.remove();

		await form.$locateButton("gatherings.0.units.0", "delete").click();

		await expect(taxonAutosuggest1.$input).toHaveValue("mustarastas");
	});
});
