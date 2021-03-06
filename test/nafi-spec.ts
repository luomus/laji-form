import { Form, createForm, TaxonAutosuggestWidgetPOI } from "./test-utils";
import { protractor } from "protractor";

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
	let taxonAutosuggest: TaxonAutosuggestWidgetPOI;

	beforeAll(async () => {
		form = await createForm({id: "MHL.6"});
	});

	it("can add unit", async () => {
		await form.$locateButton("gatherings.0.units", "add").click();

		expect(await form.$locate("gatherings.0.units.121").isDisplayed()).toBe(true);
	});

	describe("selecting species name with mouse", () => {

		beforeAll(async () => {
			taxonAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.units.121.identifications.0.taxon");
		});

		it("selects suggestion value", async () => {
			const autocompleteMock = await form.setMockResponse("/autocomplete/taxon", false);
			await taxonAutosuggest.$input.sendKeys("kettu");
			await autocompleteMock.resolve(taxonAutocompleteResponse);
			await taxonAutosuggest.waitForSuggestionsToLoad();
			await taxonAutosuggest.$$suggestions.first().click();

			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kettu");

			await autocompleteMock.remove();
		});

		it("and is marked as suggested", async () => {
			expect(await taxonAutosuggest.isSuggested()).toBe(true);
		});

		it("and closes suggestion list", async () => {
			expect(await taxonAutosuggest.$suggestionsContainer.isPresent()).toBe(false);
		});
	});

	describe("selecting species name with keyboard navigation", () => {
		beforeAll(async () => {
			taxonAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.units.122.identifications.0.taxon");
		});

		it("works", async () => {
			await form.$locateButton("gatherings.0.units", "add").click();
			await taxonAutosuggest.$input.sendKeys("kettu");
			await taxonAutosuggest.waitForSuggestionsToLoad();
			await taxonAutosuggest.$input.sendKeys(protractor.Key.DOWN);
			await taxonAutosuggest.$input.sendKeys(protractor.Key.ENTER);

			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kettu");
		});

		it("and is marked as suggested", async () => {
			expect(await taxonAutosuggest.isSuggested()).toBe(true);
		});

		it("and closes suggestion list", async () => {
			expect(await taxonAutosuggest.$suggestionsContainer.isPresent()).toBe(false);
		});
	});
});
