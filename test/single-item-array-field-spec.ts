import { Form, createForm, updateValue } from "./test-utils";
import  { element, by, $ } from "protractor";

describe("SingleItemArrayField", () => {

	const uiSchema = {
		"ui:field": "SingleItemArrayField",
	};

	let form: Form;

	beforeAll(async () => {
		form = await createForm();
	});

	describe("object", () => {

		const schema = {
			type: "array",
			items: {
				type: "object",
				properties: {
					a: { type: "string" }
				}
			}
		};

		const formData = [{a: "foo"}, {a: "bar"}];

		beforeAll(async () => {
			await form.setState({schema, uiSchema, formData});
		});

		it("uses first item by default and keeps idSchema intact", async () => {
			expect(await form.$getInputWidget("0.a").isDisplayed()).toBe(true);
		});

		describe("respects activeIdx and", () => {
			beforeAll(async () => {
				await form.setState({uiSchema: {...uiSchema, "ui:options": {activeIdx: 1}}});
			});

			it("renders only single item", async () => {
				expect(await form.$locate("1.a").isDisplayed()).toBe(true);
				expect(await form.$locate("0.a").isPresent()).toBe(false);
			});

			it("renders form data", async () => {
				expect(await form.$getInputWidget("1.a").getAttribute("value")).toBe(formData[1].a);
			});

			it("onChange", async () => {
				await updateValue(form.$getInputWidget("1.a"), "test");

				expect(await form.$getInputWidget("1.a").getAttribute("value")).toBe("test");
			});

			it("renders item errors", async () => {
				await form.setState({
					formData: [{a: "a"}, {a: 1}]
				});
				await form.submit();

				expect(await form.$$getFieldErrors("1.a").count()).toBe(1);
			});

			it("renders array errors", async () => {
				await form.setState({
					schema: {...schema, minItems: 1},
					formData: []
				});
				await form.submit();

				expect(await form.$$getFieldErrors("").count()).toBe(1);
			});
		});

		it("formats title", async () => {
			await form.setState({uiSchema: {...uiSchema, "ui:title": "test %{idx} test"}});

			expect(await element(by.cssContainingText("span", "test 1 test")).isDisplayed()).toBe(true);
		});

		it("respects titleClassName option", async () => {
			await form.setState({uiSchema: {...uiSchema, "ui:title": "test", "ui:options": { titleClassName: "title-format-test" }}});

			expect(await $(".title-format-test").isDisplayed()).toBe(true);
		});
	});

	describe("string array with unique items", () => {

		const schema = {type: "array", uniqueItems: true, title: "test", items: { type: "string", enum: ["a"], enumNames: ["a"] }};

		beforeAll(async () => {
			await form.setState({schema, uiSchema});
		});

		it("is rendered as select", async () => {
			expect(await form.$getEnumWidget("").$container.isDisplayed()).toBe(true);
		});

		it("renders title as label", async () => {
			expect(await $("label").isDisplayed()).toBe(true);
			expect(await $("legend").isPresent()).toBe(false);
		});
	});
});
