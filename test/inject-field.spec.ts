import { test, expect, Page } from "@playwright/test";
import { DemoPageForm, createForm, lajiFormLocator, maybeJSONPointerToLocator } from "./test-utils";
import merge from "deepmerge";
import { JSONSchema7 } from "json-schema";

test.describe("InjectField", () => {

	const schema: JSONSchema7 = {
		type: "object",
		properties: {
			a: {
				type: "object",
				properties: {
					aa: {
						type: "object",
						properties: {
							aaa: { type: "string" }
						}
					},
					ab: { type: "string" }
				}
			},
			b: {
				type: "object",
				properties: {
					ba: { type: "string" }
				}
			}
		}
	};

	const uiSchemaBase = {
		a: {
			"classNames": "foobar",
			aa: {
				aaa: {
					"classNames": "foo"
				}
			}
		},
		b: {
			ba: {
				"classNames": "bar"
			}
		}
	};

	const testInjections = (injections: any) => {
		let uiSchema = uiSchemaBase;
		for (let injection of injections) {
			const [target, field] = injection;
			uiSchema = merge(uiSchema, {
				"ui:field": "InjectField",
				"ui:options": {
					injections: [
						{
							fields: [field],
							target
						}
					]
				}
			});
		}

		let page: Page;
		let form: DemoPageForm;

		test.beforeAll(async ({browser}) => {
			page = await browser.newPage();
			form = await createForm(page, {schema, uiSchema});
		});

		test("displays all fields and their ids are kept intact", async () => {
			for (let locator of ["a", "a.aa", "a.ab", "a.ab", "b", "b.ba"]) {
				await expect(form.$locate(locator)).toBeVisible();
			}
		});

		test("displays injected field as child of target", async () => {
			for (let injection of injections) {
				const [target, field] = injection;

				await expect(
					page.locator(lajiFormLocator(maybeJSONPointerToLocator(target)))
						.locator(lajiFormLocator(maybeJSONPointerToLocator(field)))
				).toBeVisible();
			}
		});

		test("uiSchema is kept for injected fields and target", async () => {
			await expect(form.$locate("a")).toHaveClass(new RegExp(uiSchemaBase.a.classNames));
			await expect(form.$locate("a.aa.aaa")).toHaveClass(new RegExp(uiSchemaBase.a.aa.aaa.classNames));
			await expect(form.$locate("b.ba")).toHaveClass(new RegExp(uiSchemaBase.b.ba.classNames));
		});

		test("modifying formData works and doesn't spill properties", async () => {
			await form.$getInputWidget("a.aa.aaa").fill("foo");
			await form.$getInputWidget("a.ab").fill("foofoo");
			await form.$getInputWidget("b.ba").fill("bar");
			await form.$getInputWidget("b.ba").press("Tab");

			await expect(form.$getInputWidget("a.aa.aaa")).toHaveValue("foo");
			await expect(form.$getInputWidget("a.ab")).toHaveValue("foofoo");
			await expect(form.$getInputWidget("b.ba")).toHaveValue("bar");

			expect(await form.getChangedData()).toEqual({
				a: {
					aa: {
						aaa: "foo"
					},
					ab: "foofoo"
				},
				b: {
					ba: "bar"
				}
			});
		});

		test("errors are rendered", async () => {
			await form.setState({formData: 
				{
					a: {
						aa: {
							aaa: 1
						},
						ab: 1
					},
					b: {
						ba: 1
					}
				}
			});

			await form.submit();

			await expect(form.$getFieldErrors("a.aa.aaa")).toHaveCount(1);
			await expect(form.$getFieldErrors("a.ab")).toHaveCount(1);
			await expect(form.$getFieldErrors("b.ba")).toHaveCount(1);
		});
	};

	test.describe("simple field, simple target", () => {
		testInjections([["b", "a"]]);
	});

	test.describe("simple field, simple JSON pointer target", () => {
		testInjections([["/b", "a"]]);
	});

	test.describe("simple target, JSON pointer field", () => {
		testInjections([["b", "/a/aa/aaa"]]);
	});

	test.describe("JSON pointer target, JSON Pointer field", () => {
		testInjections([["/a/aa", "/b/ba"]]);
	});

	test.describe("second injection depending on first injection", () => {
		testInjections([
			["/a/aa", "/a/ab"],
			["/b", "/a/aa"]
		]);
	});
});
