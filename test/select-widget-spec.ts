import { Form, createForm } from "./test-utils";
import { browser, protractor } from "protractor";
import { JSONSchema7 } from "json-schema";

describe("SelectWidget", () => {

	let form: Form;

	const enums: {[key: string]: string} = {
		"": "",
		a: "aLabel",
		b: "bLabel",
		c: "cLabel",
	};

	const schema = {
		type: "string",
		enum: Object.keys(enums),
		enumNames: Object.keys(enums).map(e => enums[e])
	} as JSONSchema7;

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

	it("selecting value and then empty value without blurring in between keeps empty value", async () => {
		await form.$getEnumWidget("").click();
		await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$getEnumWidget("").$$(".rw-list-option").first()), 1000, "select list timeout");
		await form.$getEnumWidget("").$$(".rw-list-option").last().click();

		await form.$getEnumWidget("").click();
		await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$getEnumWidget("").$$(".rw-list-option").first()), 1000, "select list timeout");
		await form.$getEnumWidget("").$$(".rw-list-option").first().click();

		expect (await form.getChangedData()).toBe(null);
	});

	it("value can be selected with keyboard", async () => {
		await form.$getEnumWidget("").click();
		await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$getEnumWidget("").$(".rw-popup-container")), 1000, "select list timeout");
		const $input = form.$getEnumWidget("").$("input");
		await $input.sendKeys(protractor.Key.DOWN);
		await $input.sendKeys(protractor.Key.ENTER);
		expect (await $input.getAttribute("value")).toBe(enums.a);
		expect (await form.getChangedData()).toBe("a");
	});
});
