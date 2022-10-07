import { Form, createForm, EnumWidgetPOI } from "./test-utils";
import { protractor } from "protractor";
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

	let enumWidget: EnumWidgetPOI;

	beforeAll(async () => {
		form = await createForm({schema, formData: initialFormData});
		enumWidget = form.$getEnumWidget("");
	});

	it("renders initial value", async () => {
		expect(await enumWidget.$input.getAttribute("value")).toBe(enums[initialFormData]);
	});

	it("empty value is selectable", async () => {
		await enumWidget.openEnums();
		await enumWidget.$$enums.first().click();

		expect (await form.getChangedData()).toBe(null);
	});

	it("nonempty value is selectable after empty was selected", async () => {
		await enumWidget.openEnums();
		await enumWidget.$$enums.last().click();

		expect(await enumWidget.$input.getAttribute("value")).toBe(enums.c);
		expect (await form.getChangedData()).toBe("c");
	});

	it("selecting value and then empty value without blurring in between keeps empty value", async () => {
		await enumWidget.openEnums();
		await enumWidget.$$enums.last().click();

		await enumWidget.openEnums();
		await enumWidget.$$enums.first().click();

		expect (await form.getChangedData()).toBe(null);
	});

	it("value can be selected with enter", async () => {
		await enumWidget.openEnums();
		await enumWidget.$input.sendKeys(protractor.Key.DOWN);
		await enumWidget.$input.sendKeys(protractor.Key.ENTER);

		expect (await enumWidget.$input.getAttribute("value")).toBe(enums.a);
		expect (await form.getChangedData()).toBe("a");
	});

	it("value can be selected with tab", async () => {
		await enumWidget.openEnums();
		await enumWidget.$input.sendKeys(protractor.Key.DOWN);
		await enumWidget.$input.sendKeys(protractor.Key.TAB);

		expect (await enumWidget.$input.getAttribute("value")).toBe(enums.b);
		expect (await form.getChangedData()).toBe("b");
	});
});
