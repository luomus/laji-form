import { test, expect, Page } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";

const $blocker = (form: DemoPageForm) => form.$locate("gatherings.0.geometry").locator(".blocker");
const $imageAddModal = (page: Page) => page.locator(".media-add-modal");
const $mobileEditorMap = (page: Page) => page.locator(".laji-form.fullscreen .laji-form-map");

test.describe("Mobile form (MHL.51)", () => {

	test.describe("without formData", () => {
		let page: Page;
		let form: DemoPageForm;

		test.beforeAll("navigate to form", async ({browser}) => {
			page = await browser.newPage();
			form = await createForm(page, {id: "MHL.51"});
		});

		test("is displayed", async () => {
			await expect(form.$form).toBeVisible();
		});

		test("image add modal is displayed", async () => {
			expect($imageAddModal(page)).toBeVisible();
		});

		test("clicking cancel on image add modal hides it", async () => {
			await $imageAddModal(page).locator(".cancel").click();

			await expect($imageAddModal(page)).not.toBeVisible();
		});
	});

	test.describe("with formData with geometry", () => {
		let page: Page;
		let form: DemoPageForm;

		test.beforeAll(async ({browser}) => {
			page = await browser.newPage();
			form = await createForm(page, {id: "MHL.51", localFormData: "MHL.51-geometry"});
		});

		test("is displayed", async () => {
			await expect(form.$form).toBeVisible();
		});


		test("image add modal is displayed", async () => {
			await expect($imageAddModal(page)).toBeVisible();
		});

		test("map doesn't geolocating blocker since it has geometry", async () => {
			await expect($blocker(form)).not.toBeVisible();
		});

		test("map doesn't show mobile editor", async () => {
			await expect($mobileEditorMap(page)).not.toBeVisible();
		});

	});

	test.describe("with formData with image", () => {
		let page: Page;
		let form: DemoPageForm;

		test.beforeAll("navigate to form", async ({browser}) => {
			page = await browser.newPage();
			form = await createForm(page, {id: "MHL.51", localFormData: "MHL.51-image-geometry"});
		});

		test("is displayed", async () => {
			await expect(form.$form).toBeVisible();
		});

		test("image add modal isn't displayed", async () => {
			await expect($imageAddModal(page)).not.toBeVisible();
		});

		test("map doesn't geolocating blocker since it has geometry", async () => {
			await expect($blocker(form)).not.toBeVisible();
		});

		test("map doesn't show mobile editor", async () => {
			await expect($mobileEditorMap(page)).not.toBeVisible();
		});

	});

	test.describe("with formData without image and edit mode", () => {
		let page: Page;
		let form: DemoPageForm;

		test.beforeAll("navigate to form", async ({browser}) => {
			page = await browser.newPage();
			form = await createForm(page, {id: "MHL.51", localFormData: "MHL.51-geometry", isEdit: true});
		});

		test("is displayed", async () => {
			await expect(form.$form).toBeVisible();
		});

		test("image add modal isn't displayed", async () => {
			await expect($imageAddModal(page)).not.toBeVisible();
		});
	});
});
