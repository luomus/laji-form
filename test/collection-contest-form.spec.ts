import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";

test.describe("Collection contest form (MHL.25)", () => {

	test.describe("Without data", () => {
		let form: DemoPageForm;

		test.beforeAll(async ({browser}) => {
			form = await createForm(await browser.newPage(), {id: "MHL.25"});
			await form.$locateButton("gatherings", "add").click();
		});

		test("shows gathering date and hides unit date", async () => {
			await expect(form.$locate("gatherings.0.dateBegin")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.0.unitGathering.dateBegin")).not.toBeVisible();
		});

		test.describe("injected date field", () => {
			test("is date widget", async () => {
				const dateWidget = form.getDateWidget("gatherings.0.dateBegin");
				await expect(dateWidget.$input).toBeVisible();
			});

			test("onChange works", async () => {
				const dateWidget = form.getDateWidget("gatherings.0.dateBegin");
				await dateWidget.buttons.$today.click();
				await expect(dateWidget.$input).toHaveValue(/^\d{2}\.\d{2}.\d{4}$/)
			});
		});
	});
});
