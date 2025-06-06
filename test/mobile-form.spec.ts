import { test, expect, Page } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";

const $mobileEditorMap = (page: Page) => page.locator(".laji-form.fullscreen .laji-form-map");

test.describe("Mobile form (MHL.51)", () => {

	test.describe("without formData", () => {
		let page: Page;
		let form: DemoPageForm;

		test.beforeAll("navigate to form", async ({browser}) => {
			page = await browser.newPage();
			form = await createForm(page, {id: "MHL.51"});
		});

		test("mobile form is displayed", async () => {
			await expect(form.$form).toBeVisible();
		});

		test("mobile editor map is displayed", async () => {
			await expect($mobileEditorMap(page)).toBeVisible();
		});

		test("choose location button is disabled before moving the marker", async () => {
			await expect(page.locator(".choose-location-button")).toBeVisible();
			await expect(page.locator(".choose-location-button")).toBeDisabled();
		});

		test("choose location button closes the map after moving the marker", async () => {
			await page.mouse.click(300, 300);
			await expect(page.locator(".choose-location-button")).toBeEnabled();
			await page.locator(".choose-location-button").click();
			await expect($mobileEditorMap(page)).toBeHidden();
		});
	});

	test.describe("with formData with geometry", () => {
		let page: Page;
		let form: DemoPageForm;

		test.beforeAll("navigate to form", async ({browser}) => {
			page = await browser.newPage();
			form = await createForm(page, {id: "MHL.51", localFormData: "MHL.51-image-geometry"});
		});

		test("mobile form is displayed", async () => {
			await expect(form.$form).toBeVisible();
		});

		test("mobile editor map is displayed", async () => {
			await expect($mobileEditorMap(page)).toBeVisible();
		});

		test("choose location button is enabled without moving the marker", async () => {
			await expect(page.locator(".choose-location-button")).toBeEnabled();
		});

		test("choose location button closes the map without moving the marker", async () => {
			await expect(page.locator(".choose-location-button")).toBeEnabled();
			await page.locator(".choose-location-button").click();
			await expect($mobileEditorMap(page)).toBeHidden();
		});
	});
});
