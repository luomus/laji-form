import { test, expect, Locator } from "@playwright/test";
import { createForm, TaxonAutosuggestWidgetPO, getRemoveUnit, DemoPageForm } from "./test-utils";

test.describe("Trip report (JX.519) autosuggestions", () => {

	let form: DemoPageForm;
	let removeUnit: (gatheringIdx: number, unitIdx: number) => Promise<void>;

	test.beforeAll(async ({browser}) => {
		const page = await browser.newPage();
		form = await createForm(page, {id: "JX.519"});
		await form.putMarkerToMap();
		removeUnit = getRemoveUnit(page);
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

			expect(await observer1$.getAttribute("value")).toBe("teppo");
		});
	});

	test.describe("taxon census", () => {
		let censusAutosuggest: TaxonAutosuggestWidgetPO;
		test.beforeAll(async () => {
			const scopeField = form.getScopeField("gatherings.0");
			await scopeField.$button.click();
			await scopeField.$listItems.last().click();
			censusAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.taxonCensus.0.censusTaxonID");
		});

		test("selects on click", async () => {
			await form.$locateButton("gatherings.0.taxonCensus", "add").click();
			await censusAutosuggest.$input.fill("aves");
			await censusAutosuggest.$suggestions.first().click();

			await expect(censusAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(censusAutosuggest.$input).toHaveValue("Aves");
		});
	});

	test.describe("unit taxon", () => {

		test.describe.configure({ mode: "serial" });

		let taxonAutosuggest: TaxonAutosuggestWidgetPO;
		let $addUnit: Locator;

		test.beforeAll(async () => {
			taxonAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.units.0.identifications.0.taxon");
			$addUnit = form.$locateButton("gatherings.0.units", "add");
		});

		test("clicking any match selects it", async () => {
			await taxonAutosuggest.$input.fill("kett");
			const text = await taxonAutosuggest.$suggestions.first().textContent();
			await taxonAutosuggest.$suggestions.first().click();

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue(text as string);

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match and pressing enter after waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.fill("kettu");
			await taxonAutosuggest.$input.press("Enter");

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match and pressing enter without waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.fill("kettu");
			await taxonAutosuggest.$input.press("Enter");

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match and pressing tab after waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.fill("kettu");
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match and pressing tab without waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.fill("kettu");
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing non exact match and blurring after waiting for suggestion list shows warning sign", async () => {
			await taxonAutosuggest.$input.fill("kett");
			await expect(taxonAutosuggest.$suggestions.first()).toBeVisible(); // Wait for suggestions to load
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$nonsuggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kett");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing non exact match and blurring without waiting for suggestion list shows warning sign", async () => {
			await taxonAutosuggest.$input.fill("kett");
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$nonsuggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kett");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match and blurring after waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.fill("kettu");
			await expect(taxonAutosuggest.$suggestions.first()).toBeVisible(); // Wait for suggestions to load
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match and blurring before waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.fill("kettu");
			await taxonAutosuggest.$input.press("Tab");

			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
			await expect(taxonAutosuggest.$input).toHaveValue("kettu");
			await expect(taxonAutosuggest.$input).not.toBeFocused();

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		test("typing exact match with sp suffix keeps sp suffix in value but select the exact match", async () => {
			for (const suffix of ["sp", "spp", "sp.", "spp."]) {
				await taxonAutosuggest.$input.fill(`parus ${suffix}`);
				await taxonAutosuggest.$input.press("Tab");

				await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
				await expect(taxonAutosuggest.$input).toHaveValue(`parus ${suffix}`);
				await expect(taxonAutosuggest.$input).not.toBeFocused();

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
				const text = await taxonAutosuggest.$suggestions.last().textContent();
				await taxonAutosuggest.$suggestions.last().click();

				expect(await form.$locate("gatherings.0.units.0").evaluate(e => e.tagName)).toBe("TR");

				await expect(form.$locate("gatherings.0.units.0").locator("td").first()).toHaveText(text as string);
			});

			test("entering second unit auto adds", async () => {
				const _taxonAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.units.1.identifications.0.taxon");
				await _taxonAutosuggest.$input.fill("kettu");
				const text = await _taxonAutosuggest.$suggestions.last().textContent();
				await _taxonAutosuggest.$suggestions.last().click();

				expect(await form.$locate("gatherings.0.units.1").evaluate(e => e.tagName)).toBe("TR");

				await expect(form.$locate("gatherings.0.units.1").locator("td").first()).toHaveText(text as string);

				await removeUnit(0, 0);
				await removeUnit(0, 0);
				await removeUnit(0, 0);
				await $addUnit.click();
				await taxonAutosuggest.$powerUserButton.click();
			});


			test("entering exact match adds new unit automatically", async () => {
				await taxonAutosuggest.$powerUserButton.click();
				await taxonAutosuggest.$input.fill("susi");
				await taxonAutosuggest.$input.press("Enter");

				await expect(form.$locate("gatherings.0.units.1")).toBeVisible(); // Wait for new unit to appear.
				expect(await form.$locate("gatherings.0.units.0").evaluate(e => e.tagName)).toBe("TR");
				expect(await form.$locate("gatherings.0.units.1").evaluate(e => e.tagName)).toBe("DIV");

				await removeUnit(0, 1);

				await taxonAutosuggest.$powerUserButton.click();

				await expect(taxonAutosuggest.$powerUserButton).not.toHaveClass(/active/);
				await removeUnit(0, 0);
				await $addUnit.click();
			});

		});

		test("works when autocomplete response has autocompleteSelectedName", async () => {
			const mock = await form.setMockResponse("/autocomplete/taxon");
			await taxonAutosuggest.$input.fill("kuusi");
			const autocompleteSelectedName = "foobar";
			await mock.resolve([{
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

			await expect(taxonAutosuggest.$suggestions).toHaveCount(1);
			await taxonAutosuggest.$input.press("Enter");
			await mock.remove();

			await expect(taxonAutosuggest.$input).toHaveValue(autocompleteSelectedName);
			expect((await form.getChangedData()).gatherings[0].units[0].identifications[0].taxon).toBe(autocompleteSelectedName);
		});
	});
});
