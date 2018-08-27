import { navigateToForm, lajiFormLocate, waitUntilBlockingLoaderHides, putForeignMarkerToMap, removeUnit } from "./test-utils.js";

import { googleApiKey } from "../properties.json"

describe("Trip report (JX.519)", () => {

	it("navigate to form", async () => {
		await navigateToForm("JX.519");
	});

	const $gatheringsMap = lajiFormLocate("gatherings").$(".laji-map");

	describe("gatheringEvent container", () => {

		const $gatheringEvent = lajiFormLocate("gatheringEvent");

		it("is displayed", async () => {
			await expect($gatheringEvent.isPresent()).toBe(true);
		});

		it("contains secureLevel", async () => {
			const $secureLevel = lajiFormLocate("secureLevel");

			await expect($gatheringEvent.element($secureLevel.locator()).isDisplayed()).toBe(true);
		});
		
		//TODO TableField messes up ids!
		//it("contains gatheringEvent.observer.0", () => {
		//	expect(lajiFormLocate("gatheringEvent.leg.0").isDisplayed()).toBe(true);
		//});

		it("contains gatheringEvent.legPublic", async () => {
			await expect(lajiFormLocate("gatheringEvent.legPublic").isDisplayed()).toBe(true);
		});

		it("contains gatheringEvent.dateBegin", async () => {
			await expect(lajiFormLocate("gatheringEvent.dateBegin").isDisplayed()).toBe(true);
		});

		it("contains gatheringEvent.dateEnd", async () => {
			await expect(lajiFormLocate("gatheringEvent.dateEnd").isDisplayed()).toBe(true);
		});

		it("contains keywords", async () => {
			await expect(lajiFormLocate("keywords").isDisplayed()).toBe(true);
		});
	});

	const $gatheringAdd = $("#root_gatherings-add");

	describe("gatherings", () => {
		it("is displayed", async () => {
			await expect(lajiFormLocate("gatherings").isDisplayed()).toBe(true);
		});

		it("is empty", async () => {
			await expect(lajiFormLocate("gatherings.0").isPresent()).toBe(false);
		});

		it("map is present", async () => {
			await expect($gatheringsMap.isDisplayed()).toBe(true);
		});

		it("creating pointer on map creates gathering", async () => {
			await putForeignMarkerToMap();

			await expect(lajiFormLocate("gatherings.0").isDisplayed()).toBe(true);
		});

		const $blockingLoader = $(".laji-form.blocking-loader");

		describe("geocoding", () => {

			it("geocoding starts and finished after adding gathering", async () => {
				await expect($blockingLoader.isDisplayed()).toBe(true);

				await waitUntilBlockingLoaderHides(6000);

				await expect($blockingLoader.isDisplayed()).toBe(false);
			});

			if (!googleApiKey) {
				pending("Google API key missing");
			}

			it("contains country", async () => {
				await expect(lajiFormLocate("gatherings.0.country").isDisplayed()).toBe(true);
			});

			it("contains biologicalProvince", async () => {
				await expect(lajiFormLocate("gatherings.0.administrativeProvince").isDisplayed()).toBe(true);
			});

			it("contains municipality", async () => {
				await expect(lajiFormLocate("gatherings.0.municipality").isDisplayed()).toBe(true);
			});

		});

		it("contains locality", async () => {
			await expect(lajiFormLocate("gatherings.0.locality").isDisplayed()).toBe(true);
		});

		it("contains localityDescription", async () => {
			await expect(lajiFormLocate("gatherings.0.localityDescription").isDisplayed()).toBe(true);
		});

		it("contains images", async () => {
			await expect(lajiFormLocate("gatherings.0.images").isDisplayed()).toBe(true);
		});

		it("contains weather", async () => {
			await expect(lajiFormLocate("gatherings.0.weather").isDisplayed()).toBe(true);
		});

		it("contains notes", async () => {
			await expect(lajiFormLocate("gatherings.0.notes").isDisplayed()).toBe(true);
		});

		const $additionalsButton = $("#root_gatherings_0-additionals");

		it("has additional fields button", async () => {
			await expect($additionalsButton.isDisplayed()).toBe(true);
		});

		it("can add additional fields", async () => {
			await $additionalsButton.click();
			const $$additionalListItems = $$(".dropdown.open li a");
			await $$additionalListItems.last().click();

			await expect(lajiFormLocate("gatherings.0.taxonCensus").isDisplayed()).toBe(true);

			await $additionalsButton.click();

			await expect($$additionalListItems.isPresent()).toBe(false);
		});

		it("add button works", async () => {
			await $gatheringAdd.click();

			await expect(lajiFormLocate("gatherings.1").isDisplayed()).toBe(true);

			await waitUntilBlockingLoaderHides();
		});

		it("map is empty for new gathering", async () => {
			await expect($gatheringsMap.$(".vector-marker.leaflet-interactive").isPresent()).toBe(false);
		});

		it("items can be deleted", async () => {
			await $("#root_gatherings_1-delete").click();
			await $("#root_gatherings_1-delete-confirm-yes").click();

			await expect(lajiFormLocate("gatherings.1").isPresent()).toBe(false);
		});

		it("first gathering can be activated", async () => {
			await $("#root_gatherings_0-header").click();

			await expect(lajiFormLocate("gatherings.0").isDisplayed()).toBe(true); // Test that the first field is visible.

			if (!googleApiKey) {
				await waitUntilBlockingLoaderHides(6000);
			}
		});
	});

	describe("units", () => {

		const $unitAdd = $("#root_gatherings_0_units-add");
		it("is displayed", async () => {
			await expect(lajiFormLocate("gatherings.0.units").isDisplayed()).toBe(true);
		});

		it("has one by default", async () => {
			await expect(lajiFormLocate("gatherings.0.units.0").isDisplayed()).toBe(true);
		});

		it("can be added", async () => {
			await $unitAdd.click();

			await expect(lajiFormLocate("gatherings.0.units.1").isDisplayed()).toBe(true);
		});

		it("first is shown as table row after activating second", async () => {
			await expect(lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("tr");
		});

		it("activating works for both", async () => {
			await lajiFormLocate("gatherings.0.units.0").click();

			await expect(lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("div");
			await expect(lajiFormLocate("gatherings.0.units.1").getTagName()).toBe("tr");

			await lajiFormLocate("gatherings.0.units.1").click();

			await expect(lajiFormLocate("gatherings.0.units.1").getTagName()).toBe("div");
			await expect(lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("tr");
		});

		it("can be deleted", async () => {
			await removeUnit(0, 1);

			await expect(lajiFormLocate("gatherings.0.units.1").isPresent()).toBe(false);
		});

		it("first is active after deleting second", async () => {
			await expect(lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("div");
		});

		it("contains identifications.0.taxon", async () => {
			await expect(lajiFormLocate("gatherings.0.units.0.identifications.0.taxon").isDisplayed()).toBe(true);
		});

		it("contains count", async () => {
			await expect(lajiFormLocate("gatherings.0.units.0.count").isDisplayed()).toBe(true);
		});

		it("contains notes", async () => {
			await expect(lajiFormLocate("gatherings.0.units.0.notes").isDisplayed()).toBe(true);
		});

		it("contains taxonConfidence", async () => {
			await expect(lajiFormLocate("gatherings.0.units.0.taxonConfidence").isDisplayed()).toBe(true);
		});

		it("contains recordBasis", async () => {
			await expect(lajiFormLocate("gatherings.0.units.0.recordBasis").isDisplayed()).toBe(true);
		});

		it("contains images", async () => {
			await expect(lajiFormLocate("gatherings.0.units.0.images").isDisplayed()).toBe(true);
		});

		it("can add additional fields", async () => {
			const $additionalsButton = $("#root_gatherings_0_units_0-additionals");
			const $modal = $(".scope-field-modal");

			await expect($additionalsButton.isDisplayed()).toBe(true);
			await expect(lajiFormLocate("gatherings.0.units.0.identifications.0.det").isPresent()).toBe(false);

			await expect($additionalsButton.isDisplayed()).toBe(true);

			await $additionalsButton.click();

			await browser.wait(protractor.ExpectedConditions.visibilityOf($modal), 5000, "Additionals modal waiting timeout");

			const $additionalItem = $$(".scope-field-modal-item").first().all(by.css(".list-group-item")).get(1);

			await expect($modal.isDisplayed()).toBe(true);
			await expect($additionalItem.isDisplayed()).toBe(true);

			await $additionalItem.click();
			await $modal.$(".close").click();

			await expect($additionalItem.isPresent()).toBe(false);
			await expect(lajiFormLocate("gatherings.0.units.0.identifications.0.det").isDisplayed()).toBe(true);
		});

		const $getLocationButtonFor = (gatheringIdx, unitIdx) => $(`#root_gatherings_${gatheringIdx}_units_${unitIdx}-location`);
		const $locationModal = $(".map-dialog");
		const $locationModalMap = $locationModal.$(".laji-map");

		it("has location button", async () => {
			await expect($getLocationButtonFor(0, 0).isDisplayed()).toBe(true);
		});

		async function clickLocationButtonAndAddLocation(gatheringIdx, unitIdx) {
			await $getLocationButtonFor(gatheringIdx, unitIdx).click();

			await browser.wait(protractor.ExpectedConditions.visibilityOf($locationModal), 5000, "Map modal waiting timeout");

			await expect($locationModal.isDisplayed()).toBe(true);
			await expect($locationModalMap.isDisplayed()).toBe(true);

			await browser.actions()
				.mouseMove($locationModalMap, {x: 100, y: 100}).perform();
			return browser.actions()
				.click().perform();
		}

		it("can add location", async () => {
			await clickLocationButtonAndAddLocation(0, 0);

			await expect($gatheringsMap.$$(".vector-marker.leaflet-interactive").count()).toBe(2);
		});

		it("unit map modal hides after adding location", async () => {
			await expect($locationModalMap.isPresent()).toBe(false);
		});

		const $$gatheringMarkerPaths = $gatheringsMap.$$(".vector-marker path");

		it("gatherings map shows unit with different color", async () => {
			await expect($$gatheringMarkerPaths.count()).toBe(2);
			const firstFill = await $$gatheringMarkerPaths.first().getAttribute("fill");
			const secondFill = await $$gatheringMarkerPaths.last().getAttribute("fill");

			await expect(firstFill).not.toBe(secondFill);
		});

		it("hovering location button changes gathering map unit color", async () => {
			// We check style instead of fill, since the fill attribute doesn't update.
			const unitFill = await $$gatheringMarkerPaths.last().getAttribute("style");

			await browser.actions()
				.mouseMove($getLocationButtonFor(0, 0))
				.perform();

			const unitFillAfterLocationHover = await $$gatheringMarkerPaths.last().getAttribute("style");

			await expect(unitFill).not.toBe(unitFillAfterLocationHover);
		});

		it("hovering unit table row changes gathering map unit color", async () => {
			$unitAdd.click();

			const unitFill = await $$gatheringMarkerPaths.last().getAttribute("style");

			await browser.actions()
				.mouseMove(await lajiFormLocate("gatherings.0.units.0"))
				.perform();

			const unitFillAfterLocationHover = await $$gatheringMarkerPaths.last().getAttribute("style");

			await expect(unitFill).not.toBe(unitFillAfterLocationHover);

			await removeUnit(0, 1);
		});

		const $locationPeeker = $("#root_gatherings_0_units_0-location-peeker");

		it("hovering location button displays location peeking map", async () => {
			await browser.actions()
				.mouseMove($getLocationButtonFor(0, 0))
				.perform();

			await expect($locationPeeker.isDisplayed()).toBe(true);
		});

		it("location peeker shows data", async () => {
			await browser.actions()
				.mouseMove($getLocationButtonFor(0, 0))
				.perform();

			await browser.wait(protractor.ExpectedConditions.visibilityOf($locationPeeker.$(".leaflet-container")), 5000, "Map peeker waiting timeout");

			const $$peekerPaths = $$("#root_gatherings_0_units_0-location-peeker .vector-marker path");

			await expect($$peekerPaths.count()).not.toBe(0);

			const firstFill = await $$peekerPaths.first().getAttribute("fill");
			const secondFill = await $$peekerPaths.last().getAttribute("fill");

			await expect(firstFill).not.toBe(secondFill);
		});

		it("can have location even if gathering doesn't have", async () => {
			await $gatheringAdd.click();
			await clickLocationButtonAndAddLocation(1, 0);
			await waitUntilBlockingLoaderHides(6000);

			await expect($$gatheringMarkerPaths.count()).toBe(1);

			await $("#root_gatherings_1-delete").click();
			await $("#root_gatherings_1-delete-confirm-yes").click();
			await $("#root_gatherings_0-header").click();

			if (!googleApiKey) {
				await waitUntilBlockingLoaderHides(6000);
			}
		});

		const $informalTaxonGroupButton = $(".informal-taxon-group-chooser");
		it("choosing informal taxon group changes fields", async () => {
			await $informalTaxonGroupButton.click();

			const getFieldCount = () => lajiFormLocate("gatherings.0.units.0").$$("input").count();
			const fieldCount = await getFieldCount();

			const $birdButton = element(by.className("MVL.1")).element(by.xpath("..")).$$("button").last();

			await expect($birdButton.isDisplayed()).toBe(true);

			await $birdButton.click();
			await browser.wait(protractor.ExpectedConditions.visibilityOf(lajiFormLocate("gatherings.0.units.0.twitched")), 4000, "Bird field didn't appear");

			await expect(fieldCount).not.toBe(await getFieldCount());
		});
	});
});
