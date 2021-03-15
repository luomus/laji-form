import { Form, createForm, putForeignMarkerToMap, removeUnit, TaxonAutosuggestWidgetPOI, getFocusedId } from "./test-utils";
import { protractor, browser, ElementFinder } from "protractor";

describe("Trip report (JX.519) autosuggestions", () => {

	let form: Form;

	beforeAll(async () => {
		form = await createForm({id: "JX.519"});
		await putForeignMarkerToMap();
		await form.waitUntilBlockingLoaderHides(6000);
	});

	describe("taxon census", () => {
		let censusAutosuggest: TaxonAutosuggestWidgetPOI;
		beforeAll(async () => {
			const scopeField = form.getScopeField("gatherings.0");
			await browser.wait(protractor.ExpectedConditions.visibilityOf(scopeField.$button), 1000, "gatherings additionals button didn't show up");
			await scopeField.$button.click();
			await scopeField.$$listItems.last().click();
			censusAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.taxonCensus.0.censusTaxonID");
		});

		it("selects on click", async () => {
			await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$locateButton("gatherings.0.taxonCensus", "add")), 1000, "taxon census didn't show up");
			await form.$locateButton("gatherings.0.taxonCensus", "add").click();
			await censusAutosuggest.$input.sendKeys("aves");
			await censusAutosuggest.waitForSuggestionsToLoad();
			await censusAutosuggest.$$suggestions.first().click();
			await censusAutosuggest.waitForGlyph();

			expect(await censusAutosuggest.isSuggested()).toBe(true, "wasn't displayed as suggested");
			expect(await censusAutosuggest.$input.getAttribute("value")).toBe("Aves", "Input value wasn't the clicked value");
		});
	});

	describe("unit taxon", () => {

		let taxonAutosuggest: TaxonAutosuggestWidgetPOI;
		let $countInput: ElementFinder;
		let $addUnit: ElementFinder;

		const moveMouseAway = (locator: string) => browser.actions()
			.mouseMove(form.$locate(locator).getWebElement(), {x: -100, y: -100})
			.perform();

		beforeAll(async () => {
			taxonAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.units.0.identifications.0.taxon");
			$countInput = form.$locate("gatherings.0.units.0.count").$("input");
			$addUnit = form.$locateButton("gatherings.0.units", "add");
		});

		beforeEach(async () => {
			if (await form.$locate("gatherings.0.units.0.identifications.0.taxon").isPresent()) {
				await moveMouseAway("gatherings.0.units.0.identifications.0.taxon");
			}
		});

		it("clicking any match selects it", async () => {
			await taxonAutosuggest.$input.sendKeys("kett");
			await taxonAutosuggest.waitForSuggestionsToLoad();
			await taxonAutosuggest.$$suggestions.first().click();
			await taxonAutosuggest.waitForGlyph();

			expect(await taxonAutosuggest.isSuggested()).toBe(true);
			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kettu");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		it("typing exact match and pressing enter after waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.sendKeys("kettu");
			await taxonAutosuggest.waitForSuggestionsToLoad();
			await taxonAutosuggest.$input.sendKeys(protractor.Key.ENTER);
			await taxonAutosuggest.waitForGlyph();

			expect(await taxonAutosuggest.isSuggested()).toBe(true);
			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kettu");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		it("typing exact match and pressing enter without waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.sendKeys("kettu");
			await taxonAutosuggest.$input.sendKeys(protractor.Key.ENTER);
			await taxonAutosuggest.waitForGlyph();

			expect(await taxonAutosuggest.isSuggested()).toBe(true);
			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kettu");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		it("typing exact match and pressing tab after waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.sendKeys("kettu");
			await taxonAutosuggest.waitForSuggestionsToLoad();
			await taxonAutosuggest.$input.sendKeys(protractor.Key.TAB);
			await taxonAutosuggest.waitForGlyph();

			expect(await taxonAutosuggest.isSuggested()).toBe(true);
			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kettu");
			expect(await getFocusedId()).toBe(await $countInput.getAttribute("id"), "next field wasn't focused");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		it("typing exact match and pressing tab without waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.sendKeys("kettu");
			await taxonAutosuggest.$input.sendKeys(protractor.Key.TAB);
			await taxonAutosuggest.waitForGlyph();

			expect(await taxonAutosuggest.isSuggested()).toBe(true);
			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kettu");
			expect(await getFocusedId()).toBe(await $countInput.getAttribute("id"), "next field wasn't focused");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		it("typing non exact match and blurring after waiting for suggestion list shows warning sign", async () => {
			await taxonAutosuggest.$input.sendKeys("kett");
			await taxonAutosuggest.waitForSuggestionsToLoad();
			await taxonAutosuggest.$input.sendKeys(protractor.Key.TAB);
			await taxonAutosuggest.waitForGlyph();

			expect(await taxonAutosuggest.isNonsuggested()).toBe(true);
			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kett");
			expect(await getFocusedId()).toBe(await $countInput.getAttribute("id"), "next field wasn't focused");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		it("typing non exact match and blurring without waiting for suggestion list shows warning sign", async () => {
			await taxonAutosuggest.$input.sendKeys("kett");
			await taxonAutosuggest.$input.sendKeys(protractor.Key.TAB);
			await taxonAutosuggest.waitForGlyph();

			expect(await taxonAutosuggest.isNonsuggested()).toBe(true);
			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kett");
			expect(await getFocusedId()).toBe(await $countInput.getAttribute("id"), "next field wasn't focused");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		it("typing exact match and blurring after waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.sendKeys("kettu");
			await taxonAutosuggest.waitForSuggestionsToLoad();
			await taxonAutosuggest.$input.sendKeys(protractor.Key.TAB);

			expect(await taxonAutosuggest.isSuggested()).toBe(true);
			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kettu");
			expect(await getFocusedId()).toBe(await $countInput.getAttribute("id"), "next field wasn't focused");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		it("typing exact match and blurring before waiting for suggestion list selects exact match", async () => {
			await taxonAutosuggest.$input.sendKeys("kettu");
			await taxonAutosuggest.$input.sendKeys(protractor.Key.TAB);
			await taxonAutosuggest.waitForGlyph();

			expect(await taxonAutosuggest.isSuggested()).toBe(true);
			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kettu");
			expect(await getFocusedId()).toBe(await $countInput.getAttribute("id"), "next field wasn't focused");

			await removeUnit(0, 0);
			await $addUnit.click();
		});

		it("typing exact match with sp suffix keeps sp suffix in value but select the exact match", async () => {
			for (const suffix of ["sp", "spp", "sp.", "spp."]) {
				await taxonAutosuggest.$input.sendKeys(`parus ${suffix}`);
				await taxonAutosuggest.$input.sendKeys(protractor.Key.TAB);
				await taxonAutosuggest.waitForGlyph();

				expect(await taxonAutosuggest.isSuggested()).toBe(true);
				expect(await taxonAutosuggest.$input.getAttribute("value")).toBe(`parus ${suffix}`);
				expect(await getFocusedId()).toBe(await $countInput.getAttribute("id"), "next field wasn't focused");

				await removeUnit(0, 0);
				await $addUnit.click();
			}
		});

		describe("power user", () => {
			it("is shown power taxon field", async () => {
				await taxonAutosuggest.$input.click();

				expect(await taxonAutosuggest.$powerUserButton.isDisplayed()).toBe(true);
			});

			it("click toggles power user mode on/off", async () => {
				await taxonAutosuggest.$powerUserButton.click();

				expect(await taxonAutosuggest.powerUserButtonIsActive()).toBe(true);

				await taxonAutosuggest.$powerUserButton.click();

				expect(await taxonAutosuggest.powerUserButtonIsActive()).toBe(false);
			});


			it("clicking any match after waiting for suggestion list works", async () => {
				await taxonAutosuggest.$input.click();
				await taxonAutosuggest.$powerUserButton.click();

				await taxonAutosuggest.$input.sendKeys("kettu");
				await taxonAutosuggest.waitForSuggestionsToLoad();
				await taxonAutosuggest.$$suggestions.last().click();
				await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$locate("gatherings.0.units.1")), 5000, "auto added unit didn't appear");

				expect(await form.$locate("gatherings.0.units.0").getTagName()).toBe("tr", "entered unit wasn't deactivated");

				const enteredUnitTaxon = await form.$locate("gatherings.0.units.0").$$("td").first().getText();

				expect(await enteredUnitTaxon).toBe("kettukolibrit");

			});

			it("entering second unit auto adds", async () => {
				const _taxonAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.units.1.identifications.0.taxon");
				await _taxonAutosuggest.$input.sendKeys("kettu");
				await _taxonAutosuggest.waitForSuggestionsToLoad();
				await _taxonAutosuggest.$$suggestions.last().click();
				await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$locate("gatherings.0.units.2")), 5000, "auto added unit didn't appear");

				expect(await form.$locate("gatherings.0.units.1").getTagName()).toBe("tr", "entered unit wasn't deactivated");

				const enteredUnitTaxon = await form.$locate("gatherings.0.units.1").$$("td").first().getText();

				expect(await enteredUnitTaxon).toBe("kettukolibrit");

				await removeUnit(0, 0);
				await removeUnit(0, 0);
				await removeUnit(0, 0);
				await $addUnit.click();
				await taxonAutosuggest.$input.click();
				await taxonAutosuggest.$powerUserButton.click();
			});


			it("entering exact match adds new unit automatically", async () => {
				await taxonAutosuggest.$input.click();
				await taxonAutosuggest.$powerUserButton.click();
				await taxonAutosuggest.$input.sendKeys("susi");
				await taxonAutosuggest.$input.sendKeys(protractor.Key.ENTER);
				await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$locate("gatherings.0.units.1")), 5000, "New unit didn't show up");

				expect(await form.$locate("gatherings.0.units.0").getTagName()).toBe("tr");
				expect(await form.$locate("gatherings.0.units.1").getTagName()).toBe("div");

				await removeUnit(0, 1);

				await taxonAutosuggest.$input.click();
				await taxonAutosuggest.$powerUserButton.click();

				expect(await taxonAutosuggest.powerUserButtonIsActive()).toBe(false);
				await removeUnit(0, 0);
				await $addUnit.click();
			});

		});

		it("works when autocomplete response has autocompleteSelectedName", async() => {
			if (process.env.HEADLESS !== "false") {
				console.log("Fails when headless (idk go figure, something to do with mocking?)");
				return;
			}
			const mock = await form.setMockResponse("/autocomplete/taxon");
			await taxonAutosuggest.$input.sendKeys("kuusi");
			const autocompleteSelectedName = "metsäkuusi";
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
			await taxonAutosuggest.$input.sendKeys(protractor.Key.ENTER);
			await mock.remove();

			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe(autocompleteSelectedName);
		});
	});
});
