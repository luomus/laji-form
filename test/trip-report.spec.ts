import { test, expect, Page, Locator } from "@playwright/test";
import { DemoPageForm, createForm, Mock, NamedPlaceChooserPO, lajiFormLocator, getRemoveUnit } from "./test-utils";
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

	await expect(form.$locate(path)).toBeVisible();
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
		await expect(widget.$$enums.first()).toBeVisible();
		$secondOption = widget.$$enums.nth(1);
		$otherOptionThanActive = (await $secondOption.getAttribute("class")).includes("rw-state-selected")
			? widget.$$enums.first()
			: $secondOption;
		await $otherOptionThanActive.click();
		break;
	case "date":
		widget = form.getDateWidget(path).$input;
		await widget.click();
		await widget.fill("1.1.2019");
		await widget.press("Tab");
		break;
	default:
		widget = form.$getInputWidget(path);
		await widget.fill("1");
		await widget.press("Tab");
		break;
	}
	expect(beforeChange).not.toEqual(parsePointer(await form.getChangedData(), path));
};

test.describe.configure({mode: "serial"});

test.describe("Trip report (JX.519)", () => {

	let page: Page;
	let form: DemoPageForm;
	let testWidget: (path: string, type?: string) => Promise<void>;
	let removeUnit: (g: number, u: number) => Promise<void>;

	test.beforeAll(async ({browser}) => {
		page = await browser.newPage();
		form = await createForm(page, {id: "JX.519"});
		testWidget = _testWidget(form);
		removeUnit = getRemoveUnit(page);
	});

	test.describe("gatheringEvent", () => {

		test("container is displayed", async () => {
			await expect(form.$locate("gatheringEvent")).toBeVisible();
		});

		test.describe("contains", () => {

			test("secureLevel which is editable", async () => {
				await expect(form.$locate("gatheringEvent").locator(lajiFormLocator("secureLevel"))).toBeVisible();
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
				await expect(form.$locate("gatheringEvent").locator(lajiFormLocator("keywords"))).toBeVisible();
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
					await page.locator(".table-field .row").nth(1).locator("button").click(); // eslint-disable-line protractor/use-first-last

					await expect(form.$locate("gatheringEvent.1.leg")).not.toBeVisible();
					expect(await form.$getInputWidget("gatheringEvent.0.leg").getAttribute("value")).toBe("");
				});
			});
		});
	});

	test.describe("gatherings", () => {

		let geocodingMock: Mock;

		test.beforeAll(async () => {
			geocodingMock = await form.setMockResponse("/coordinates/location", false);
		});

		test("is displayed", async () => {
			await expect(form.$locate("gatherings")).toBeVisible();
		});

		test("is empty", async () => {
			await expect(form.$locate("gatherings.0")).not.toBeVisible();
		});

		test("map is present", async () => {
			await expect(form.$locate("gatherings").locator(".laji-map")).toBeVisible();
		});

		test("creating pointer on map creates gathering", async () => {
			await form.putMarkerToMap();

			await expect(form.$locate("gatherings.0")).toBeVisible();
		});

		test.describe("geocoding", () => {

			test("starts and finishes after adding gathering", async () => {
				await expect(form.getGeocoder("gatherings.0").$spinner).toBeVisible();
				await geocodingMock.resolve(require("./mock/geocoding.json"));
				await expect(form.getGeocoder("gatherings.0").$spinner).not.toBeVisible();
			});

			test("adds country which is editable", async () => {
				await testWidget("gatherings.0.country");
			});

			test("adds administrativeProvince which is editable", async () => {
				await testWidget("gatherings.0.administrativeProvince");
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

		// const $additionalsButton = $("#root_gatherings_0-additionals");

		test("has additional fields button", async () => {
			await expect(form.getScopeField("gatherings.0").$button).toBeVisible();
		});

		test.describe("taxonCensus", () => {
			test("can be added from additional fields", async () => {
				const scopeField = form.getScopeField("gatherings.0");
				await scopeField.$button.click();
				await scopeField.$$listItems.last().click();

				await expect(form.$locate("gatherings.0.taxonCensus")).toBeVisible();

				await scopeField.$button.click();

				await expect(scopeField.$$listItems.last()).not.toBeVisible();
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
			await form.$locateButton("gatherings", "add").click();

			await expect(form.$locate("gatherings.1")).toBeVisible();
		});

		test("map is empty for new gathering", async () => {
			await expect(form.$locate("gatherings").locator(".vector-marker.leaflet-interactive")).not.toBeVisible();
		});

		test("items can be closed", async () => {
			await form.$locateAddition("gatherings.1", "panel").locator(".laji-form-clickable-panel-header").click();

			await expect(form.$locate("gatherings.1.units")).not.toBeVisible();
		});

		test("items can be opened", async () => {
			await form.$locateAddition("gatherings.1", "panel").locator(".laji-form-clickable-panel-header").click();

			await expect(form.$locate("gatherings.1.units")).toBeVisible();
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

			test.beforeAll(async () => {
				$addNPButton = form.$locateButton("gatherings", "addNamedPlace");
				npChooser = form.getNamedPlaceChooser();
			});

			test("click displays list", async () => {
				await $addNPButton.click();

				await expect(npChooser.select.$container).toBeVisible();
			});

			test("selecting from list displays map popup", async () => {
				await npChooser.select.openEnums();
				await npChooser.select.$$enums.first().click();
			});

			test("map popup select btn click closes chooser modal", async () => {
				await npChooser.mapPopup.$useBtn.click();
			});

			test("np chooser modal closes after np selected or shows alert", async () => {
				await expect(npChooser.select.$container).not.toBeVisible();
			});

			test("new gathering is added", async () => {
				await expect(form.$locate("gatherings.1")).toBeVisible();
				await form.$locateButton("gatherings.1", "delete").click();
				await form.$locateButton("gatherings.1", "delete-confirm-yes", true).click();
			});
		});
	});

	test.describe("units", () => {

		let $$gatheringMarkerPaths: Locator;
		let $unitAdd: Locator;
		let scopeField: ReturnType<DemoPageForm["getScopeField"]>;

		test.beforeAll(async () => {
			$$gatheringMarkerPaths = form.$locate("gatherings").locator(".vector-marker path");
			$unitAdd = form.$locateButton("gatherings.0.units", "add");

			scopeField = form.getScopeField("gatherings.0.units.0");
		});

		test("is displayed", async () => {
			await expect(form.$locate("gatherings.0.units")).toBeVisible();
		});

		test("has one by default", async () => {
			await expect(form.$locate("gatherings.0.units.0")).toBeVisible();
		});

		test("can be added", async () => {
			await $unitAdd.click();

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

		// const $additionalsButton = $("#root_gatherings_0_units_0-additionals");
		// const $modal = $(".scope-field-modal");

		test("can open additionals chooser", async () => {
			await expect(scopeField.$button).toBeVisible();
			const informalGroups = [1, 343, 232, 187];
			let mocks = [];
			for (let id of informalGroups) {
				mocks.push(await form.setMockResponse(`/informal-taxon-groups/MVL.${id}`));
			}

			await scopeField.$button.click();

			await expect(scopeField.modal.$$loadingGroups.first()).toBeVisible();

			for (let idx in informalGroups) {
				await mocks[idx].resolve({
					"id": informalGroups[idx],
					"name": "test"
				});
			}

			await expect(scopeField.modal.$$loadingGroups).not.toBeVisible();
			await expect(scopeField.modal.$$groupTitles.nth(1)).toHaveText("test");
		});

		test("can add additional fields", async () => {
			await expect(form.$locate("gatherings.0.units.0.identifications.0.det")).not.toBeVisible();

			await expect(scopeField.$button).toBeVisible();

			const getFields = () => form.$locate("gatherings.0.units.0").locator("input");
			const fieldCount = await getFields().count();

			await expect(scopeField.modal.$container).toBeVisible();
			await expect(scopeField.modal.$$listItems.nth(1)).toBeVisible();

			await scopeField.modal.$$listItems.nth(1).click();
			await scopeField.modal.$close.click();

			await expect(scopeField.modal.$$listItems.nth(1)).not.toBeVisible();
			await expect(getFields()).toHaveCount(fieldCount + 1);
		});

		test("has location button", async () => {
			await expect(form.getLocationChooser("gatherings.0.units.0").$button).toBeVisible();
		});

		async function clickLocationButtonAndAddLocation(gatheringIdx: number, unitIdx: number) {
			const locationChooser = form.getLocationChooser(`gatherings.${gatheringIdx}.units.${unitIdx}`);
			locationChooser.$button.click();
			await locationChooser.modal.map.drawMarker();
		}

		test("can add location", async () => {
			await clickLocationButtonAndAddLocation(0, 0);

			await expect(form.$locate("gatherings").locator(".laji-map .vector-marker.leaflet-interactive")).toHaveCount(2);
		});

		test("unit map modal hides after adding location", async () => {
			await expect(form.getLocationChooser("gatherings.0.units.0").modal.$container).not.toBeVisible();
		});

		test("gatherings map shows unit with different color", async () => {
			expect(await $$gatheringMarkerPaths.count()).toBe(2);
			const firstFill = await $$gatheringMarkerPaths.first().getAttribute("fill");
			const secondFill = await $$gatheringMarkerPaths.last().getAttribute("fill");

			expect(firstFill).not.toBe(secondFill);
		});

		test("hovering unit table row changes gathering map unit color", async () => {
			await $unitAdd.click();

			const unitFill = await $$gatheringMarkerPaths.last().getAttribute("style");

			await form.$locate("gatherings.0.units.0").hover();

			const unitFillAfterLocationHover = await $$gatheringMarkerPaths.last().getAttribute("style");

			expect(unitFill).not.toBe(unitFillAfterLocationHover);

			await removeUnit(0, 1);
		});

		test("hovering location button displays location peeking map", async () => {
			await form.getLocationChooser("gatherings.0.units.0").$button.hover();

			await expect(form.getLocationChooser("gatherings.0.units.0").peeker.$map).toBeVisible();
		});

		test("location peeker shows data", async () => {
			const locationChooser = form.getLocationChooser("gatherings.0.units.0");
			await locationChooser.$button.hover();

			await expect(locationChooser.peeker.$$markers).not.toHaveCount(0);

			const firstFill = await locationChooser.peeker.$$markers.first().getAttribute("fill");
			const secondFill = await locationChooser.peeker.$$markers.last().getAttribute("fill");

			expect(firstFill).not.toBe(secondFill);
		});

		test("can have location even if gathering doesn't have", async () => {
			await form.$locateButton("gatherings", "add").click();
			await clickLocationButtonAndAddLocation(1, 0);

			expect(await $$gatheringMarkerPaths.count()).toBe(1);

			await form.$locateButton("gatherings.1", "delete").click();
			await form.$locateButton("gatherings.1", "delete-confirm-yes", true).click();
		});

		test("choosing informal taxon group changes fields", async () => {
			await page.locator(".informal-taxon-group-chooser").click();

			const getFields = () => form.$locate("gatherings.0.units.0").locator("input");
			const fieldCount = await getFields().count();

			const $birdButton = page.locator(".MVL\\.1").locator("xpath=..").locator("button").last();
			await expect(page.locator(".MVL\\.1")).toBeVisible();

			await $birdButton.click();

			await expect(getFields()).not.toHaveCount(fieldCount);
		});

		test("adding image in background", async () => {
			await $unitAdd.click();
			const {resolve, remove} = await form.mockImageUpload("gatherings.0.units.1");
			await form.$locate("gatherings.0.units.0").locator("td").first().click();
			await resolve();
			await form.$locate("gatherings.0.units.1").locator("td").first().click();

			expect(await form.getImageArrayField("gatherings.0.units.1").$$imgs.count()).toBe(1);
			await remove();
			await removeUnit(0, 1);
		});

		test("removing unit with image loading", async () => {
			await $unitAdd.click();
			const {resolve, remove} = await form.mockImageUpload("gatherings.0.units.1");
			await form.$locate("gatherings.0.units.0").locator("td").first().click();
			await removeUnit(0, 1);
			await resolve();
			await remove();

			await expect(form.failedJobs.$container).not.toBeVisible();
		});
	});
});
