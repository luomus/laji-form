import { Form, createForm } from "./test-utils";
import { protractor, browser } from "protractor";

describe("water bird pair count form (MHL.65)", () => {
	let form: Form;

	beforeAll(async () => {
		form = await createForm({id: "MHL.65", localFormData: true});
	});

	it("sets correct unitType to pair observations when using add button", async () => {
		await form.$locateButton("gatherings_0_units", "add").click();
		const formData = await form.getChangedData();

		expect(formData.gatherings[0].units[0].unitType[0]).toBe("pairObservation");
	});

	it("sets correct unitType to pair observations when using insert shorthand", async () => {
		await form.$locateButton("gatherings_0_units", "add").click();
		await browser.driver.switchTo().activeElement().sendKeys(protractor.Key.chord(protractor.Key.ALT, "i"));
		const formData = await form.getChangedData();
		
		expect(formData.gatherings[0].units[1].unitType[0]).toBe("pairObservation");
	});
});
