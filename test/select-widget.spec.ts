import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm, EnumWidgetPO } from "./test-utils";
import { JSONSchema7 } from "json-schema";

test.describe.configure({ mode: "serial" });

test.describe("SelectWidget", () => {

	let form: DemoPageForm;

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

	let enumWidget: EnumWidgetPO;

	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage(), {schema, formData: initialFormData});
		enumWidget = form.$getEnumWidget("");
	});

	test("renders initial value", async () => {
		expect(await enumWidget.$input.getAttribute("value")).toBe(enums[initialFormData]);
	});

	test("empty value is selectable", async () => {
		await enumWidget.openEnums();
		await enumWidget.$enums.first().click();

		expect (await form.getChangedData()).toBe(undefined);
	});

	test("nonempty value is selectable after empty was selected", async () => {
		await enumWidget.openEnums();
		await enumWidget.$enums.last().click();

		await expect(enumWidget.$input).toHaveValue(enums.c);
		expect (await form.getChangedData()).toBe("c");
	});

	test("selecting value and then empty value without blurring in between keeps empty value", async () => {
		await enumWidget.openEnums();
		await enumWidget.$enums.last().click();

		await enumWidget.openEnums();
		await enumWidget.$enums.first().click();

		expect(await form.getChangedData()).toBe(undefined);
	});

	test("value can be selected with enter", async () => {
		await enumWidget.openEnums();
		await enumWidget.$input.press("ArrowDown");
		await enumWidget.$input.press("Enter");

		expect (await enumWidget.$input.getAttribute("value")).toBe(enums.a);
		expect (await form.getChangedData()).toBe("a");
	});

	test("value can be selected with tab", async () => {
		await enumWidget.openEnums();
		await enumWidget.$input.press("ArrowDown");
		await enumWidget.$input.press("Tab");

		expect (await enumWidget.$input.getAttribute("value")).toBe(enums.b);
		expect (await form.getChangedData()).toBe("b");
	});
});
