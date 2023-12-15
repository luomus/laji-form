import { test, expect } from "@playwright/test";
import { DemoPageForm, ImageArrayFieldPO, createForm } from "./test-utils";

test.describe("Mobile form (MHL.51)", () => {

	test.describe("without formData", () => {
		let form: DemoPageForm;
		let images: ImageArrayFieldPO;

		test.beforeAll(async ({browser}) => {
			form = await createForm(await browser.newPage(), {id: "MHL.51"});
			images = form.getImageArrayField("gatherings.0.units.0.images");
		});

		test("is displayed", async () => {
			await expect(form.$form).toBeVisible();
		});

		test("image add modal is displayed", async  () => {
			await expect(images.$addModal).toBeVisible();
		});

		test("clicking cancel on image add modal hides it", async () => {
			await images.$addModalCancel.click();

			await expect(images.$addModal).not.toBeVisible();
		});
	});

	test.describe("with formData with geometry",  () => {
		let form: DemoPageForm;
		let images: ImageArrayFieldPO;

		test.beforeAll(async ({browser}) => {
			form = await createForm(await browser.newPage(), {id: "MHL.51", localFormData: "MHL.51-geometry"});
			images = form.getImageArrayField("gatherings.0.units.0.images");
		});

		test("is displayed", async  () => {
			await expect(form.$form).toBeVisible();
		});

		test("image add modal is displayed", async () => {
			await expect(images.$addModal).toBeVisible();
		});

		test("map doesn't geolocating blocker since it has geometry", async  () => {
			await expect(form.$blocker).not.toBeVisible();
		});

		test("map doesn't show mobile editor", async  () => {
			await expect(form.$mapFieldFullscreenMap).not.toBeVisible();
		});

	});

	test.describe("with formData with image",  () => {
		let form: DemoPageForm;
		let images: ImageArrayFieldPO;

		test.beforeAll("navigate to form", async ({browser}) => {
			form = await createForm(await browser.newPage(), {id: "MHL.51", localFormData: "MHL.51-image-geometry"});
			images = form.getImageArrayField("gatherings.0.units.0.images");
		});

		test("is displayed", async  () => {
			await expect(form.$form).toBeVisible();
		});

		test("image add modal isn't displayed", async () => {
			await expect(images.$addModal).not.toBeVisible();
		});

		test("map doesn't geolocating blocker since it has geometry", async () => {
			await expect(form.$blocker).not.toBeVisible();
		});

		test("map doesn't show mobile editor", async () => {
			await expect(form.$mapFieldFullscreenMap).not.toBeVisible();
		});

	});

	test.describe("with formData without image and edit mode", () => {
		let form: DemoPageForm;
		let images: ImageArrayFieldPO;

		test.beforeAll("navigate to form", async ({browser}) => {
			form = await createForm(await browser.newPage(), {id: "MHL.51", localFormData: "MHL.51-geometry", isEdit: true});
			images = form.getImageArrayField("gatherings.0.units.0.images");
		});

		test("is displayed", async () => {
			await expect(form.$form).toBeVisible();
		});

		test("image add modal isn't displayed", async () => {
			await expect(images.$addModal).not.toBeVisible();
		});
	});
});
