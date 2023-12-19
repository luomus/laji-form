import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm, TaxonAutosuggestWidgetPOI } from "./test-utils";

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

test.describe.configure({mode: "serial"});

test.describe("NAFI (MHL.6)", () => {

	let form: DemoPageForm;

	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage(), {id: "MHL.6"});
	});

	test("can add unit", async () => {
		await form.$locateButton("gatherings.0.units", "add").click();

		await expect(form.$locate("gatherings.0.units.121")).toBeVisible();
	});

	test.describe("selecting species name with mouse", () => {
		let taxonAutosuggest: TaxonAutosuggestWidgetPOI;

		test.beforeAll(async () => {
			taxonAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.units.121.identifications.0.taxon");
		});

		test("selects suggestion value", async () => {
			const autocompleteMock = await form.setMockResponse("/autocomplete/taxon", false);
			await taxonAutosuggest.$input.fill("kettu");
			await autocompleteMock.resolve(taxonAutocompleteResponse);
			await taxonAutosuggest.$suggestions.first().click();

			expect(await taxonAutosuggest.$input.getAttribute("value")).toBe("kettu");

			await autocompleteMock.remove();
		});

		test("and is marked as suggested", async () => {
			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
		});

		test("and closes suggestion list", async () => {
			await expect(taxonAutosuggest.$suggestionsContainer).not.toBeVisible();
		});
	});

	test.describe("selecting species name with keyboard navigation", () => {
		let taxonAutosuggest: TaxonAutosuggestWidgetPOI;

		test.beforeAll(async () => {
			taxonAutosuggest = form.getTaxonAutosuggestWidget("gatherings.0.units.122.identifications.0.taxon");
		});

		test("works", async () => {
			await form.$locateButton("gatherings.0.units", "add").click();
			await taxonAutosuggest.$input.fill("kettu");
			await taxonAutosuggest.$input.press("ArrowDown");
			await taxonAutosuggest.$input.press("Enter");

			await expect(taxonAutosuggest.$input).toHaveValue("kettu");
		});

		test("and is marked as suggested", async () => {
			await expect(taxonAutosuggest.$suggestedGlyph).toBeVisible();
		});

		test("and closes suggestion list", async () => {
			await expect(taxonAutosuggest.$suggestionsContainer).not.toBeVisible();
		});
	});
});
