const { navigateToForm, lajiFormLocate, mockGeo, mockGeoError } = require("./test-utils.js");

const { googleApiKey } = require("../properties.json");

const $blocker = lajiFormLocate("gatherings.0.geometry").$(".blocker");
const $imageAddModal = $(".media-add-modal");
const $mobileEditorMap = $(".laji-form.fullscreen .laji-form-map");

describe("Mobile form (MHL.51)", () => {

	describe("without formData", () => {
		it("navigate to form", async () => {
			await navigateToForm("MHL.51");
		});

		it("is displayed", async () => {
			expect(await $(".laji-form form").isPresent()).toBe(true);
		});


		it("image add modal is displayed", async () => {
			expect(await $imageAddModal.isPresent()).toBe(true);
		});

		it("clicking cancel on image add modal hides it", async () => {
			await $imageAddModal.$(".cancel").click();
			expect(await $imageAddModal.isPresent()).toBe(false);
		});

		it("map shows geolocating blocker after image add modal hides", async () => {
			expect(await $blocker.isPresent()).toBe(true);
		});

		describe("after geolocating", () => {

			if (process.env.HEADLESS !== "false") {
				pending("Geolocation mock fails on headless");
			}

			it("map removes geolocating blocker", async () => {
				await mockGeo(60, 25);
				await browser.wait(protractor.ExpectedConditions.invisibilityOf($blocker), 1000, "Blocker didn't hide");
				expect(await $blocker.isPresent()).toBe(false);
			});

			it("map shows mobile editor", async () => {
				const $mobileEditorMap = $(".laji-form.fullscreen .laji-form-map");
				await browser.wait(protractor.ExpectedConditions.visibilityOf($mobileEditorMap), 1000, "Mobile editor map didn't show up");
				expect(await $mobileEditorMap.isPresent()).toBe(true);
			});

		});

	});

	describe("when geolocating fails", () => {
		it("doesn't hide geolocation blocker", async () => {
			await navigateToForm("MHL.51");
			mockGeoError();
			await browser.sleep(100);
			expect(await $blocker.isPresent()).toBe(true);
		});
	});

	describe("with formData with geometry", () => {
		it("navigate to form", async () => {
			await navigateToForm("MHL.51", "&localFormData=MHL.51-geometry");
		});

		it("is displayed", async () => {
			expect(await $(".laji-form form").isPresent()).toBe(true);
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
		it("navigate to form", async () => {
			await navigateToForm("MHL.51", "&localFormData=MHL.51-image-geometry");
		});

		it("is displayed", async () => {
			expect(await $(".laji-form form").isPresent()).toBe(true);
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
		it("navigate to form", async () => {
			await navigateToForm("MHL.51", "&localFormData=MHL.51-geometry&isEdit=true");
		});

		it("is displayed", async () => {
			expect(await $(".laji-form form").isPresent()).toBe(true);
		});

		it("image add modal isn't displayed", async () => {
			expect(await $imageAddModal.isPresent()).toBe(false);
		});

	});
});
