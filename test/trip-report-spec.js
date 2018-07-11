import { navigateToForm, lajiFormLocate, waitUntilBlockingLoaderHides } from "./test-utils.js";

import { googleApiKey } from "../properties.json"

describe("Trip report (JX.519)", () => {

	navigateToForm("JX.519");

	const $gatheringsMap = lajiFormLocate("gatherings").$(".laji-map");

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

		it("map is present", () => {
			expect($gatheringsMap.isDisplayed()).toBe(true);
		});

		it("creating pointer on map creates gathering", () => {
			const $markerButton = $(".leaflet-draw-draw-marker");

			expect($markerButton.isDisplayed()).toBe(true);

			$markerButton.click();

			browser.actions()
				.mouseMove($gatheringsMap, {x: 100, y: 100})
				.click()
				.perform();

			expect(lajiFormLocate("gatherings.0").isDisplayed()).toBe(true);
		});

		const $blockingLoader = $(".laji-form.blocking-loader");

		describe("geocoding", () => {

			it("geocoding starts and finished after adding gathering", async done => {
				expect($blockingLoader.isDisplayed()).toBe(true);

				await waitUntilBlockingLoaderHides(6000);

				expect($blockingLoader.isDisplayed()).toBe(false);
				done();
			});

			if (!googleApiKey) {
				pending("Google API key missing");
			}

			it("contains country", () => {
				expect(lajiFormLocate("gatherings.0.country").isDisplayed()).toBe(true);
			});

			it("contains biologicalProvince", () => {
				expect(lajiFormLocate("gatherings.0.administrativeProvince").isDisplayed()).toBe(true);
			});

			it("contains municipality", () => {
				expect(lajiFormLocate("gatherings.0.municipality").isDisplayed()).toBe(true);
			});

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
			$$additionalListItems.last().click();

			expect(lajiFormLocate("gatherings.0.taxonCensus").isDisplayed()).toBe(true);

			$additionalsButton.click();

			expect($$additionalListItems.isPresent()).toBe(false);
		});

		it("add button works", async () => {
			$("#root_gatherings-add").click();

			expect(lajiFormLocate("gatherings.1").isDisplayed()).toBe(true);

			await waitUntilBlockingLoaderHides();
		});

		it("map is empty for new gathering", () => {
			expect($gatheringsMap.$(".vector-marker.leaflet-interactive").isPresent()).toBe(false);
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
		const $unitAdd = $("#root_gatherings_0_units-add");
		it("is displayed", () => {
			expect(lajiFormLocate("gatherings.0.units").isDisplayed()).toBe(true);
		});

		it("has one by default", () => {
			expect(lajiFormLocate("gatherings.0.units.0").isDisplayed()).toBe(true);
		});

		it("can be added", () => {
			$unitAdd.click();

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

		it("can add additional fields", async done => {
			const $additionalsButton = $("#root_gatherings_0_units_0-additionals");
			const $modal = $(".scope-field-modal");

			expect($additionalsButton.isDisplayed()).toBe(true);
			expect(lajiFormLocate("gatherings.0.units.0.identifications.0.det").isPresent()).toBe(false);

			expect($additionalsButton.isDisplayed()).toBe(true);

			$additionalsButton.click();

			await browser.wait(protractor.ExpectedConditions.visibilityOf($modal), 5000, "Additionals modal waiting timeout");

			const $additionalItem = $$(".scope-field-modal-item").first().all(by.css(".list-group-item")).get(1);

			expect($modal.isDisplayed()).toBe(true);
			expect($additionalItem.isDisplayed()).toBe(true);

			$additionalItem.click();
			$modal.$(".close").click();

			expect($additionalItem.isPresent()).toBe(false);
			expect(lajiFormLocate("gatherings.0.units.0.identifications.0.det").isDisplayed()).toBe(true);
			done();
		});

		const $getLocationButtonFor = idx => $(`#root_gatherings_0_units_${idx}-location`);
		const $locationButton = $getLocationButtonFor(0);
		const $locationModal = $(".map-dialog");
		const $locationModalMap = $locationModal.$(".laji-map");

		it("has location button", () => {
			expect($locationButton.isDisplayed()).toBe(true);
		});

		const clickLocationButtonAndAddLocation = async (idx) => {
			$getLocationButtonFor(idx).click();

			await browser.wait(protractor.ExpectedConditions.visibilityOf($locationModal), 5000, "Map modal waiting timeout");

			expect($locationModal.isDisplayed()).toBe(true);
			expect($locationModalMap.isDisplayed()).toBe(true);

			return browser.actions()
				.mouseMove($locationModalMap, {x: 100, y: 100})
				.click()
				.perform();

		}

		it("can add location", async done => {
			await clickLocationButtonAndAddLocation(0);

			expect($gatheringsMap.$$(".vector-marker.leaflet-interactive").count()).toBe(2);
			done();
		});

		it("unit map modal hides after adding location", () => {
			expect($locationModalMap.isPresent()).toBe(false);
		});

		const $$gatheringPaths = $gatheringsMap.$$(".vector-marker path");

		it("gatherings map shows unit with different color", async done => {
			expect($$gatheringPaths.count()).toBe(2);
			const firstFill = await $$gatheringPaths.first().getAttribute("fill");
			const secondFill = await $$gatheringPaths.last().getAttribute("fill");

			expect(firstFill).not.toBe(secondFill);
			done();
		});

		it("hovering location button changes gathering map unit color", async done => {
			// We check style instead of fill, since the fill attribute doesn't update.
			const unitFill = await $$gatheringPaths.last().getAttribute("style");

			browser.actions()
				.mouseMove($locationButton)
				.perform();

			browser.sleep(1000);

			const unitFillAfterLocationHover = await $$gatheringPaths.last().getAttribute("style");

			expect(unitFill).not.toBe(unitFillAfterLocationHover);
			done();
		});

		it("hovering location button displays location peeking map", () => {
			browser.actions()
				.mouseMove($locationButton)
				.perform();

			expect($("#root_gatherings_0_units_0-location-peeker").isDisplayed()).toBe(true);
		});

		it("location peeker shows data", async done => {
			browser.actions()
				.mouseMove($locationButton)
				.perform();

			const firstFill = await $$gatheringPaths.first().getAttribute("fill");
			const secondFill = await $$gatheringPaths.last().getAttribute("fill");

			const $$peekerPaths = $$("#root_gatherings_0_units_0-location-peeker .vector-marker path");

			expect($$peekerPaths.count()).not.toBe(0);
			expect(firstFill).not.toBe(secondFill);

			done();
		});

		it("location peeker doesn't highlight wrong unit on gatherings map after copying a unit when there is a unit with a location below", async done => {
			$unitAdd.click();
			await clickLocationButtonAndAddLocation(1);
			lajiFormLocate("gatherings.0.units.0").click();
			$("#root_gatherings_0_units-copy").click();

			const unitFill = await $$gatheringPaths.last().getAttribute("style");

			browser.actions()
				.mouseMove($getLocationButtonFor(1))
				.perform();

			const unitFillAfterLocationHover = await $$gatheringPaths.last().getAttribute("style");

			expect(unitFill).toBe(unitFillAfterLocationHover);

			done();
		});
	});

});
