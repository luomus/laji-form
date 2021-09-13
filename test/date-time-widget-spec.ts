import { Form, createForm, updateValue, DateWidgetPO, isDisplayed } from "./test-utils";
import * as moment from "moment";

describe("Date & time widgets", () => {
	let form: Form;
	let widget: DateWidgetPO;

	const schema = {
		type: "string"
	};
	const formData = null;

	const today = moment();
	const today0100 = moment(`${moment().format("YYYY-MM-DD")}T01:00`);
	const yesterday = moment().add(-1, "days");
	const ISO8601DateFormat = "YYYY-MM-DD";
	const ISO8601TimeFormat = "HH:mm";
	const ISO8601FullFormat = `${ISO8601DateFormat}T${ISO8601TimeFormat}`;
	const displayDateFormat = "DD.MM.YYYY";
	const displayTimeFormat = "HH.mm";
	const displayFullFormat = `${displayDateFormat}, ${displayTimeFormat}`;

	beforeAll(async () => {
		form = await createForm();
		widget = form.getDateWidget("");
	});

	describe("DateTimeWidget", () => {
		const uiSchema = {
			"ui:widget": "DateTimeWidget",
		};

		beforeAll(async () => {
			await form.setState({schema, uiSchema, formData});
		});

		it("renders date button", async () => {
			expect(await isDisplayed(widget.buttons.$date)).toBe(true);
		});

		it("renders time button", async () => {
			expect(await isDisplayed(widget.buttons.$time)).toBe(true);
		});

		it("selecting date from calendar adds only date", async () => {
			await widget.buttons.$date.click();
			await widget.calendar.waitAnimation();
			await widget.calendar.$today.click();

			expect(await widget.$input.getAttribute("value")).toBe(today.format(displayDateFormat));
			expect(await form.getChangedData()).toBe(today.format(ISO8601DateFormat));
		});

		it("selecting time adds time", async () => {
			await widget.buttons.$time.click();
			await widget.clock.waitAnimation();
			await widget.clock["$01:00"].click();

			expect(await widget.$input.getAttribute("value")).toBe(today0100.format(displayFullFormat));
			expect(await form.getChangedData()).toBe(today0100.format(ISO8601FullFormat));
		});

		it("time can be typed", async () => {
			await updateValue(widget.$input, `${today.format(displayDateFormat)}, 10`);

			expect(await widget.$input.getAttribute("value")).toBe(`${today.format(displayDateFormat)}, 10.00`);
			expect(await form.getChangedData()).toBe(`${today.format(ISO8601DateFormat)}T10:00`);
		});

		it("time can be removed by clearing it from input", async () => {
			await updateValue(widget.$input, today.format(displayDateFormat));

			expect(await widget.$input.getAttribute("value")).toBe(today.format(displayDateFormat));
			expect(await form.getChangedData()).toBe(today.format(ISO8601DateFormat));
		});

		it("whole value can be cleared", async () => {
			await updateValue(widget.$input, "");

			expect(await widget.$input.getAttribute("value")).toBe("");
			expect(await form.getChangedData()).toBe(null);
		});

		it("date can be typed", async () => {
			await updateValue(widget.$input, "2.4.2012");

			expect(await widget.$input.getAttribute("value")).toBe("02.04.2012");
			expect(await form.getChangedData()).toBe("2012-04-02");
		});

		describe("today & yesterday buttons", () => {
			it("not displayed by default", async () => {
				expect(await isDisplayed(widget.buttons.$today)).toBe(false);
				expect(await isDisplayed(widget.buttons.$yesterday)).toBe(false);
			});

			it("displayed if showButtons true", async () => {
				await form.setState({uiSchema: {...uiSchema, "ui:options": {showButtons: true}}});

				expect(await isDisplayed(widget.buttons.$today)).toBe(true);
				expect(await isDisplayed(widget.buttons.$yesterday)).toBe(true);
			});

			it("yesterday works", async () => {
				await widget.buttons.$yesterday.click();

				expect(await widget.$input.getAttribute("value")).toBe(yesterday.format(displayDateFormat));
				expect(await form.getChangedData()).toBe(yesterday.format(ISO8601DateFormat));
			});

			it("today works", async () => {
				await widget.buttons.$today.click();

				expect(await widget.$input.getAttribute("value")).toBe(today.format(displayDateFormat));
				expect(await form.getChangedData()).toBe(today.format(ISO8601DateFormat));
			});
		});

		describe("typing only year when option allowOnlyYear", () => {
			const year = "" + moment().year();

			it("is off should enter full date", async () => {
				await updateValue(widget.$input, year);

				expect(await widget.$input.getAttribute("value")).toBe(`01.01.${year}`);
				expect(await form.getChangedData()).toBe(today.format(`${year}-01-01`));
			});

			it("is on works", async () => {
				await form.setState({uiSchema: {...uiSchema, "ui:options": {allowOnlyYear: true}}});
				await updateValue(widget.$input, year);

				expect(await widget.$input.getAttribute("value")).toBe(year);
				expect(await form.getChangedData()).toBe(year);
			});
		});
	});

	describe("DateWidget", () => {

		const uiSchema = {
			"ui:widget": "DateWidget",
		};

		beforeAll(async () => {
			await form.setState({schema, uiSchema, formData});
		});

		it("renders date button", async () => {
			expect(await isDisplayed(widget.buttons.$date)).toBe(true);
		});

		it("doesn't render time button", async () => {
			expect(await isDisplayed(widget.buttons.$time)).not.toBe(true);
		});

		it("clears time if typed", async () => {
			await updateValue(widget.$input, `${today.format(displayDateFormat)}, 10.00`);

			expect(await widget.$input.getAttribute("value")).toBe(today.format(displayDateFormat));
			expect(await form.getChangedData()).toBe(today.format(ISO8601DateFormat));
		});
	});

	describe("TimeWidget", () => {

		const uiSchema = {
			"ui:widget": "TimeWidget",
		};

		beforeAll(async () => {
			await updateValue(widget.$input, "");
			await form.setState({schema, uiSchema});
		});

		it("renders time button", async () => {
			expect(await isDisplayed(widget.buttons.$time)).toBe(true);
		});

		it("doesn't render date button", async () => {
			expect(await isDisplayed(widget.buttons.$date)).not.toBe(true);
		});

		it("time can be typed", async () => {
			await updateValue(widget.$input, "10.00");

			expect(await widget.$input.getAttribute("value")).toBe("10.00");
			expect(await form.getChangedData()).toBe("10:00");
		});

		it("showTimeList hides time button", async () => {
			await form.setState({uiSchema: {...uiSchema, "ui:options": {showTimeList: false}}});

			expect(await isDisplayed(widget.buttons.$time)).toBe(false);
		});
	});
});
