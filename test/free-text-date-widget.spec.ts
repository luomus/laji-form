import { expect, test } from "@playwright/test";
import moment from "moment";
import { createForm, DateWidgetPO, DemoPageForm } from "./test-utils";

test.describe.configure({mode: "serial"});

test.describe("FreeTextDateWidget", () => {
	let form: DemoPageForm;
	let widget: DateWidgetPO;

	const schema = {type: "string"};
	const uiSchema = {"ui:widget": "FreeTextDateWidget"};

	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage());
		widget = form.getDateWidget("");
		await form.setState({schema, uiSchema, lang: "fi"});
	});

	test("preserves typed dates and free text", async () => {
		await widget.$input.fill("2.4.2012");
		await expect(widget.$input).toHaveValue("2.4.2012");
		expect(await form.getChangedData()).toBe("2.4.2012");

		await widget.$input.fill("not a date");
		await widget.$input.blur();
		await expect(widget.$input).toHaveValue("not a date");
		expect(await form.getChangedData()).toBe("not a date");

		await widget.$input.fill("");
		await expect(widget.$input).toHaveValue("");
		expect(await form.getChangedData()).toBe("");
	});

	test("calendar remains visible and selectable while typing", async () => {
		await widget.$input.fill("unknown");
		await widget.buttons.$date.click();
		await expect(widget.calendar.$today).toBeVisible();

		await widget.$input.fill("still unknown");
		await expect(widget.calendar.$today).toBeVisible();
		expect(await form.getChangedData()).toBe("still unknown");

		await widget.calendar.$today.click();
		const today = moment().format("DD.MM.YYYY");
		await expect(widget.$input).toHaveValue(today);
		expect(await form.getChangedData()).toBe(today);
		await expect(widget.$input).toBeFocused();
	});

	test("calendar can be opened and navigated with the keyboard", async () => {
		await widget.$input.fill("02.04.2012");
		await widget.$input.press("Alt+ArrowDown");
		await expect(widget.calendar.$today).toBeVisible();
		await expect(widget.$input).toBeFocused();

		await widget.$input.press("ArrowRight");
		await widget.$input.press("Enter");
		await expect(widget.$input).toHaveValue("03.04.2012");
		expect(await form.getChangedData()).toBe("03.04.2012");
		await expect(widget.$input).toBeFocused();
	});

	test("readonly and disabled prevent editing and opening the calendar", async () => {
		await form.setState({uiSchema: {...uiSchema, "ui:readonly": true}});
		await expect(widget.$input).toHaveAttribute("readonly");
		await expect(widget.buttons.$date).toBeDisabled();

		await form.setState({uiSchema: {...uiSchema, "ui:disabled": true}});
		await expect(widget.$input).toBeDisabled();
		await expect(widget.buttons.$date).toBeDisabled();
	});
});
