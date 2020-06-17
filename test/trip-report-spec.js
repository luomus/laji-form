import { createForm, lajiFormLocate, waitUntilBlockingLoaderHides, putForeignMarkerToMap, removeUnit, getFocusedId } from "./test-utils.js";

import { googleApiKey } from "../properties.json"

const testWidget = form =>  async (path, type) => {
	const parsePointer = (container, path) => {
		const [next, ...remaining] = path.split(".");
		const nextObject = container[next];
		if (remaining.length) {
			return parsePointer(nextObject, remaining.join("."));
		}
		return nextObject;
	}

	expect(await lajiFormLocate(path).isDisplayed()).toBe(true);
	const beforeChange = parsePointer(await form.getChangedData(), path)
	let widget;
	switch (type) {
	case "checkbox":
		widget = await form.$getCheckboxWidget(path);
		await widget.click();
		break;
	case "enum":
		widget = await form.$getEnumWidget(path);
		await widget.click();
		await widget.$$("li")[1].click();
		break;
	case "date":
		widget = await form.$getDateWidget(path);
		await widget.$("input").sendKeys("1.1.2019");
		await browser.actions().sendKeys(protractor.Key.TAB).perform();
		break;
	default:
		widget = await form.$getInputWidget(path);
		await widget.sendKeys("1");
		await browser.actions().sendKeys(protractor.Key.TAB).perform();
		break;
	}
	expect(beforeChange).not.toEqual(parsePointer(await form.getChangedData()), path);
}

describe("Trip report (JX.519)", () => {

	let form;
	beforeAll(async () => {
		form = await createForm({id: "JX.519"});
	});

	const $gatheringsMap = lajiFormLocate("gatherings").$(".laji-map");

	describe("gatheringEvent", () => {

		const $gatheringEvent = lajiFormLocate("gatheringEvent");

		it("container is displayed", async () => {
			expect(await $gatheringEvent.isPresent()).toBe(true);
		});

		describe("contains", () => {

			it("secureLevel which is editable", async () => {
				expect(await $gatheringEvent.element(lajiFormLocate("secureLevel").locator()).isDisplayed()).toBe(true);
				testWidget("secureLevel", "checkbox")
			});

			//TODO TableField messes up ids!
			//it("contains gatheringEvent.observer.0", () => {
			//	expect(lajiFormLocate("gatheringEvent.leg.0").isDisplayed()).toBe(true);
			//});

			it("gatheringEvent.legPublic which is editable", async () => {
				testWidget("gatheringEvent.legPublic", "checkbox")
			});

			it("gatheringEvent.dateBegin which is editable", async () => {
				testWidget("gatheringEvent.dateBegin", "date")
			});

			it("gatheringEvent.dateEnd which is editable", async () => {
				testWidget("gatheringEvent.dateEnd", "date")
			});

			it("keywords which is editable", async () => {
				expect(await $gatheringEvent.element(lajiFormLocate("keywords").locator()).isDisplayed()).toBe(true);
				testWidget("keywords")
			});
		});
	});

	const $gatheringAdd = $("#root_gatherings-add");

	describe("gatherings", () => {
		it("is displayed", async () => {
			expect(await lajiFormLocate("gatherings").isDisplayed()).toBe(true);
		});

		it("is empty", async () => {
			expect(await lajiFormLocate("gatherings.0").isPresent()).toBe(false);
		});

		it("map is present", async () => {
			expect(await $gatheringsMap.isDisplayed()).toBe(true);
		});

		it("creating pointer on map creates gathering", async () => {
			await putForeignMarkerToMap();

			expect(await lajiFormLocate("gatherings.0").isDisplayed()).toBe(true);
		});

		describe("geocoding", () => {

			it("starts and finishes after adding gathering", async () => {
				if (await lajiFormLocate("gatherings.0.country").isPresent()) {
					return;
				}
				const $loadingGeocoderButton = $(".geocoder-btn .react-spinner");

				if (await $loadingGeocoderButton.isPresent()) {
					await browser.wait(protractor.ExpectedConditions.invisibilityOf($loadingGeocoderButton), 6000, "Geocoding timeout");
				}

				expect(await $loadingGeocoderButton.isPresent()).toBe(false);
			});

			if (!googleApiKey) {
				pending("Google API key missing");
			}

			it("adds country which is editable", async () => {
				testWidget("gatherings.0.country");
			});

			it("adds administrativeProvince which is editable", async () => {
				testWidget("gatherings.0.administrativeProvince");
			});

			it("adds municipality which is editable", async () => {
				testWidget("gatherings.0.municipality");
			});

		});

		it("contains locality which is editable", async () => {
			testWidget("gatherings.0.locality");
		});

		it("contains localityDescription which is editable", async () => {
			testWidget("gatherings.0.localityDescription");
		});

		it("contains weather which is editable", async () => {
			testWidget("gatherings.0.weather");
		});

		it("contains notes which is editable", async () => {
			testWidget("gatherings.0.notes");
		});

		const $additionalsButton = $("#root_gatherings_0-additionals");

		it("has additional fields button", async () => {
			expect(await $additionalsButton.isDisplayed()).toBe(true);
		});


		describe("taxonCensus", () => {
			it("can be added from additional fields", async () => {
				await $additionalsButton.click();
				const $$additionalListItems = $$(".dropdown.open li a");
				await $$additionalListItems.last().click();

				expect(await form.$locate("gatherings.0.taxonCensus").isDisplayed()).toBe(true);

				await $additionalsButton.click();

				expect(await $$additionalListItems.isPresent()).toBe(false);
			});

			it("can add items", async () => {
				await form.$locateButton("gatherings.0.taxonCensus", "add").click();
				testWidget("gatherings.0.taxonCensus.0.taxonCensusID");
				testWidget("gatherings.0.taxonCensus.0.taxonCensusType", "enum");
			});

			it("added item is focused", async () => {
				expect(await form.$getInputWidget("gatherings.0.taxonCensus.0.censusTaxonID").getAttribute("id") === await getFocusedId()).toBe(true);
			});

			it("second added item is focused", async () => {
				await form.$locateButton("gatherings.0.taxonCensus", "add").click();
				expect(await form.$getInputWidget("gatherings.0.taxonCensus.1.censusTaxonID").getAttribute("id") === await getFocusedId()).toBe(true);
			});
		});


		it("add button works", async () => {
			await $gatheringAdd.click();

			expect(await lajiFormLocate("gatherings.1").isDisplayed()).toBe(true);

			await waitUntilBlockingLoaderHides();
		});

		it("map is empty for new gathering", async () => {
			expect(await $gatheringsMap.$(".vector-marker.leaflet-interactive").isPresent()).toBe(false);
		});

		it("items can be deleted", async () => {
			await $("#root_gatherings_1-delete").click();
			await $("#root_gatherings_1-delete-confirm-yes").click();

			expect(await lajiFormLocate("gatherings.1").isPresent()).toBe(false);
		});

	});

	describe("units", () => {

		const $unitAdd = $("#root_gatherings_0_units-add");
		it("is displayed", async () => {
			expect(await lajiFormLocate("gatherings.0.units").isDisplayed()).toBe(true);
		});

		it("has one by default", async () => {
			expect(await lajiFormLocate("gatherings.0.units.0").isDisplayed()).toBe(true);
		});

		it("can be added", async () => {
			await $unitAdd.click();

			expect(await lajiFormLocate("gatherings.0.units.1").isDisplayed()).toBe(true);
		});

		it("added is focused", async () => {
			expect(await form.$getInputWidget("gatherings.0.units.1.identifications.0.taxon").getAttribute("id") === await getFocusedId()).toBe(true);
		});

		it("first is shown as table row after activating second", async () => {
			expect(await lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("tr");
		});

		it("activating works for both", async () => {
			await lajiFormLocate("gatherings.0.units.0").click();

			expect(await lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("div");
			expect(await lajiFormLocate("gatherings.0.units.1").getTagName()).toBe("tr");

			await lajiFormLocate("gatherings.0.units.1").click();

			expect(await lajiFormLocate("gatherings.0.units.1").getTagName()).toBe("div");
			expect(await lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("tr");
		});

		it("can be deleted", async () => {
			await removeUnit(0, 1);

			expect(await lajiFormLocate("gatherings.0.units.1").isPresent()).toBe(false);
		});

		it("first is active after deleting second", async () => {
			expect(await lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("div");
		});

		it("contains identifications.0.taxon", async () => {
			expect(await lajiFormLocate("gatherings.0.units.0.identifications.0.taxon").isDisplayed()).toBe(true);
		});

		it("contains count which is editable", async () => {
			testWidget("gatherings.0.units.0.count");
		});

		it("contains notes which is editable", async () => {
			testWidget("gatherings.0.units.0.notes");
		});

		it("contains taxonConfidence which is editable", async () => {
			testWidget("gatherings.0.units.0.taxonConfidence", "enum");
		});

		it("contains recordBasis which is editable", async () => {
			testWidget("gatherings.0.units.0.recordBasis", "enum");
		});

		it("contains images", async () => {
			expect(await lajiFormLocate("gatherings.0.units.0.images").isDisplayed()).toBe(true);
		});

		const $additionalsButton = $("#root_gatherings_0_units_0-additionals");
		const $modal = $(".scope-field-modal");

		it("can open additionals chooser", async () => {
			expect(await $additionalsButton.isDisplayed()).toBe(true);
			const informalGroups = [1, 343, 232, 187];
			let mocks = [];
			for (let id of informalGroups) {
				mocks.push(await form.setMockResponse(`/informal-taxon-groups/MVL.${id}`));
			}

			await $additionalsButton.click();

			await browser.wait(protractor.ExpectedConditions.visibilityOf($modal), 5000, "Additionals modal waiting timeout");

			expect(await $modal.$(".list-group .react-spinner").isDisplayed()).toBe(true);

			for (let idx in informalGroups) {
				await mocks[idx].resolve({
					"id": informalGroups[idx],
					"name": "test"
				});
			}
			expect(await $modal.$(".list-group .react-spinner").isPresent()).toBe(false);
			expect(await $modal.$$(".list-group").get(1).$(".list-group-item strong").getText()).toBe("test");
		});

		it("can add additional fields", async () => {
			expect(await lajiFormLocate("gatherings.0.units.0.identifications.0.det").isPresent()).toBe(false);

			expect(await $additionalsButton.isDisplayed()).toBe(true);


			const $firstGroup = $$(".scope-field-modal-item").first();

			const getFieldCount = () => lajiFormLocate("gatherings.0.units.0").$$("input").count();
			const fieldCount = await getFieldCount();

			const $additionalItem = $firstGroup.all(by.css(".list-group-item")).get(1);

			expect(await $modal.isDisplayed()).toBe(true);
			expect(await $additionalItem.isDisplayed()).toBe(true);

			await $additionalItem.click();
			await $modal.$(".close").click();

			expect(await $additionalItem.isPresent()).toBe(false);
			expect(await await getFieldCount()).toBe(fieldCount + 1);
		});

		const $getLocationButtonFor = (gatheringIdx, unitIdx) => $(`#root_gatherings_${gatheringIdx}_units_${unitIdx}-location`);
		const $locationModal = $(".map-dialog");
		const $locationModalMap = $locationModal.$(".laji-map");

		it("has location button", async () => {
			expect(await $getLocationButtonFor(0, 0).isDisplayed()).toBe(true);
		});

		async function clickLocationButtonAndAddLocation(gatheringIdx, unitIdx) {
			await $getLocationButtonFor(gatheringIdx, unitIdx).click();

			await browser.wait(protractor.ExpectedConditions.visibilityOf($locationModal), 5000, "Map modal waiting timeout");

			expect(await $locationModal.isDisplayed()).toBe(true);
			expect(await $locationModalMap.isDisplayed()).toBe(true);

			return browser.actions({bridge: true})
				.move({origin: $locationModalMap.getWebElement(), x: 100, y: 100}).click().perform();
		}

		it("can add location", async () => {
			await clickLocationButtonAndAddLocation(0, 0);

			expect(await $gatheringsMap.$$(".vector-marker.leaflet-interactive").count()).toBe(2);
		});

		it("unit map modal hides after adding location", async () => {
			expect(await $locationModalMap.isPresent()).toBe(false);
		});

		const $$gatheringMarkerPaths = $gatheringsMap.$$(".vector-marker path");

		it("gatherings map shows unit with different color", async () => {
			expect(await $$gatheringMarkerPaths.count()).toBe(2);
			const firstFill = await $$gatheringMarkerPaths.first().getAttribute("fill");
			const secondFill = await $$gatheringMarkerPaths.last().getAttribute("fill");

			expect(await firstFill).not.toBe(secondFill);
		});

		it("hovering location button changes gathering map unit color", async () => {
			// We check style instead of fill, since the fill attribute doesn't update.
			const unitFill = await $$gatheringMarkerPaths.last().getAttribute("style");

			await browser.actions({bridge: true})
				.move({origin: $getLocationButtonFor(0, 0).getWebElement()})
				.perform();

			const unitFillAfterLocationHover = await $$gatheringMarkerPaths.last().getAttribute("style");

			expect(await unitFill).not.toBe(unitFillAfterLocationHover);
		});

		it("hovering unit table row changes gathering map unit color", async () => {
			await $unitAdd.click();

			const unitFill = await $$gatheringMarkerPaths.last().getAttribute("style");

			await browser.actions({bridge: true})
				.move({origin: lajiFormLocate("gatherings.0.units.0").getWebElement()})
				.perform();

			const unitFillAfterLocationHover = await $$gatheringMarkerPaths.last().getAttribute("style");

			expect(await unitFill).not.toBe(unitFillAfterLocationHover);

			await removeUnit(0, 1);
		});

		const $locationPeeker = $("#root_gatherings_0_units_0-location-peeker");

		it("hovering location button displays location peeking map", async () => {
			await browser.actions({bridge: true})
				.move({origin: $getLocationButtonFor(0, 0).getWebElement()})
				.perform();

			expect(await $locationPeeker.isDisplayed()).toBe(true);
		});

		it("location peeker shows data", async () => {
			await browser.actions({bridge: true})
				.move({origin: $getLocationButtonFor(0, 0).getWebElement()})
				.perform();

			await browser.wait(protractor.ExpectedConditions.visibilityOf($locationPeeker.$(".leaflet-container")), 5000, "Map peeker waiting timeout");

			const $$peekerPaths = $$("#root_gatherings_0_units_0-location-peeker .vector-marker path");

			expect(await $$peekerPaths.count()).not.toBe(0);

			const firstFill = await $$peekerPaths.first().getAttribute("fill");
			const secondFill = await $$peekerPaths.last().getAttribute("fill");

			expect(await firstFill).not.toBe(secondFill);
		});

		it("can have location even if gathering doesn't have", async () => {
			await $gatheringAdd.click();
			await clickLocationButtonAndAddLocation(1, 0);
			await waitUntilBlockingLoaderHides(6000);

			expect(await $$gatheringMarkerPaths.count()).toBe(1);

			await $("#root_gatherings_1-delete").click();
			await $("#root_gatherings_1-delete-confirm-yes").click();

			if (!googleApiKey) {
				await waitUntilBlockingLoaderHides(6000);
			}
		});

		it("choosing informal taxon group changes fields", async () => {
			await $(".informal-taxon-group-chooser").click();

			const getFieldCount = () => lajiFormLocate("gatherings.0.units.0").$$("input").count();
			const fieldCount = await getFieldCount();

			const $spinner = $(".informal-taxon-group-chooser.modal-dialog .react-spinner");
			if (await $spinner.isPresent()) {
				await browser.wait(protractor.ExpectedConditions.invisibilityOf($spinner), 5000, "Informal taxon groups timeout");
			}

			const $birdButton = element(by.className("MVL.1")).element(by.xpath("..")).$$("button").last();

			expect(await $birdButton.isDisplayed()).toBe(true);

			await $birdButton.click();
			await browser.wait(protractor.ExpectedConditions.visibilityOf(lajiFormLocate("gatherings.0.units.0.twitched")), 4000, "Bird field didn't appear");

			expect(await fieldCount).not.toBe(await getFieldCount());
		});
	});
});
