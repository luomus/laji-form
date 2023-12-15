import { test, expect, Locator, Page } from "@playwright/test";
import { createForm, Mock, NamedPlaceChooserPO, lajiFormLocator, EnumWidgetPO, getRemoveUnit, DemoPageForm } from "./test-utils";
const { googleApiKey } = require("../properties.json");

const _testWidget = (form: DemoPageForm) => async (path: string, type?: string) => {
	const parsePointer = (container: any, path: string): any => {
		const [next, ...remaining] = path.split(".");
		const nextObject = container[next];
		if (remaining.length) {
			return parsePointer(nextObject, remaining.join("."));
		}
		return nextObject;
	};

	expect(form.$locate(path)).toBeVisible();
	const beforeChange = parsePointer(await form.getChangedData() || {}, path);
	let widget;
	let $secondOption, $otherOptionThanActive;
	switch (type) {
	case "checkbox":
		widget = form.getBooleanWidget(path);
		await widget.$nonactive.click();
		break;
	case "enum":
		widget = form.$getEnumWidget(path);
		await widget.$container.click();
		$secondOption = widget.$enums.nth(1);
		$otherOptionThanActive = (await $secondOption.getAttribute("class")).includes("rw-state-selected")
			? widget.$enums.first()
			: $secondOption;
		await $otherOptionThanActive.click();
		break;
	case "date":
		widget = form.getDateWidget(path).$input;
		await widget.click();
		await widget.type("1.1.2019");
		await widget.press("Tab");
		break;
	default:
		widget = form.$getInputWidget(path);
		await widget.type("1");
		await widget.press("Tab");
		break;
	}
	expect(beforeChange).not.toEqual(parsePointer(await form.getChangedData(), path));
};

test.describe.configure({ mode: "serial" });

test.describe("Trip report (JX.519)", () => {

	let page: Page;
	let form: DemoPageForm;
	let removeUnit: (gatheringIdx: number, unitIdx: number) => Promise<void>;
	let testWidget: (path: string, fill?: string) => Promise<void>;
	let npMock: Mock;
	let $gatheringsMap: Locator;
	let $$gatheringMarkerPaths: Locator;
	let $gatheringEvent: Locator;
	let $gatheringAdd: Locator;
	let $additionalsButton: Locator;

	test.beforeAll(async ({browser}) => {
		page = await browser.newPage();
		// Initialize via json require so we can mock the named places fetch before the page initializees
		form = await createForm(page);
		npMock = await form.setMockResponse("/named-places", false);
		form.setState({...require("../forms/JX.519"), formData: {gatheringEvent: {leg: [require("../properties.json").userId]}}});

		removeUnit = getRemoveUnit(page);
		testWidget = _testWidget(form);
		$gatheringsMap = form.$locate("gatherings").locator(".laji-map");
		$$gatheringMarkerPaths = $gatheringsMap.locator(".vector-marker path");
		$gatheringEvent = form.$locate("gatheringEvent");
		$gatheringAdd = form.$locateButton("gatherings", "add");
		$additionalsButton = form.$locateButton("gatherings.0", "additionals");
	});

	test.describe("gatheringEvent", () => {

		test("container is displayed", async () => {
			await expect($gatheringEvent).toBeVisible();
		});

		test.describe("contains", () => {

			test("secureLevel which is editable", async () => {
				await expect($gatheringEvent.locator(lajiFormLocator("secureLevel"))).toBeVisible();
				await testWidget("secureLevel", "checkbox");
			});

			test("gatheringEvent.legPublic which is editable", async () => {
				await testWidget("gatheringEvent.legPublic", "checkbox");
			});

			test("gatheringEvent.dateBegin which is editable", async () => {
				await testWidget("gatheringEvent.dateBegin", "date");
			});

			test("gatheringEvent.dateEnd which is editable", async () => {
				await testWidget("gatheringEvent.dateEnd", "date");
			});

			test("keywords which is editable", async () => {
				await expect($gatheringEvent.locator(lajiFormLocator("keywords"))).toBeVisible();
				await testWidget("keywords");
			});


			// TODO TableField messes up ids!
			test.describe("observers", () => {
				test("displayed", async () => {
					await expect(form.$locate("gatheringEvent.0.leg")).toBeVisible();
				});

				test("can be added", async () => {
					await form.$locateButton("gatheringEvent", "add").click();

					await expect(form.$locate("gatheringEvent.1.leg")).toBeVisible();
				});

				test("deleting first shows only the remaining empty", async () => {
					// Should be 1st delete button (row 0 is labels)
					await form.$locate("").locator(".table-field .row").nth(1).locator("button").click();

					await expect(form.$locate("gatheringEvent.1.leg")).not.toBeVisible();
					await expect(form.$getInputWidget("gatheringEvent.0.leg")).toHaveValue("");
				});
			});
		});
	});


	test.describe("gatherings", () => {
		let geocodingMock: Mock;

		test.beforeAll(async () => {
			geocodingMock = await form.setMockResponse("/coordinates/location");
		});

		test("is displayed", async () => {
			await expect(form.$locate("gatherings")).toBeVisible();
		});

		test("is empty", async () => {
			await expect(form.$locate("gatherings.0")).not.toBeVisible();
		});

		test("map is present", async () => {
			await expect($gatheringsMap).toBeVisible();
		});

		test("creating pointer on map creates gathering", async () => {
			await form.putMarkerToMap(); // Adds outside Finland so "country" field will appear for later test.

			await expect(form.$locate("gatherings.0")).toBeVisible();
		});

		test.describe("geocoding", () => {

			test.skip(!googleApiKey,"Google API key missing");

			test("starts and finishes after adding gathering", async () => {
				await expect(form.$locate("gatherings.0.country")).not.toBeVisible();
				await expect(form.getGeocoder().$spinner).toBeVisible();

				await geocodingMock.resolve(require("./mocks/coordinates.json"));
				await geocodingMock.remove();

				await expect(form.$locate("gatherings.0.country")).toBeVisible();
				await expect(form.getGeocoder().$spinner).not.toBeVisible();
			});


			test("adds country which is editable", async () => {
				await testWidget("gatherings.0.country");
			});

			test("adds biologicalProvince which is editable", async () => {
				await testWidget("gatherings.0.biologicalProvince");
			});

			test("adds municipality which is editable", async () => {
				await testWidget("gatherings.0.municipality");
			});
		});

		test("contains locality which is editable", async () => {
			await testWidget("gatherings.0.locality");
		});

		test("contains localityDescription which is editable", async () => {
			await testWidget("gatherings.0.localityDescription");
		});

		test("contains weather which is editable", async () => {
			await testWidget("gatherings.0.weather");
		});

		test("contains notes which is editable", async () => {
			await testWidget("gatherings.0.notes");
		});

		test("has additional fields button", async () => {
			await expect(form.getScopeField("gatherings.0").$button).toBeVisible();
		});

		test.describe("taxonCensus", () => {
			test("can be added from additional fields", async () => {
				const scopeField = form.getScopeField("gatherings.0");
				await scopeField.$button.click();
				await scopeField.$listItems.last().click();

				await expect(form.$locate("gatherings.0.taxonCensus")).toBeVisible();

				await $additionalsButton.click();

				await expect(scopeField.$listItems).not.toBeVisible();
			});

			test("can add items", async () => {
				await form.$locateButton("gatherings.0.taxonCensus", "add").click();
			});

			test("added item is focused", async () => {
				await expect(form.$getInputWidget("gatherings.0.taxonCensus.0.censusTaxonID")).toBeFocused();
			});

			test("added item is displayed and can be edited", async () => {
				await testWidget("gatherings.0.taxonCensus.0.censusTaxonID");
				await testWidget("gatherings.0.taxonCensus.0.taxonCensusType", "enum");
			});

			test("second added item is focused", async () => {
				await form.$locateButton("gatherings.0.taxonCensus", "add").click();

				await expect(form.$getInputWidget("gatherings.0.taxonCensus.1.censusTaxonID")).toBeFocused();
			});
		});


		test("add button works", async () => {
			await $gatheringAdd.click();

			await expect(form.$locate("gatherings.1")).toBeVisible();
		});

		test("map is empty for new gathering", async () => {
			await expect($gatheringsMap.locator(".vector-marker.leaflet-interactive")).toHaveCount(0);
		});

		test("items can be closed", async () => {
			await form.$locateAddition("gatherings.1", "panel").locator(".laji-form-clickable-panel-header").click();

			await expect(form.$locate("gatherings.1.units")).not.toBeVisible();
		});

		test("items can be opened", async () => {
			await form.$locateAddition("gatherings.1", "panel").locator(".laji-form-clickable-panel-header").click();

			expect(form.$locate("gatherings.1.units")).toBeVisible();
		});

		test("items can be deleted", async () => {
			await form.$locateButton("gatherings.1", "delete").click();
			await form.$locateButton("gatherings.1", "delete-confirm-yes", true).click();

			await expect(form.$locate("gatherings.1")).not.toBeVisible();
			await expect(form.$locateAddition("gatherings.1", "header")).not.toBeVisible();
		});

		test.describe("named place button", () => {
			let $addNPButton: Locator;
			let npChooser: NamedPlaceChooserPO;
			let npList: EnumWidgetPO;
			test.beforeAll(async () => {
				$addNPButton = form.$locateButton("gatherings", "addNamedPlace");
				npChooser = form.getNamedPlaceChooser();
				npList = npChooser.select;
			});

			test("not displayed before fetched", async () => {
				await expect($addNPButton).not.toBeVisible();
			});

			test("displayed when fetched", async () => {
				await npMock.resolve(require("./mocks/named-places.json"));
				await expect($addNPButton).toBeVisible();
			});

			test("click displays list", async () => {
				await $addNPButton.click();

				await expect(npList.$container).toBeVisible();
			});

			test("selecting from list displays map popup", async () => {
				await npList.openEnums();
				await npList.$enums.first().click();
			});

			test("map popup select btn click closes chooser modal", async () => {
				await npChooser.mapPopup.$useBtn.click();
			});

			test("np chooser modal closes after np selected or shows alert", async () => {
				await expect(npList.$container).not.toBeVisible();
			});

			test("new gathering is added", async () => {
				await expect(form.$locate("gatherings.1")).toBeVisible();
				await form.$locateButton("gatherings.1", "delete").click();
				await form.$locateButton("gatherings.1", "delete-confirm-yes", true).click();
			});
		});
	});

	test.describe("units", () => {

		test("is displayed", async () => {
			await expect(form.$locate("gatherings.0.units")).toBeVisible();
		});

		test("has one by default", async () => {
			await expect(form.$locate("gatherings.0.units.0")).toBeVisible();
		});

		test("can be added", async () => {
			await form.$locateButton("gatherings.0.units", "add").click();

			await expect(form.$locate("gatherings.0.units.1")).toBeVisible();
		});

		test("added is focused", async () => {
			await expect(form.$getInputWidget("gatherings.0.units.1.identifications.0.taxon")).toBeFocused();
		});

		test("first is shown as table row after activating second", async () => {
			expect(await form.$locate("gatherings.0.units.0").evaluate(e => e.tagName)).toBe("TR");
		});

		test("activating works for both", async () => {
			await form.$locate("gatherings.0.units.0").click();

			expect(await form.$locate("gatherings.0.units.0").evaluate(e => e.tagName)).toBe("DIV");
			expect(await form.$locate("gatherings.0.units.1").evaluate(e => e.tagName)).toBe("TR");

			await form.$locate("gatherings.0.units.1").click();

			expect(await form.$locate("gatherings.0.units.1").evaluate(e => e.tagName)).toBe("DIV");
			expect(await form.$locate("gatherings.0.units.0").evaluate(e => e.tagName)).toBe("TR");
		});

		test("can be deleted", async () => {
			await removeUnit(0, 1);

			await expect(form.$locate("gatherings.0.units.1")).not.toBeVisible();
		});

		test("first is active after deleting second", async () => {
			expect(await form.$locate("gatherings.0.units.0").evaluate(e => e.tagName)).toBe("DIV");
		});

		test("contains identifications.0.taxon", async () => {
			await expect(form.$locate("gatherings.0.units.0.identifications.0.taxon")).toBeVisible();
		});

		test("contains count which is editable", async () => {
			await testWidget("gatherings.0.units.0.count");
		});

		test("contains notes which is editable", async () => {
			await testWidget("gatherings.0.units.0.notes");
		});

		test("contains taxonConfidence which is editable", async () => {
			await testWidget("gatherings.0.units.0.taxonConfidence", "enum");
		});

		test("contains recordBasis which is editable", async () => {
			await testWidget("gatherings.0.units.0.recordBasis", "enum");
		});

		test("contains images", async () => {
			await expect(form.$locate("gatherings.0.units.0.images")).toBeVisible();
		});

		test("can open additionals chooser", async () => {
			const scopeField = form.getScopeField("gatherings.0.units.0");
			await expect(scopeField.$button).toBeVisible();
			const informalGroups = [1, 343, 232, 187];
			let mocks: Mock[] = [];
			for (let id of informalGroups) {
				mocks.push(await form.setMockResponse(`/informal-taxon-groups/MVL.${id}`));
			}

			await scopeField.$button.click();

			await expect(scopeField.modal.$container).toBeVisible();

			await expect(scopeField.modal.$loadingGroup.nth(1)).toBeVisible();

			for (let idx in informalGroups) {
				await mocks[idx].resolve({
					"id": informalGroups[idx],
					"name": "test"
				});
			}

			await expect(scopeField.modal.$loadingGroup).toHaveCount(0);
			await expect(scopeField.modal.$groupTitles.nth(1)).toHaveText("test");
		});

		test("can add additional fields", async () => {
			const scopeField = form.getScopeField("gatherings.0.units.0");

			await expect(form.$locate("gatherings.0.units.0.identifications.0.det")).not.toBeVisible();

			await expect(scopeField.$button).toBeVisible();

			const getFieldCount = () => form.$locate("gatherings.0.units.0").locator("input").count();
			const fieldCount = await getFieldCount();

			const $additionalItem = scopeField.modal.$listItems.nth(2);

			await expect(scopeField.modal.$container).toBeVisible();
			await expect($additionalItem).toBeVisible();

			await $additionalItem.click();
			await scopeField.modal.$close.click();

			await expect($additionalItem).not.toBeVisible();
			expect(await getFieldCount()).toBe(fieldCount + 1);
		});

		const getLocationChooserFor = (gatheringIdx: number, unitIdx: number) => form.getLocationChooser(`gatherings.${gatheringIdx}.units.${unitIdx}`);

		test("has location button", async () => {
			await expect(getLocationChooserFor(0, 0).$button).toBeVisible();
		});

		async function clickLocationButtonAndAddLocation(gatheringIdx: number, unitIdx: number) {
			const locationChooser = getLocationChooserFor(gatheringIdx, unitIdx);
			await locationChooser.$button.click();
			await expect(locationChooser.modal.$container).toBeVisible();

			await locationChooser.modal.map.clickAt(0, 0);
		}

		test("can add location", async () => {
			await clickLocationButtonAndAddLocation(0, 0);

			await expect($gatheringsMap.locator(".vector-marker.leaflet-interactive")).toHaveCount(2);
		});

		test("unit map modal hides after adding location", async () => {
			const locationChooser = getLocationChooserFor(0, 0);
			await expect(locationChooser.modal.$container).not.toBeVisible();
		});

		test("gatherings map shows unit with different color", async () => {
			await expect($$gatheringMarkerPaths).toHaveCount(2);
			const firstFill = await $$gatheringMarkerPaths.first().getAttribute("fill");
			const secondFill = await $$gatheringMarkerPaths.last().getAttribute("fill");

			expect(firstFill).not.toBe(secondFill);
		});

		test("hovering unit table row changes gathering map unit color", async () => {
			await form.$locateButton("gatherings.0.units", "add").click();

			const unitFill = await $$gatheringMarkerPaths.last().getAttribute("style");

			await form.$locate("gatherings.0.units.0").hover();

			const unitFillAfterLocationHover = await $$gatheringMarkerPaths.last().getAttribute("style");

			expect(unitFill).not.toBe(unitFillAfterLocationHover);

			await removeUnit(0, 1);
		});

		test("hovering location button displays location peeking map", async () => {
			await getLocationChooserFor(0, 0).$button.hover();

			await expect(getLocationChooserFor(0, 0).peeker.$map).toBeVisible();
		});

		test("location peeker shows data", async () => {
			const locationChooser = getLocationChooserFor(0, 0);
			await locationChooser.$button.hover();

			await expect(locationChooser.peeker.$markers).not.toHaveCount(0);

			const firstFill = await locationChooser.peeker.$markers.first().getAttribute("fill");
			const secondFill = await locationChooser.peeker.$markers.last().getAttribute("fill");

			expect(firstFill).not.toBe(secondFill);
		});

		test("can have location even if gathering doesn't have", async () => {
			await $gatheringAdd.click();
			await clickLocationButtonAndAddLocation(1, 0);

			await expect($$gatheringMarkerPaths).toHaveCount(1);

			await form.$locateButton("gatherings.1", "delete").click();
			await form.$locateButton("gatherings.1", "delete-confirm-yes", true).click();
		});

		test("choosing informal taxon group changes fields", async () => {
			await page.locator(".informal-taxon-group-chooser").click();

			await expect(form.$locate("gatherings.0.units.0.twitched")).not.toBeVisible();
			const $birdButton = page.locator(".MVL\\.1").locator("xpath=..").locator("button").last();

			await $birdButton.click();
			await expect(form.$locate("gatherings.0.units.0.twitched")).toBeVisible();
		});

		test("adding image in background", async () => {
			await form.$locateButton("gatherings.0.units", "add").click();
			const {resolve, remove} = await form.mockImageUpload("gatherings.0.units.1");
			await form.$locate("gatherings.0.units.0").locator("td").first().click();
			await resolve();
			await form.$locate("gatherings.0.units.1").locator("td").first().click();

			await expect(form.getImageArrayField("gatherings.0.units.1").$imgs).toHaveCount(1);
			await remove();
			await removeUnit(0, 1);
		});

		test("removing unit with image loading", async () => {
			await form.$locateButton("gatherings.0.units", "add").click();
			const {resolve, remove} = await form.mockImageUpload("gatherings.0.units.1");
			await form.$locate("gatherings.0.units.0").locator("td").first().click();
			await removeUnit(0, 1);
			await resolve();
			await remove();

			await expect(form.failedJobs.$container).not.toBeVisible();
		});
	});
});
