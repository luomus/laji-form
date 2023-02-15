import { navigateToForm, lajiFormLocate, Form, createForm } from "./test-utils";
import { $, browser } from "protractor";

const $blocker = lajiFormLocate("gatherings.0.geometry").$(".blocker");
const $imageAddModal = $(".media-add-modal");
const $mobileEditorMap = $(".laji-form.fullscreen .laji-form-map");

describe("Mobile form (MHL.51)", () => {

	describe("without formData", () => {
		let form: Form;

		it("navigate to form", async () => {
			form = await createForm({id: "MHL.51"});
		});

		it("is displayed", async () => {
			expect(await form.$form.isPresent()).toBe(true);
		});


		it("image add modal is displayed", async () => {
			expect(await $imageAddModal.isPresent()).toBe(true);
		});

		it("clicking cancel on image add modal hides it", async () => {
			await $imageAddModal.$(".cancel").click();

			expect(await $imageAddModal.isPresent()).toBe(false);
		});
	});

	describe("with formData with geometry", () => {
		let form: Form;

		it("navigate to form", async () => {
			form = await createForm({id: "MHL.51", localFormData: "MHL.51-geometry"});
		});

		it("is displayed", async () => {
			expect(await form.$form.isPresent()).toBe(true);
		});


		it("image add modal is displayed", async () => {
			expect(await $imageAddModal.isPresent()).toBe(true);
		});

		it("map doesn't geolocating blocker since it has geometry", async () => {
			expect(await $blocker.isPresent()).toBe(false);
		});

		it("map doesn't show mobile editor", async () => {
			await browser.sleep(100);

			expect(await $mobileEditorMap.isPresent()).toBe(false);
		});

	});

	describe("with formData with image", () => {
		let form: Form;

		it("navigate to form", async () => {
			form = await createForm({id: "MHL.51", localFormData: "MHL.51-image-geometry"});
		});

		it("is displayed", async () => {
			expect(await form.$form.isPresent()).toBe(true);
		});

		it("image add modal isn't displayed", async () => {
			expect(await $imageAddModal.isPresent()).toBe(false);
		});

		it("map doesn't geolocating blocker since it has geometry", async () => {
			expect(await $blocker.isPresent()).toBe(false);
		});

		it("map doesn't show mobile editor", async () => {
			await browser.sleep(100);

			expect(await $mobileEditorMap.isPresent()).toBe(false);
		});

	});

	describe("with formData without image and edit mode", () => {
		let form: Form;

		it("navigate to form", async () => {
			form = await createForm({id: "MHL.51", localFormData: "MHL.51-geometry", isEdit: true});
		});

		it("is displayed", async () => {
			expect(await form.$form.isPresent()).toBe(true);
		});

		it("image add modal isn't displayed", async () => {
			expect(await $imageAddModal.isPresent()).toBe(false);
		});
	});
});
