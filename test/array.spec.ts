import { test, expect, Page } from "@playwright/test";
import { createForm, DemoPageForm, getFocusedElement } from "./test-utils";
import { JSONSchema7 } from "json-schema";

test.describe("Array", () => {

	let form: DemoPageForm;

	test.describe("copy button", () => {

		const uiSchemaForCopy = (type: string, filter: string[]): any => ({
			"ui:options": {
				"buttons": [{
					fn: "copy", type, filter
				}]
			}
		});

		test.beforeAll(async ({browser}) => {
			form = await createForm(await browser.newPage());
		});

		test.describe("nested object", () => {
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

			test("works with whitelist", async () => {
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

			test("works with blacklist", async () => {
				await form.setState({schema, formData: allButDefaultFilled, uiSchema: uiSchemaForCopy("blacklist", ["a", "/1/a", "/1/2/a"])});
				await form.$locateButton("", "copy").click();

				expect((await form.getChangedData())[1]).toEqual({
					a: undefined,
					b: "foo",
					1: {
						a: undefined,
						b: "foo",
						2: {
							a: undefined,
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

		test.describe("copying form nonexisting array item", () => {
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

			test("works with whitelist", async () => {
				await form.setState({schema, formData, uiSchema: uiSchemaForCopy("whitelist", ["/arr/0/a", "/arr/1/b"])});
				await form.$locateButton("", "copy").click();

				expect((await form.getChangedData())[1]).toEqual({
					arr: [
						{
							a: "foo",
							default: "default"
						},
						{
							b: undefined,
							default: "default"
						}
					]
				});
			});

			test("works with blacklist", async () => {
				await form.setState({schema, formData, uiSchema: uiSchemaForCopy("blacklist", ["/arr/0/a", "/arr/1/b"])});
				await form.$locateButton("", "copy").click();

				expect((await form.getChangedData())[1]).toEqual({
					arr: [
						{
							a: undefined,
							b: "foo",
							default: "default"
						},
						{
							b: undefined,
							default: "default"
						}
					]
				});
			});
		});
	});

	test.describe("keyboard shortcut", () => {
		let form: DemoPageForm;

		let page: Page;

		test.beforeAll(async ({browser}) => {
			const shortcuts = {"alt+i": {fn: "insert"}};
			const props = {schema: {type: "array", items: {type:"string"}} as JSONSchema7, uiSchema: {"ui:shortcuts": shortcuts}};
			page = await browser.newPage();
			form = await createForm(page, props);
		});

		test.afterEach(async () => {
			await form.setState({formData: []});
		});

		test.describe("insert", async () => {
			test("works", async () => {
				await form.$locateButton("", "add").click();

				await expect(form.$locate("0")).toBeVisible();

				await getFocusedElement(page).press("Alt+i");

				await expect(form.$locate("1")).toBeVisible();
			});

			test("keeps entered value", async () => {
				await form.$locateButton("", "add").click();
				await getFocusedElement(page).fill("test");
				await getFocusedElement(page).press("Alt+i");

				await expect(form.$locate("1")).toBeVisible();
				await expect(form.$getInputWidget("0")).toHaveValue("test");
			});
		});
	});
});
