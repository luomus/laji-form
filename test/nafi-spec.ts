import { Form, createForm } from "./test-utils";
import { browser, protractor } from "protractor";

const taxonAutocompleteResponse = [{
	"key": "MX.46587",
	"value": "kettu",
	"payload": {
		"matchingName": "kettu",
		"informalTaxonGroups": [
			{
				"id": "MVL.2",
				"name": "Nisäkkäät"
			}
		],
		"scientificName": "Vulpes vulpes",
		"scientificNameAuthorship": "(Linnaeus, 1758)",
		"taxonRankId": "MX.species",
		"matchType": "exactMatches",
		"cursiveName": true,
		"finnish": true,
		"species": true,
		"nameType": "MX.vernacularName",
		"vernacularName": "kettu"
	}
}];

describe("NAFI (MHL.6)", () => {

	let form: Form;


	beforeAll(async () => {
		form = await createForm({id: "MHL.6"});
	});

	it("can add unit", async () => {
		await form.$locateButton("gatherings.0.units", "add").click();

		expect(await form.$locate("gatherings.0.units.121").isDisplayed()).toBe(true);
	});

	describe("selecting species name with mouse", () => {
		const unitLocator = "gatherings.0.units.121.identifications.0.taxon";

		it("selects scientific name", async () => {
			const autocompleteMock = await form.setMockResponse("/autocomplete/taxon", false);
			const $unitInput = await form.$getInputWidget(unitLocator);
			await $unitInput.sendKeys("kettu");
			await autocompleteMock.resolve(taxonAutocompleteResponse);
			await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$locate(unitLocator).$(".rw-list")), 5000, "Suggestion list timeout");
			const $$taxonSuggestions = form.$locate(unitLocator).$$(".rw-list-option");

			await $$taxonSuggestions.first().click();

			expect(await $unitInput.getAttribute("value")).toBe("Vulpes vulpes");

			await autocompleteMock.remove();
		});

		it("and is marked as suggested", async () => {
			const $unit = form.$locate(unitLocator);

			expect(await $unit.$(".glyphicon-ok").isDisplayed()).toBe(true);
		});

		it("and closes suggestion list", async () => {
			const $unit = form.$locate(unitLocator);

			expect(await $unit.$(".rw-list").isPresent()).toBe(false);
		});
	});

	describe("selecting species name with keyboard navigation", () => {
		const unitLocator = "gatherings.0.units.122.identifications.0.taxon";

		it("works", async () => {
			await form.$locateButton("gatherings.0.units", "add").click();
			const $unit = await form.$getInputWidget(unitLocator);
			await $unit.sendKeys("kettu");
			await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$locate(unitLocator).$(".rw-list")), 5000, "Suggestion list timeout");
			await $unit.sendKeys(protractor.Key.DOWN);
			await $unit.sendKeys(protractor.Key.ENTER);

			expect(await $unit.getAttribute("value")).toBe("Vulpes vulpes");
		});

		it("and is marked as suggested", async () => {
			const $unit = form.$locate(unitLocator);

			expect(await $unit.$(".glyphicon-ok").isDisplayed()).toBe(true);
		});

		it("and closes suggestion list", async () => {
			const $unit = form.$locate(unitLocator);

			expect(await $unit.$(".rw-list").isPresent()).toBe(false);
		});
	});
});
