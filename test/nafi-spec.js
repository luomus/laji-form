const { createForm } = require("./test-utils.js");

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

	let form;


	beforeAll(async () => {
		form = await createForm({id: "MHL.6"});
	});

	it("can add unit", async () => {
		await form.$locateButton("gatherings.0.units", "add").click();
		expect(await form.$locate("gatherings.0.units.121").isDisplayed()).toBe(true);
	});

	it("can enter species name for new unit", async () => {
		const autocompleteMock = await form.setMockResponse("/autocomplete/taxon", false);
		const unitLocator = "gatherings.0.units.121.identifications.0.taxon";
		const $unit = await form.$getInputWidget(unitLocator);
		await $unit.sendKeys("kettu");
		await autocompleteMock.resolve(taxonAutocompleteResponse);
		await browser.wait(protractor.ExpectedConditions.visibilityOf(form.$locate(unitLocator).$(".rw-list")), 5000, "Suggestion list timeout");
		const $$taxonSuggestions = form.$locate(unitLocator).$$(".rw-list-option");
		await $$taxonSuggestions.first().click();
		expect(await $unit.getAttribute("value")).toBe("kettu");
		await autocompleteMock.remove();
	});
});
