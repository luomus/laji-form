import { Form, createForm, putForeignMarkerToMap, isDisplayed, updateValue } from "./test-utils";
import { browser, ElementFinder, protractor } from "protractor";

describe("Bird point count (MHL.75)", () => {
	let form: Form;
	let $addUnit: ElementFinder;

	beforeAll(async () => {
		form = await createForm({id: "MHL.75"});
		$addUnit = form.$locateButton("gatherings.0.units", "add");
	});

	it("adds gathering", async () => {
		await putForeignMarkerToMap();

		expect(await isDisplayed(form.$locate("gatherings.0"))).toBe(true);
	});

	it("adds unit", async () => {
		await $addUnit.click();

		expect(await isDisplayed(form.$locate("gatherings.0.units.0"))).toBe(true);
	});

	it("unit pair count doesn't lose value when typed and new unit entered by shortcut key", async () => {
		const text = "123";
		await form.$getInputWidget("gatherings.0.units.0.unitFact.pairCountInner").sendKeys(text);
		await browser.driver.switchTo().activeElement().sendKeys(protractor.Key.chord(protractor.Key.ALT, "u"));

		expect(await form.$getInputWidget("gatherings.0.units.0.unitFact.pairCountInner").getAttribute("value")).toBe(text);

		// Cleanup
		await form.$locateButton("gatherings.0.units.0", "delete").click();
		await form.$locateButton("gatherings.0.units.0", "delete").click();
	});

	it("when two units and 1st is removed, the autosuggest input value updated to the value of the 1st", async () => {
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
		await taxonAutosuggest1.waitForPopoverToHide();

		await $addUnit.click();
		await updateValue(taxonAutosuggest2.$input, "mustarastas");

		await mustarastasMock.resolve([{
			key: "MX.33106",
			value: "mustarastas",
		}]);
		await taxonAutosuggest2.waitForPopoverToHide();

		await mockQueue.remove();

		await form.$locateButton("gatherings.0.units.0", "delete").click();

		expect(await taxonAutosuggest1.$input.getAttribute("value")).toBe("mustarastas");
	});
});
