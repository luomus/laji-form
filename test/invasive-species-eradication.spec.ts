import { test, expect, Page } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";
import { MapPageObject } from "@luomus/laji-map/test-export/test-utils";


test.describe("invasive species eradication form (MHL.33)", () => {
	let page: Page;
	let form: DemoPageForm;

	test.beforeAll("renders", async ({browser}) => {
		page = await browser.newPage();
		form = await createForm(page, {id: "MHL.33", localFormData: true});
	});

	test("geometry can be drawn", async () => {
		const map = new MapPageObject(page, page.locator(".laji-map"));

		await map.drawRectangle();

		expect((await form.getChangedData()).gatherings[0].geometry.geometries[0].type).toBe("Polygon");
	});
});
