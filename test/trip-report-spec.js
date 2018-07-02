import { navigateToForm, lajiFormLocate, waitUntilBlockingLoaderHides } from "./test-utils.js";

describe("Trip report (JX.519)", () => {

	navigateToForm("JX.519");

	describe("gatheringEvent container", () => {

		const $gatheringEvent = lajiFormLocate("gatheringEvent");

		it("is displayed", () => {
			expect($gatheringEvent.isPresent()).toBe(true);
		});

		it("contains secureLevel", () => {
			const $secureLevel = lajiFormLocate("secureLevel");

			expect($gatheringEvent.element($secureLevel.locator()).isDisplayed()).toBe(true);
		});

		//TODO TableField messes up ids!
		//it("contains gatheringEvent.observer.0", () => {
		//	expect(lajiFormLocate("gatheringEvent.leg.0").isDisplayed()).toBe(true);
		//});

		it("contains gatheringEvent.legPublic", () => {
			expect(lajiFormLocate("gatheringEvent.legPublic").isDisplayed()).toBe(true);
		});

		it("contains gatheringEvent.dateBegin", () => {
			expect(lajiFormLocate("gatheringEvent.dateBegin").isDisplayed()).toBe(true);
		});

		it("contains gatheringEvent.dateEnd", () => {
			expect(lajiFormLocate("gatheringEvent.dateEnd").isDisplayed()).toBe(true);
		});

		it("contains keywords", () => {
			expect(lajiFormLocate("keywords").isDisplayed()).toBe(true);
		});
	});

	describe("gatherings", () => {
		it("is displayed", () => {
			expect(lajiFormLocate("gatherings").isDisplayed()).toBe(true);
		});

		it("is empty", () => {
			expect(lajiFormLocate("gatherings.0").isPresent()).toBe(false);
		});

		const $map = $(".laji-map");

		it("map is present", () => {
			expect($map.isDisplayed()).toBe(true);
		});

		it("creating pointer on map creates gathering", () => {
			const $markerButton = $(".leaflet-draw-draw-marker");

			expect($markerButton.isDisplayed()).toBe(true);

			$markerButton.click();

			browser.actions()
				.mouseMove($map, {x: 100, y: 100})
				.click()
				.perform();

			expect(lajiFormLocate("gatherings.0").isDisplayed()).toBe(true);
		});

		const $blockingLoader = $(".laji-form.blocking-loader");

		it("geocoding starts and finished after adding gathering", async done => {
			expect($blockingLoader.isDisplayed()).toBe(true);

			await waitUntilBlockingLoaderHides(2000);

			expect($blockingLoader.isDisplayed()).toBe(false);
			done();
		});

		it("contains country", () => {
			expect(lajiFormLocate("gatherings.0.country").isDisplayed()).toBe(true);
		});

		it("contains biologicalProvince", () => {
			expect(lajiFormLocate("gatherings.0.administrativeProvince").isDisplayed()).toBe(true);
		});

		it("contains municipality", () => {
			expect(lajiFormLocate("gatherings.0.municipality").isDisplayed()).toBe(true);
		});

		it("contains locality", () => {
			expect(lajiFormLocate("gatherings.0.locality").isDisplayed()).toBe(true);
		});

		it("contains localityDescription", () => {
			expect(lajiFormLocate("gatherings.0.localityDescription").isDisplayed()).toBe(true);
		});

		it("contains images", () => {
			expect(lajiFormLocate("gatherings.0.images").isDisplayed()).toBe(true);
		});

		it("contains weather", () => {
			expect(lajiFormLocate("gatherings.0.weather").isDisplayed()).toBe(true);
		});

		it("contains notes", () => {
			expect(lajiFormLocate("gatherings.0.notes").isDisplayed()).toBe(true);
		});

		const $additionalsButton = $("#root_gatherings_0-additionals");

		it("has additional fields button", () => {
			expect($additionalsButton.isDisplayed()).toBe(true);
		});

		it("can add additional fields", () => {
			$additionalsButton.click();
			const $$additionalListItems = $$(".dropdown.open li a");
			$$additionalListItems.first().click();

			expect(lajiFormLocate("gatherings.0.biologicalProvince").isDisplayed()).toBe(true);

			$additionalsButton.click();

			expect($$additionalListItems.isPresent()).toBe(false);
		});

		it("add button works", async () => {
			$("#root_gatherings-add").click();

			expect(lajiFormLocate("gatherings.1").isDisplayed()).toBe(true);

			await waitUntilBlockingLoaderHides();
		});

		it("map is empty for new gathering", () => {
			expect($map.element(by.css(".vector-marker")).isPresent()).toBe(false);
		});

		it("items can be deleted", () => {
			$("#root_gatherings_1-delete").click();
			$("#root_gatherings_1-delete-confirm-yes").click();

			expect(lajiFormLocate("gatherings.1").isPresent()).toBe(false);
		});

		it("first gathering can be activated", () => {
			$("#root_gatherings_0-header").click();

			expect(lajiFormLocate("gatherings.0").isDisplayed()).toBe(true); // Test that the first field is visible.
		});
	});

	describe("units", () => {
		it("is displayed", () => {
			expect(lajiFormLocate("gatherings.0.units").isDisplayed()).toBe(true);
		});

		it("has one by default", () => {
			expect(lajiFormLocate("gatherings.0.units.0").isDisplayed()).toBe(true);
		});

		it("can be added", () => {
			$("#root_gatherings_0_units-add").click();

			expect(lajiFormLocate("gatherings.0.units.1").isDisplayed()).toBe(true);
		});

		it("first is shown as table row after activating second", () => {
			expect(lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("tr");
		});

		it("activating works for both", () => {
			lajiFormLocate("gatherings.0.units.0").click();

			expect(lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("div");
			expect(lajiFormLocate("gatherings.0.units.1").getTagName()).toBe("tr");

			lajiFormLocate("gatherings.0.units.1").click();

			expect(lajiFormLocate("gatherings.0.units.1").getTagName()).toBe("div");
			expect(lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("tr");
		});

		it("can be deleted", () => {
			$("#root_gatherings_0_units_1-delete").click();
			$("#root_gatherings_0_units_1-delete-confirm-yes").click();

			expect(lajiFormLocate("gatherings.0.units.1").isPresent()).toBe(false);
		});

		it("first is active after deleting second", () => {
			expect(lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("div");
		});

		it("contains identifications.0.taxon", () => {
			expect(lajiFormLocate("gatherings.0.units.0.identifications.0.taxon").isDisplayed()).toBe(true);
		});

		it("contains count", () => {
			expect(lajiFormLocate("gatherings.0.units.0.count").isDisplayed()).toBe(true);
		});

		it("contains notes", () => {
			expect(lajiFormLocate("gatherings.0.units.0.notes").isDisplayed()).toBe(true);
		});

		it("contains taxonConfidence", () => {
			expect(lajiFormLocate("gatherings.0.units.0.taxonConfidence").isDisplayed()).toBe(true);
		});

		it("contains recordBasis", () => {
			expect(lajiFormLocate("gatherings.0.units.0.recordBasis").isDisplayed()).toBe(true);
		});

		it("contains images", () => {
			expect(lajiFormLocate("gatherings.0.units.0.images").isDisplayed()).toBe(true);
		});

		const $additionalsButton = $("#root_gatherings_0_units_0-additionals");

		it("has additional fields button", () => {
			expect($additionalsButton.isDisplayed()).toBe(true);
		});

		it("can add additional fields", async done => {
			const $modal = $(".scope-field-modal");

			expect(lajiFormLocate("gatherings.0.units.0.identifications.0.det").isPresent()).toBe(false);

			expect($additionalsButton.isDisplayed()).toBe(true);

			$additionalsButton.click();

			await browser.wait(protractor.ExpectedConditions.visibilityOf($modal), 5000, "Code reading timeout");

			const $additionalItem = $$(".scope-field-modal-item").first().all(by.css(".list-group-item")).get(1);

			expect($modal.isDisplayed()).toBe(true);
			expect($additionalItem.isDisplayed()).toBe(true);

			$additionalItem.click();
			$modal.element(by.css(".close")).click();

			expect($additionalItem.isPresent()).toBe(false);
			expect(lajiFormLocate("gatherings.0.units.0.identifications.0.det").isDisplayed()).toBe(true);
			done();
		});
	});
});
