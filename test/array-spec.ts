import { createForm, Form } from "./test-utils";
import { browser, protractor } from "protractor";
import { JSONSchema7 } from "json-schema";

describe("Array", () => {

	let form: Form;

	describe("copy button", () => {

		const uiSchemaForCopy = (type: string, filter: string[]): any => ({
			"ui:options": {
				"buttons": [{
					fn: "copy", type, filter
				}]
			}
		});

		beforeAll(async () => {
			form = await createForm();
		});

		describe("nested object", () => {
			const schema = {
				type: "array",
				items: {
					type: "object",
					properties: {
						a: { type: "string" },
						b: { type: "string" },
						1:  {
							type: "object",
							properties: {
								a: { type: "string" },
								b: { type: "string" },
								2:  {
									type: "object",
									properties: {
										a: { type: "string" },
										b: { type: "string" },
										default: { type: "string", default: "default" },
										3:  {
											type: "object",
											properties: {
												a: { type: "string" },
												b: { type: "string" },
												default: { type: "string", default: "default" },
											}
										}
									}
								}
							}
						}
					}
				}
			};

			const allButDefaultFilled = [{
				a: "foo",
				b: "foo",
				1: {
					a: "foo",
					b: "foo",
					2: {
						a: "foo",
						b: "foo",
						3: {
							a: "foo",
							b: "foo",
						}
					}
				}
			}];

			it("works with whitelist", async () => {
				await form.setState({schema, formData: allButDefaultFilled, uiSchema: uiSchemaForCopy("whitelist", ["a", "/1/a", "/1/2/a"])});
				await form.$locateButton("", "copy").click();

				expect((await form.getChangedData())[1]).toEqual({
					a: "foo",
					1: {
						a: "foo",
						2: {
							a: "foo",
							default: "default",
							3: {
								default: "default"
							}
						}
					}
				});
			});

			it("works with blacklist", async () => {
				await form.setState({schema, formData: allButDefaultFilled, uiSchema: uiSchemaForCopy("blacklist", ["a", "/1/a", "/1/2/a"])});
				await form.$locateButton("", "copy").click();

				expect((await form.getChangedData())[1]).toEqual({
					a: null,
					b: "foo",
					1: {
						a: null,
						b: "foo",
						2: {
							a: null,
							b: "foo",
							default: "default",
							3: {
								a: "foo",
								b: "foo",
								default: "default"
							}
						}
					}
				});
			});
		});

		describe("copying form nonexisting array item", () => {
			const schema = {
				type: "array",
				items: {
					type: "object",
					properties: {
						arr: {
							type: "array",
							items: {
								type: "object",
								properties: {
									a: { type: "string" },
									b: { type: "string" },
									default: { type: "string", default: "default" }
								}
							}
						}
					}
				}
			};

			const formData = [{
				arr: [{
					a: "foo",
					b: "foo"
				}]
			}];

			it("works with whitelist", async () => {
				await form.setState({schema, formData, uiSchema: uiSchemaForCopy("whitelist", ["/arr/0/a", "/arr/1/b"])});
				await form.$locateButton("", "copy").click();

				expect((await form.getChangedData())[1]).toEqual({
					arr: [
						{
							a: "foo",
							default: "default"
						},
						{
							b: null,
							default: "default"
						}
					]
				});
			});

			it("works with blacklist", async () => {
				await form.setState({schema, formData, uiSchema: uiSchemaForCopy("blacklist", ["/arr/0/a", "/arr/1/b"])});
				await form.$locateButton("", "copy").click();

				expect((await form.getChangedData())[1]).toEqual({
					arr: [
						{
							a: null,
							b: "foo",
							default: "default"
						},
						{
							b: null,
							default: "default"
						}
					]
				});
			});
		});
	});

	describe("keyboard shortcut", () => {
		let form: Form;

		beforeAll(async () => {
			const shortcuts = {"alt+i": {fn: "insert"}};
			const props = {schema: {type: "array", items: {type:"string"}} as JSONSchema7, uiSchema: {"ui:shortcuts": shortcuts}};
			form = await createForm(props);
		});

		afterEach(async () => {
			await form.setState({formData: []});
		});

		describe("insert", () => {
			it("works", async () => {
				await form.$locateButton("", "add").click();

				expect(await form.$locate("0").isDisplayed()).toBe(true);

				await browser.driver.switchTo().activeElement().sendKeys(protractor.Key.chord(protractor.Key.ALT, "i"));

				expect(await form.$locate("1").isDisplayed()).toBe(true);
			});

			it("keeps entered value", async () => {
				await form.$locateButton("", "add").click();
				await browser.driver.switchTo().activeElement().sendKeys("test");
				await browser.driver.switchTo().activeElement().sendKeys(protractor.Key.chord(protractor.Key.ALT, "i"));

				expect(await form.$locate("1").isDisplayed()).toBe(true);
				expect(await form.$getInputWidget("0").getAttribute("value")).toBe("test");
			});
		});
	});
});
