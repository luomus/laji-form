import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";

test.describe("Submit", () => {

	let form: DemoPageForm;

	test.describe("empty values are removed from submitted formData", () => {

		const schema = {
			type: "object",
			properties: {
				string: { type: "string" },
				nonEmptyString: { type: "string" },
				emptyObject: {
					type: "object",
					properties: {
						a: { type: "string" }
					}
				},
				nonEmptyObject: {
					type: "object",
					properties: {
						a: { type: "string" }
					}
				},
				emptyArray: {
					type: "array",
					items: { type: "string" }
				},
				nonEmptyArray: {
					type: "array",
					items: { type: "string" }
				},
				nested: {
					type: "object",
					properties: {
						emptyString: { type: "string" },
						emptyObject: {
							type: "object",
							properties: {
								a: { type: "string" }
							}
						},
						emptyArray: {
							type: "array",
							items: { type: "string" }
						},
						kept: { type: "string" }
					}
				}
			}
		};

		const formData = {
			string: "",
			nonEmptyString: "hello",
			emptyObject: {},
			nonEmptyObject: { a: "value" },
			emptyArray: [],
			nonEmptyArray: ["item"],
			nested: {
				emptyString: "",
				emptyObject: {},
				emptyArray: [],
				kept: "yes"
			}
		};

		test.beforeAll(async ({ browser }) => {
			form = await createForm(await browser.newPage());
		});

		test.beforeEach(async () => {
			await form.setState({ schema, formData });
		});

		test("empty strings, objects and arrays are removed", async () => {
			await form.submit();
			const submitted = await form.getSubmittedData();

			expect(submitted).not.toHaveProperty("string");
			expect(submitted).not.toHaveProperty("emptyObject");
			expect(submitted).not.toHaveProperty("emptyArray");

			expect(submitted.nonEmptyString).toBe("hello");
			expect(submitted.nonEmptyObject).toEqual({ a: "value" });
			expect(submitted.nonEmptyArray).toEqual(["item"]);
		});

		test("nested empty values are removed", async () => {
			await form.submit();
			const submitted = await form.getSubmittedData();

			expect(submitted.nested).not.toHaveProperty("emptyString");
			expect(submitted.nested).not.toHaveProperty("emptyObject");
			expect(submitted.nested).not.toHaveProperty("emptyArray");
			expect(submitted.nested.kept).toBe("yes");
		});

		test("object with only empty values is itself removed", async () => {
			const allEmptyFormData = {
				string: "",
				emptyObject: { a: "" },
				nonEmptyString: "hi"
			};
			await form.setState({ schema, formData: allEmptyFormData });
			await form.submit();
			const submitted = await form.getSubmittedData();

			expect(submitted).not.toHaveProperty("string");
			expect(submitted).not.toHaveProperty("emptyObject");
			expect(submitted.nonEmptyString).toBe("hi");
		});

		test("required empty object property is not removed", async () => {
			const requiredSchema = {
				type: "object",
				required: ["requiredObject"],
				properties: {
					requiredObject: {
						type: "object",
						properties: {
							a: { type: "string" }
						}
					},
					nonRequiredObject: {
						type: "object",
						properties: {
							a: { type: "string" }
						}
					}
				}
			};
			await form.setState({ schema: requiredSchema, formData: { requiredObject: {}, nonRequiredObject: {} } });
			await form.submit();
			const submitted = await form.getSubmittedData();

			expect(submitted).toHaveProperty("requiredObject");
			expect(submitted).not.toHaveProperty("nonRequiredObject");
		});

		test("object array with minItems: 1 keeps empty object", async () => {
			const minItemsSchema = {
				type: "object",
				properties: {
					items: {
						type: "array",
						minItems: 1,
						items: {
							type: "object",
							properties: {
								a: { type: "string" }
							}
						}
					}
				}
			};
			await form.setState({ schema: minItemsSchema, formData: { items: [{ a: "" }] } });
			await form.submit();
			const submitted = await form.getSubmittedData();

			expect(submitted.items).toHaveLength(1);
		});
	});
});
