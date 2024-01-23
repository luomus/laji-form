import { test, expect, Page } from "@playwright/test";
import { DemoPageForm, createForm, getFocusedElement } from "./test-utils";

test.describe.configure({mode: "serial"});

test.describe("water bird pair count form (MHL.65)", () => {
	let page: Page;
	let form: DemoPageForm;

	test.beforeAll(async ({browser}) => {
		page = await browser.newPage();
		form = await createForm(page, {id: "MHL.65", localFormData: true});
	});

	test("sets correct unitType to pair observations when using add button", async () => {
		await form.$locateButton("gatherings.0.units", "add").first().click();
		const formData = await form.getChangedData();

		expect(formData.gatherings[0].units[0].unitType[0]).toBe("pairObservation");
	});

	test("sets correct unitType to pair observations when using insert shorthand", async () => {
		await getFocusedElement(page).press("Alt+i");
		const formData = await form.getChangedData();
		
		expect(formData.gatherings[0].units[1].unitType[0]).toBe("pairObservation");
	});
});
