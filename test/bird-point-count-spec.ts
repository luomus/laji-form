import { Form, createForm, putForeignMarkerToMap } from "./test-utils";
import { browser, protractor } from "protractor";

describe("Bird point count (MHL.75)", () => {
	let form: Form;

	it("navigate to form", async () => {
		form = await createForm({id: "MHL.75"});
	});

	it("adds gathering", async () => {
		await putForeignMarkerToMap();

		expect(await form.$locate("gatherings.0").isDisplayed()).toBe(true);
	});

	it("adds unit", async () => {
		await form.$locateButton("gatherings.0.units", "add").click();

		expect(await form.$locate("gatherings.0.units.0").isDisplayed()).toBe(true);
	});

	it("unit pair count doesn't lose value when typed and new unit entered by shortcut key", async () => {
		const text = "123";
		await form.$getInputWidget("gatherings.0.units.0.unitFact.pairCountInner").sendKeys(text);
		await browser.driver.switchTo().activeElement().sendKeys(protractor.Key.chord(protractor.Key.ALT, "u"));

		expect(await form.$getInputWidget("gatherings.0.units.0.unitFact.pairCountInner").getAttribute("value")).toBe(text);
	});
});
