import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm, DateWidgetPO, updateValue } from "./test-utils";
import moment from "moment";

test.describe.configure({mode: "serial"});

test.describe("Date & time widgets", () => {
	let form: DemoPageForm;
	let widget: DateWidgetPO;

	const schema = {
		type: "string"
	};
	const formData = null;

	const today = moment();
	const today0100 = moment(`${moment().format("YYYY-MM-DD")}T01:00`);
	const yesterday = moment().add(-1, "days");
	const todayPlusSixMonths = moment().add(6, "months");
	const todayPlusSixMonthsTwice = moment().add(6, "months").add(6, "months");
	const todayPlusSixMonthsTwicePlusYear = moment().add(6, "months").add(6, "months").add(1, "years");
	const todayPlusYear = moment().add(1, "years");
	const ISO8601DateFormat = "YYYY-MM-DD";
	const ISO8601TimeFormat = "HH:mm";
	const ISO8601FullFormat = `${ISO8601DateFormat}T${ISO8601TimeFormat}`;
	const displayDateFormat = "DD.MM.YYYY";
	const displayTimeFormat = "HH.mm";
	const displayFullFormat = `${displayDateFormat}, ${displayTimeFormat}`;

	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage());
		widget = form.getDateWidget("");
	});

	test.describe("DateTimeWidget", () => {
		const uiSchema = {
			"ui:widget": "DateTimeWidget",
		};

		test.beforeAll(async () => {
			await form.setState({schema, uiSchema, formData});
		});

		test("renders date button", async () => {
			await expect(widget.buttons.$date).toBeVisible();
		});

		test("renders time button", async () => {
			await expect(widget.buttons.$time).toBeVisible();
		});

		test("selecting date from calendar adds only date", async () => {
			await widget.buttons.$date.click();
			await widget.calendar.$today.click();

			await expect(widget.$input).toHaveValue(today.format(displayDateFormat));
			expect(await form.getChangedData()).toBe(today.format(ISO8601DateFormat));
		});

		test("selecting time adds time", async () => {
			await widget.buttons.$time.click();
			await widget.clock["$01:00"].click();

			await expect(widget.$input).toHaveValue(today0100.format(displayFullFormat));
			expect(await form.getChangedData()).toBe(today0100.format(ISO8601FullFormat));
		});

		test("time can be typed", async () => {
			await updateValue(widget.$input, `${today.format(displayDateFormat)}, 10`);

			await expect(widget.$input).toHaveValue(`${today.format(displayDateFormat)}, 10.00`);
			expect(await form.getChangedData()).toBe(`${today.format(ISO8601DateFormat)}T10:00`);
		});

		test("time can be removed by clearing it from input", async () => {
			await updateValue(widget.$input, today.format(displayDateFormat));

			await expect(widget.$input).toHaveValue(today.format(displayDateFormat));
			expect(await form.getChangedData()).toBe(today.format(ISO8601DateFormat));
		});

		test("whole value can be cleared", async () => {
			await updateValue(widget.$input, "");

			await expect(widget.$input).toHaveValue("");
			expect(await form.getChangedData()).toBe(undefined);
		});

		test("date can be typed", async () => {
			await updateValue(widget.$input, "2.4.2012");

			await expect(widget.$input).toHaveValue("02.04.2012");
			expect(await form.getChangedData()).toBe("2012-04-02");
		});

		test.describe("today & yesterday buttons", () => {
			test("not displayed by default", async () => {
				await expect(widget.buttons.$today).not.toBeVisible();
				await expect(widget.buttons.$yesterday).not.toBeVisible();
			});

			test("displayed if showButtons true", async () => {
				await form.setState({uiSchema: {...uiSchema, "ui:options": {showButtons: true}}});

				await expect(widget.buttons.$today).toBeVisible();
				await expect(widget.buttons.$yesterday).toBeVisible();
			});

			test("yesterday works", async () => {
				await widget.buttons.$yesterday.click();

				await expect(widget.$input).toHaveValue(yesterday.format(displayDateFormat));
				expect(await form.getChangedData()).toBe(yesterday.format(ISO8601DateFormat));
			});

			test("today works", async () => {
				await widget.buttons.$today.click();

				await expect(widget.$input).toHaveValue(today.format(displayDateFormat));
				expect(await form.getChangedData()).toBe(today.format(ISO8601DateFormat));
			});
		});

		test.describe("typing only year when option allowOnlyYear", () => {
			const year = "" + moment().year();

			test("is off should enter full date", async () => {
				await updateValue(widget.$input, year);

				await expect(widget.$input).toHaveValue(`01.01.${year}`);
				expect(await form.getChangedData()).toBe(today.format(`${year}-01-01`));
			});

			test("is on works", async () => {
				await form.setState({uiSchema: {...uiSchema, "ui:options": {allowOnlyYear: true}}});
				await updateValue(widget.$input, year);

				await expect(widget.$input).toHaveValue(year);
				expect(await form.getChangedData()).toBe(year);
			});
		});

		test.describe("typing only year and month when option allowOnlyYearAndMonth", () => {
			test("is off should not accept only year and month", async () => {
				await updateValue(widget.$input, "2.2021");

				await expect(widget.$input).toHaveValue("");
				expect(await form.getChangedData()).toBe(undefined);
			});

			test("is on works", async () => {
				await form.setState({uiSchema: {...uiSchema, "ui:options": {allowOnlyYearAndMonth: true}}});
				await updateValue(widget.$input, "2.2021");

				await expect(widget.$input).toHaveValue("02.2021");
				expect(await form.getChangedData()).toBe("2021-02");
			});
		});

		test.describe("plus six months & plus year buttons", () => {
			test.beforeAll(async () => {
				await updateValue(widget.$input, "");
			});

			test("not displayed by default", async () => {
				await expect(widget.buttons.$plusSixMonths).not.toBeVisible();
				await expect(widget.buttons.$plusYear).not.toBeVisible();
			});

			test("not displayed if showButtons is true", async () => {
				await form.setState({uiSchema: {...uiSchema, "ui:options": {showButtons: true}}});
				await expect(widget.buttons.$plusSixMonths).not.toBeVisible();
				await expect(widget.buttons.$plusYear).not.toBeVisible();
			});

			test("displayed if showButtons has the buttons", async () => {
				await form.setState({uiSchema: {...uiSchema, "ui:options": {showButtons: {plusSixMonths: true, plusYear: true}}}});

				await expect(widget.buttons.$plusSixMonths).toBeVisible();
				await expect(widget.buttons.$plusYear).toBeVisible();
			});

			test("plus six months doesn't do anything if there is no value", async () => {
				await widget.buttons.$plusSixMonths.click();

				await expect(widget.$input).toHaveValue("");
			});

			test("plus six months works when there is a value", async () => {
				await updateValue(widget.$input, today.format(displayDateFormat));
				await widget.buttons.$plusSixMonths.click();

				await expect(widget.$input).toHaveValue(todayPlusSixMonths.format(displayDateFormat));
				expect(await form.getChangedData()).toBe(todayPlusSixMonths.format(ISO8601DateFormat));
			});

			test("plus six months works second time", async () => {
				await widget.buttons.$plusSixMonths.click();

				await expect(widget.$input).toHaveValue(todayPlusSixMonthsTwice.format(displayDateFormat));
				expect(await form.getChangedData()).toBe(todayPlusSixMonthsTwice.format(ISO8601DateFormat));
			});

			test("plus year works", async () => {
				await widget.buttons.$plusYear.click();

				await expect(widget.$input).toHaveValue(todayPlusSixMonthsTwicePlusYear.format(displayDateFormat));
				expect(await form.getChangedData()).toBe(todayPlusSixMonthsTwicePlusYear.format(ISO8601DateFormat));
			});

			test("plus year works with a path option", async () => {
				await form.setState({
					schema: {type: "object", properties: {start: {type: "string"}, end: {type: "string"}}},
					uiSchema: {
						start: {...uiSchema, "ui:options": {showButtons: true}},
						end: {...uiSchema, "ui:options": {showButtons: {plusYear: {path: "/start"}}}}
					},
					formData: {}
				});
				const startWidget = form.getDateWidget("start");
				const endWidget = form.getDateWidget("end");

				await updateValue(startWidget.$input, today.format(displayDateFormat));

				await endWidget.buttons.$plusYear.click();

				await expect(endWidget.$input).toHaveValue(todayPlusYear.format(displayDateFormat));
				expect((await form.getChangedData()).end).toBe(todayPlusYear.format(ISO8601DateFormat));
			});
		});

		test.describe("same button", () => {
			let startWidget: DateWidgetPO;
			let endWidget: DateWidgetPO;

			test.beforeAll(async () => {
				await form.setState({
					schema: {type: "object", properties: {start: {type: "string"}, end: {type: "string"}}},
					uiSchema: {
						start: {...uiSchema, "ui:options": {showButtons: true}},
						end: {...uiSchema, "ui:options": {showButtons: {same: {path: "/start"}}}}
					},
					formData: {}
				});
				startWidget = form.getDateWidget("start");
				endWidget = form.getDateWidget("end");
			});

			test("not displayed by if showButtons true", async () => {
				await expect(startWidget.buttons.$same).not.toBeVisible();
			});

			test("displayed if showButtons has {same: true}", async () => {
				await expect(endWidget.buttons.$same).toBeVisible();
			});

			test("click works", async () => {
				await updateValue(startWidget.$input, "2.4.2012");
				await endWidget.buttons.$same.click();

				await expect(endWidget.$input).toHaveValue("02.04.2012");
				expect((await form.getChangedData()).end).toBe("2012-04-02");
			});
		});
	});

	test.describe("DateWidget", () => {

		const uiSchema = {
			"ui:widget": "DateWidget",
		};

		test.beforeAll(async () => {
			await form.setState({schema, uiSchema, formData});
		});

		test("renders date button", async () => {
			await expect(widget.buttons.$date).toBeVisible();
		});

		test("doesn't render time button", async () => {
			await expect(widget.buttons.$time).not.toBeVisible();
		});

		test("clears time if typed", async () => {
			await updateValue(widget.$input, `${today.format(displayDateFormat)}, 10.00`);

			await expect(widget.$input).toHaveValue(today.format(displayDateFormat));
			expect(await form.getChangedData()).toBe(today.format(ISO8601DateFormat));
		});
	});

	test.describe("TimeWidget", () => {

		const uiSchema = {
			"ui:widget": "TimeWidget",
		};

		test.beforeAll(async () => {
			await updateValue(widget.$input, "");
			await form.setState({schema, uiSchema});
		});

		test("renders time button", async () => {
			await expect(widget.buttons.$time).toBeVisible();
		});

		test("doesn't render date button", async () => {
			await expect(widget.buttons.$date).not.toBeVisible();
		});

		test("time can be typed", async () => {
			await updateValue(widget.$input, "10.00");

			await expect(widget.$input).toHaveValue("10.00");
			expect(await form.getChangedData()).toBe("10:00");
		});

		test("showTimeList hides time button", async () => {
			await form.setState({uiSchema: {...uiSchema, "ui:options": {showTimeList: false}}});

			await expect(widget.buttons.$time).not.toBeVisible();
		});
	});
});
