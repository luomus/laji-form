const { navigateToForm, lajiFormLocate, createForm, getFocusedId, filterUUIDs } = require("./test-utils.js");

describe("Line transect (MHL.1)", () => {

	let form;
	let $taxon;

	let unitAutocompleteMock, taxonAutocompleteMock;

	const unitAutocompleteResponse = {
		"key": "llx",
		"value": "llx",
		"payload": {
			"unit": {
				"shortHandText": "llx",
				"identifications": [
					{
						"taxon": "Luscinia luscinia"
					}
				],
				"informalTaxonGroups": [
					"MVL.1"
				],
				"unitFact": {
					"autocompleteSelectedTaxonID": "MX.32819",
					"lineTransectObsType": "MY.lineTransectObsTypeSong",
					"lineTransectRouteFieldType": "MY.lineTransectRouteFieldTypeOuter"
				},
				"pairCount": 1,
				"individualCount": 1
			},
			"interpretedFrom": {
				"taxon": "LL",
				"type": "X"
			}
		}
	};

	const taxonAutocompleteResponse = [
		{
			"key": "MX.32819",
			"value": "Luscinia luscinia",
			"payload": {
				"matchingName": "Luscinia luscinia",
				"informalTaxonGroups": [
					{
						"id": "MVL.1",
						"name": "Linnut"
					}
				],
				"scientificName": "Luscinia luscinia",
				"scientificNameAuthorship": "(Linnaeus, 1758)",
				"taxonRankId": "MX.species",
				"matchType": "exactMatches",
				"cursiveName": true,
				"finnish": true,
				"species": true,
				"nameType": "MX.scientificName",
				"vernacularName": "satakieli"
			}
		}
	];

	beforeAll(async () => {
		form = await createForm({id: "MHL.1", localFormData: true});
		$taxon = form.$locate("gatherings.0.units.0.identifications.0.taxon");

		unitAutocompleteMock = await form.setMockResponse("/autocomplete/unit", false);
		taxonAutocompleteMock = await form.setMockResponse("/autocomplete/taxon", false);
	});

	it("form rendered something", async () => {
		$taxon = form.$locate("gatherings.0.units.0.identifications.0.taxon");
	});

	const $shortHandForIdx = (idx, _idx) =>  $(`#root_gatherings_${idx}_units_${_idx}_shortHandText`);
	const $shorthand = $shortHandForIdx(0, 0);

	it("shorthand unit is shown", async () => {
		expect(await $shorthand.isDisplayed()).toBe(true);
	});
	

	it("shorthand unit expands code after typing code", async () => {
		function waitUntilShorthandShowsSchema() {
			return browser.wait(protractor.ExpectedConditions.presenceOf($taxon), 5000, "Code reading timeout");
		}

		await $shorthand.sendKeys("llx");
		await $shorthand.sendKeys(protractor.Key.ENTER);

		await unitAutocompleteMock.resolve(unitAutocompleteResponse);

		await waitUntilShorthandShowsSchema();

		expect(await $taxon.isDisplayed()).toBe(true);
	});

	it("next unit is automatically added", async () => {
		expect(await $shortHandForIdx(0, 1).isDisplayed()).toBe(true);
	});

	it("unit formData matches response", async () => {
		const formData = await form.getChangedData();
		expect(filterUUIDs(formData.gatherings[0].units[0])).toEqual(unitAutocompleteResponse.payload.unit);
		expect(formData.gatherings[0].units[0].identifications_0_taxon).toBe(undefined);
		expect(formData.gatherings[0].units[0].unitFact_autocompleteSelectedTaxonID).toBe(undefined);
		expect(formData.gatherings[0].units[0].unitFact_lineTransectObsType).toBe(undefined);
		expect(formData.gatherings[0].units[0].unitFact_lineTransectRouteFieldType).toBe(undefined);
	});

	it("next unit is focused", async () => {
		expect(await getFocusedId() === await $shortHandForIdx(0, 1).getAttribute("id")).toBe(true);
	});

	it("prev unit is focused after keyboard navigation", async () => {
		await browser.driver.switchTo().activeElement().sendKeys(protractor.Key.chord(protractor.Key.ALT, protractor.Key.UP));
		expect(await getFocusedId() === await form.$getInputWidget("gatherings.0.units.0.identifications.0.taxon").getAttribute("id")).toBe(true);
	});

	it("next gathering is focused after keyboard navigation", async () => {
		await browser.driver.switchTo().activeElement().sendKeys(protractor.Key.chord(protractor.Key.ALT, protractor.Key.RIGHT));
		expect(await getFocusedId() === await await $shortHandForIdx(1, 0).getAttribute("id")).toBe(true);
	});

	it("when prev focused taxon autocomplete finishes, data isn't in FlatField format", async () => {
		await taxonAutocompleteMock.resolve(taxonAutocompleteResponse);
		const formData = await form.getChangedData();
		expect(filterUUIDs(formData.gatherings[0].units[0])).toEqual(unitAutocompleteResponse.payload.unit);
		expect(formData.gatherings[0].units[0].identifications_0_taxon).toBe(undefined);
	});
});
