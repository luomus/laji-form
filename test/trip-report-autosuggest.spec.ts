import { test, expect, Locator, Page } from "@playwright/test";
import { DemoPageForm, createForm, TaxonAutosuggestWidgetPOI, getFocusedElement, getRemoveUnit, Mock } from "./test-utils";

test.describe.configure({mode: "serial"});

test.describe("Trip report (JX.519) autosuggestions", () => {

	let page: Page;
	let form: DemoPageForm;
	let removeUnit: (g: number, u: number) => Promise<void>;

	test.beforeAll(async ({browser}) => {
		page = await browser.newPage();
		form = await createForm(page, {id: "JX.519"});
		removeUnit = getRemoveUnit(page);
		await form.putMarkerToMap();
	});

	test.describe("observers", () => {
		test("when two unknown and 1st is removed, the autosuggest input value updated to the value of the 1st", async () => {
			 // TableField has problems, so ids here are erratic but correct
			const $deleteObserver = form.$locateButton("gatheringEvent.0", "delete");
			const $addObserver = form.$locateButton("gatheringEvent", "add");
			const observer1$ = form.$getInputWidget("gatheringEvent.0.leg");
			const observer2$ = form.$getInputWidget("gatheringEvent.1.leg");

			await $deleteObserver.click();
			await $addObserver.click();
			await $addObserver.click();

			await observer1$.fill("matti");
			await observer2$.fill("teppo");

			await $deleteObserver.click();

			await expect(observer1$).toHaveValue("teppo");
		});
	});

	test.describe("taxon census", () => {
		let censusAutosuggest: TaxonAutosuggestWidgetPOI;
		test.beforeAll(async () => {
			const scopeField = form.getScopeField("gatherings.0");
			await scopeField.$button.click();
			await scopeField.$$listItems.last().click();
			censusAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.taxonCensus.0.censusTaxonID");
		});

		test("selects on click", async () => {
			await form.$locateButton("gatherings.0.taxonCensus", "add").click();
			await censusAutosuggest.$input.fill("aves");
			await censusAutosuggest.$suggestions.first().click();

			await expect(censusAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(censusAutosuggest.$input).toHaveValue("Aves");
		});

		test("sets empty value undefined", async () => {
			await censusAutosuggest.$input.clear();
			await censusAutosuggest.$input.press("Tab");
			await expect(censusAutosuggest.$loadingSpinner).not.toBeVisible();
			expect((await form.getChangedData()).gatherings[0].taxonCensus[0].censusTaxonID).toBe(undefined);
		});
	});

	test.describe("unit taxon", () => {

		let taxonAutosuggest: TaxonAutosuggestWidgetPOI;
		let $addUnit: Locator;
		let mock: Mock; 

		test.beforeAll(async () => {
			taxonAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.units.0.identifications.0.taxon");
			$addUnit = form.$locateButton("gatherings.0.units", "add");
			mock = await form.setMockResponse("/autocomplete/taxon");
			await mock.resolve(require("./mock/autocomplete-taxon-kettu.json"));
		});

		test("clicking any match selects it", async () => {
			await taxonAutosuggest.$input.fill("kett");
			await taxonAutosuggest.$suggestions.first().click();

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match and pressing tab after waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.fill("kettu");
			await expect(taxonAutosuggest.$suggestions).toBeVisible();
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await getFocusedElement(page).press("Tab"); // Tab to get rid of toggler tooltip obscuring elements
			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match and pressing tab without waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.fill("kettu");
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await getFocusedElement(page).press("Tab"); // Tab to get rid of toggler tooltip obscuring elements
			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing non exact match and blurring after waiting for suggestion list shows warning sign", async () => {
			await taxonAutosuggest.$input.fill("kett");
			await expect(taxonAutosuggest.$suggestions).toBeVisible();
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$nonsuggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kett");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await getFocusedElement(page).press("Tab"); // Tab to get rid of toggler tooltip obscuring elements
			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing non exact match and blurring without waiting for suggestion list shows warning sign", async () => {
			await taxonAutosuggest.$input.fill("kett");
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$nonsuggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kett");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await getFocusedElement(page).press("Tab"); // Tab to get rid of toggler tooltip obscuring elements
			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match and blurring after waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.fill("kettu");
			await expect(taxonAutosuggest.$suggestions).toBeVisible();
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await getFocusedElement(page).press("Tab"); // Tab to get rid of toggler tooltip obscuring elements
			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match and blurring before waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.fill("kettu");
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await getFocusedElement(page).press("Tab"); // Tab to get rid of toggler tooltip obscuring elements
			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match with sp suffix keeps sp suffix in value but selects the exact match", async () => {
			await mock.remove();
			for (const suffix of ["sp", "spp", "sp.", "spp."]) {
				await taxonAutosuggest.$input.fill(`parus ${suffix}`);
				await taxonAutosuggest.$input.press("Tab");

				await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
				await expect(taxonAutosuggest.$input).toHaveValue(`parus ${suffix}`);
				await expect(taxonAutosuggest.$input).not.toBeFocused();

				await getFocusedElement(page).press("Tab"); // Tab to get rid of toggler tooltip obscuring elements
				await removeUnit(0, 0);
				await $addUnit.click();
			}
		});

		test.describe("power user", () => {
			test("is shown power taxon field", async () => {
				await expect(taxonAutosuggest.$powerUserButton).toBeVisible();
			});

			test("click toggles power user mode on/off", async () => {
				await taxonAutosuggest.$powerUserButton.click();

				await expect(taxonAutosuggest.$powerUserButton).toHaveClass(/active/);

				await taxonAutosuggest.$powerUserButton.click();

				await expect(taxonAutosuggest.$powerUserButton).not.toHaveClass(/active/);
			});


			test("clicking any match after waiting for suggestion list works", async () => {
				await taxonAutosuggest.$powerUserButton.click();

				await taxonAutosuggest.$input.fill("kettu");
				await expect(taxonAutosuggest.$suggestions.first()).toBeVisible();
				const lastText = await taxonAutosuggest.$suggestions.last().textContent();
				await taxonAutosuggest.$suggestions.last().click();
				await expect(form.$locate("gatherings.0.units.1")).toBeVisible();

				expect(await form.$locate("gatherings.0.units.0").evaluate(e => e.tagName)).toBe("TR");

				await expect(form.$locate("gatherings.0.units.0").locator("td").first()).toHaveText(lastText);
			});

			test("entering second unit auto adds", async () => {
				const _taxonAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.units.1.identifications.0.taxon");
				await _taxonAutosuggest.$input.fill("kettu");
				await expect(_taxonAutosuggest.$suggestions.first()).toBeVisible();
				const lastText = await _taxonAutosuggest.$suggestions.last().textContent();
				await _taxonAutosuggest.$suggestions.last().click();
				await expect(form.$locate("gatherings.0.units.2")).toBeVisible();

				expect(await form.$locate("gatherings.0.units.1").evaluate(e => e.tagName)).toBe("TR");

				await expect(form.$locate("gatherings.0.units.1").locator("td").first()).toHaveText(lastText);

				await removeUnit(0, 0);
				await removeUnit(0, 0);
				await removeUnit(0, 0);
				await $addUnit.click();
				await taxonAutosuggest.$powerUserButton.click();
			});


			test("entering exact match adds new unit automatically", async () => {
				await taxonAutosuggest.$powerUserButton.click();
				await taxonAutosuggest.$input.fill("susi");
				await taxonAutosuggest.$input.press("Tab");
				await expect(form.$locate("gatherings.0.units.1")).toBeVisible();

				expect(await form.$locate("gatherings.0.units.0").evaluate(e => e.tagName)).toBe("TR");
				expect(await form.$locate("gatherings.0.units.1").evaluate(e => e.tagName)).toBe("DIV");

				await removeUnit(0, 1);

				await taxonAutosuggest.$powerUserButton.click();

				await expect(taxonAutosuggest.$powerUserButton).not.toHaveClass(/active/);
				await removeUnit(0, 0);
				await $addUnit.click();
			});

		});

		test("works when autocomplete response has autocompleteSelectedName", async() => {
			const mockKuusi = await form.setMockResponse("/autocomplete/taxon");
			await taxonAutosuggest.$input.fill("kuusi");
			const autocompleteSelectedName = "foobar";
			await mockKuusi.resolve([{
				"key": "MX.37812",
				"value": "kuusi",
				autocompleteSelectedName,
				"payload": {
					"matchingName": "kuusi",
					"informalTaxonGroups": [
						{
							"id": "MVL.343",
							"name": "Putkilokasvit"
						}
					],
					"scientificName": "Picea abies",
					"scientificNameAuthorship": "(L.) H. Karst.",
					"taxonRankId": "MX.species",
					"matchType": "exactMatches",
					"cursiveName": true,
					"finnish": true,
					"species": true,
					"nameType": "MX.obsoleteVernacularName",
					"vernacularName": "metsäkuusi"
				}
			}]);

			await expect(taxonAutosuggest.$suggestions.first()).toBeVisible();
			await taxonAutosuggest.$input.press("Tab");
			await mockKuusi.remove();

			await expect(taxonAutosuggest.$input).toHaveValue(autocompleteSelectedName);
			expect((await form.getChangedData()).gatherings[0].units[0].identifications[0].taxon).toBe(autocompleteSelectedName);
		});
	});
});
