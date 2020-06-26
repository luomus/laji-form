import { createForm } from "./test-utils.js";

describe("SelectWidget", () => {

	let form;

	const enums = {
		"": "",
		a: "aLabel",
		b: "bLabel",
		c: "cLabel",
	}

	const schema = {
		type: "string",
		enum: Object.keys(enums),
		enumNames: Object.keys(enums).map(e => enums[e])
	}

	const initialFormData = "b";

	beforeAll(async () => {
		form = await createForm({schema, formData: initialFormData});
	});

	it("renders initial value", async () => {
		expect(await form.$getEnumWidget("").$("input").getAttribute("value")).toBe(enums[initialFormData]);
	});

	it("empty value is selectable", async () => {
		await form.$getEnumWidget("").click();
		await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$getEnumWidget("").$$(".rw-list-option").first()), 1000, "select list timeout");
		await form.$getEnumWidget("").$$(".rw-list-option").first().click();
		expect (await form.getChangedData()).toBe(null);
	});

	it("nonempty value is selectable after empty was selected", async () => {
		await form.$getEnumWidget("").click();
		await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$getEnumWidget("").$$(".rw-list-option").first()), 1000, "select list timeout");
		await form.$getEnumWidget("").$$(".rw-list-option").last().click();
		expect(await form.$getEnumWidget("").$("input").getAttribute("value")).toBe(enums.c);
		expect (await form.getChangedData()).toBe("c");
	});

	// Doesn't work properly, since value is changed on blur instead of enter
	//it("value can be selected with keyboard", async () => {
	//	await form.$getEnumWidget("").click();
	//	await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$getEnumWidget("").$(".rw-popup-container")), 1000, "select list timeout");
	//	await browser.actions().sendKeys(protractor.Key.DOWN).perform();
	//	await browser.actions().sendKeys(protractor.Key.ENTER).perform();
	//	expect (await form.$getEnumWidget("").$("input").getAttribute("value")).toBe(enums.a);
	//	expect (await form.getChangedData()).toBe("a");
	//});
});
