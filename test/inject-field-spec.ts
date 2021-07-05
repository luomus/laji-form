import { Form, createForm, lajiFormLocator, updateValue, maybeJSONPointerToLocator  } from "./test-utils";
import { $ } from "protractor";
import merge from "deepmerge";
import { JSONSchema7 } from "json-schema";

describe("InjectField", () => {

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

	const test = (injections: any) => {
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

		let form: Form;

		beforeAll(async () => {
			form = await createForm({schema, uiSchema});
		});

		it("displays all fields and their ids are kept intact", async () => {
			for (let locator of ["a", "a.aa", "a.ab", "a.ab", "b", "b.ba"]) {
				expect(await form.$locate(locator).isDisplayed()).toBe(true);
			}
		});

		it("displays injected field as child of target", async () => {
			for (let injection of injections) {
				const [target, field] = injection;

				expect(
					await $(lajiFormLocator(maybeJSONPointerToLocator(target)))
						.$(lajiFormLocator(maybeJSONPointerToLocator(field)))
						.isDisplayed()
				).toBe(true);
			}
		});

		it("uiSchema is kept for injected fields and target", async () => {
			expect(await form.$locate("a").getAttribute("className")).toMatch(uiSchemaBase.a.classNames);
			expect(await form.$locate("a.aa.aaa").getAttribute("className")).toMatch(uiSchemaBase.a.aa.aaa.classNames);
			expect(await form.$locate("b.ba").getAttribute("className")).toMatch(uiSchemaBase.b.ba.classNames);
		});

		it("modifying formData works and doesn't spill properties", async () => {
			await updateValue(form.$getInputWidget("a.aa.aaa"), "foo");
			await updateValue(form.$getInputWidget("a.ab"), "foofoo");
			await updateValue(form.$getInputWidget("b.ba"), "bar");

			expect(await form.$getInputWidget("a.aa.aaa").getAttribute("value")).toBe("foo");
			expect(await form.$getInputWidget("a.ab").getAttribute("value")).toBe("foofoo");
			expect(await form.$getInputWidget("b.ba").getAttribute("value")).toBe("bar");

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

		it("errors are rendered", async () => {
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

			expect(await form.$$getFieldErrors("a.aa.aaa").count()).toBe(1);
			expect(await form.$$getFieldErrors("a.ab").count()).toBe(1);
			expect(await form.$$getFieldErrors("b.ba").count()).toBe(1);
		});
	};

	describe("simple field, simple target", () => {
		test([["b", "a"]]);
	});

	describe("simple field, simple JSON pointer target", () => {
		test([["/b", "a"]]);
	});

	describe("simple target, JSON pointer field", () => {
		test([["b", "/a/aa/aaa"]]);
	});

	describe("JSON pointer target, JSON Pointer field", () => {
		test([["/a/aa", "/b/ba"]]);
	});

	describe("second injection depending on first injection", () => {
		test([
			["/a/aa", "/a/ab"],
			["/b", "/a/aa"]
		]);
	});
});
