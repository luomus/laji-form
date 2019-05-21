
import { navigateToForm, lajiFormLocate, mockGeo, mockGeoError } from "./test-utils.js";

import { googleApiKey } from "../properties.json"

const $blocker = lajiFormLocate("gatherings.0.geometry").$(".blocker");
const $imageAddModal = $(".image-add-modal");
const $mobileEditorMap = $(".laji-form.fullscreen .laji-form-map");

describe("Mobile form (MHL.51)", () => {

	describe("without formData", () => {
		it("navigate to form", async () => {
			await navigateToForm("MHL.51");
		});

		it("is displayed", async () => {
			await expect($(".laji-form form").isPresent()).toBe(true);
		});


		it("image add modal is displayed", async () => {
			await expect($imageAddModal.isPresent()).toBe(true);
		});

		it("clicking cancel on image add modal hides it", async () => {
			await $imageAddModal.$(".cancel").click();
			await expect($imageAddModal.isPresent()).toBe(false);
		});

		it("map shows geolocating blocker after image add modal hides", async () => {
			await expect($blocker.isPresent()).toBe(true);
		});

		describe("after geolocating", () => {

			it("map removes geolocating blocker", async () => {
				await mockGeo(60, 25);
				await browser.wait(protractor.ExpectedConditions.invisibilityOf($blocker), 1000, "Blocker didn't hide");
				await expect($blocker.isPresent()).toBe(false);
			});

			it("map shows mobile editor", async () => {
				const $mobileEditorMap = $(".laji-form.fullscreen .laji-form-map");
				await browser.wait(protractor.ExpectedConditions.visibilityOf($mobileEditorMap), 1000, "Mobile editor map didn't show up");
				await expect($mobileEditorMap.isPresent()).toBe(true);
			});

		});

	});

	describe("when geolocating fails", () => {
		it("doesn't hide geolocation blocker", async () => {
			await navigateToForm("MHL.51");
			mockGeoError();
			await browser.sleep(100);
			await expect($blocker.isPresent()).toBe(true);
		});
	});

	describe("with formData with geometry", () => {
		it("navigate to form", async () => {
			await navigateToForm("MHL.51", "&localFormData=MHL.51-geometry");
		});

		it("is displayed", async () => {
			await expect($(".laji-form form").isPresent()).toBe(true);
		});


		it("image add modal is displayed", async () => {
			await expect($imageAddModal.isPresent()).toBe(true);
		});

		it("map doesn't geolocating blocker since it has geometry", async () => {
			await expect($blocker.isPresent()).toBe(false);
		});

		it("map doesn't show mobile editor", async () => {
			await browser.sleep(100);
			await expect($mobileEditorMap.isPresent()).toBe(false);
		});

	});

	describe("with formData with image", () => {
		it("navigate to form", async () => {
			await navigateToForm("MHL.51", "&localFormData=MHL.51-image-geometry");
		});

		it("is displayed", async () => {
			await expect($(".laji-form form").isPresent()).toBe(true);
		});

		it("image add modal isn't displayed", async () => {
			await expect($imageAddModal.isPresent()).toBe(false);
		});

		it("map doesn't geolocating blocker since it has geometry", async () => {
			await expect($blocker.isPresent()).toBe(false);
		});

		it("map doesn't show mobile editor", async () => {
			await browser.sleep(100);
			await expect($mobileEditorMap.isPresent()).toBe(false);
		});

	});

	describe("with formData without image and edit mode", () => {
		it("navigate to form", async () => {
			await navigateToForm("MHL.51", "&localFormData=MHL.51-geometry&edit=true");
		});

		it("is displayed", async () => {
			await expect($(".laji-form form").isPresent()).toBe(true);
		});

		it("image add modal isn't displayed", async () => {
			await expect($imageAddModal.isPresent()).toBe(false);
		});

	});
});
