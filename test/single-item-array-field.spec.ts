import { test, expect, Page } from "@playwright/test";
import { DemoPageForm, createForm, updateValue } from "./test-utils";

test.describe.configure({mode: "serial"});

test.describe("SingleItemArrayField", () => {

	const uiSchema = {
		"ui:field": "SingleItemArrayField",
	};

	let page: Page;
	let form: DemoPageForm;

	test.beforeAll(async ({browser}) => {
		page = await browser.newPage();
		form = await createForm(page);
	});

	test.describe("object", () => {

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

		test.beforeAll(async () => {
			await form.setState({schema, uiSchema, formData});
		});

		test("uses first item by default and keeps idSchema intact", async () => {
			await expect(form.$getInputWidget("0.a")).toBeVisible();
		});

		test.describe("respects activeIdx and", () => {
			test.beforeAll(async () => {
				await form.setState({uiSchema: {...uiSchema, "ui:options": {activeIdx: 1}}});
			});

			test("renders only single item", async () => {
				await expect(form.$locate("1.a")).toBeVisible();
				await expect(form.$locate("0.a")).not.toBeVisible();
			});

			test("renders form data", async () => {
				await expect(form.$getInputWidget("1.a")).toHaveValue(formData[1].a);
			});

			test("onChange", async () => {
				await updateValue(form.$getInputWidget("1.a"), "test");

				await expect(form.$getInputWidget("1.a")).toHaveValue("test");
			});

			test("renders item errors", async () => {
				await form.setState({
					formData: [{a: "a"}, {a: 1}]
				});
				await form.submit();

				await expect(form.$getFieldErrors("1.a")).toHaveCount(1);
			});

			test("renders array errors", async () => {
				await form.setState({
					schema: {...schema, minItems: 1},
					formData: []
				});
				await form.submit();

				await expect(form.$getFieldErrors("")).toHaveCount(1);
			});
		});

		test("formats title", async () => {
			await form.setState({uiSchema: {...uiSchema, "ui:title": "test %{idx} test"}});

			await expect(page.getByText("test 1 test")).toBeVisible();
		});

		test("respects titleClassName option", async () => {
			await form.setState({uiSchema: {...uiSchema, "ui:title": "test", "ui:options": { titleClassName: "title-format-test" }}});

			await expect(page.locator(".title-format-test")).toBeVisible();
		});
	});

	test.describe("string array with unique items", () => {

		const schema = {type: "array", uniqueItems: true, title: "test", items: { type: "string", enum: ["a"], enumNames: ["a"] }};

		test.beforeAll(async () => {
			await form.setState({schema, uiSchema});
		});

		test("is rendered as select", async () => {
			await expect(form.$getEnumWidget("").$container).toBeVisible();
		});

		test("renders title as label", async () => {
			await expect(page.locator("label")).toBeVisible();
			await expect(page.locator("legend")).not.toBeVisible();
		});
	});
});
