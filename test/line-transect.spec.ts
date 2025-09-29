import { test, expect, Locator, Page } from "@playwright/test";
import { DemoPageForm, Mock, createForm, filterUUIDs, getFocusedElement } from "./test-utils";

test.describe.configure({mode: "serial"});

test.describe("Line transect (MHL.1)", () => {

	let page: Page;
	let form: DemoPageForm;

	let unitAutocompleteMock: Mock;
	let taxonAutocompleteMock: Mock;

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

	let $shortHandForIdx: (idx: number, _idx: number) => Locator;

	test.beforeAll(async ({browser}) => {
		page = await browser.newPage();
		form = await createForm(page, {id: "MHL.1", localFormData: true});
		$shortHandForIdx = (g, u) => form.$getInputWidget(`gatherings.${g}.units.${u}.shortHandText`);

		unitAutocompleteMock = await form.setMockResponse("/autocomplete/unit", false);
		taxonAutocompleteMock = await form.setMockResponse("/autocomplete/taxa", false);
	});

	test("shorthand unit is shown", async () => {
		await expect($shortHandForIdx(0, 0)).toBeVisible();
	});

	test("shorthand unit expands code after typing code", async () => {
		await $shortHandForIdx(0, 0).fill("llx");
		await $shortHandForIdx(0, 0).press("Enter");

		await unitAutocompleteMock.resolve(unitAutocompleteResponse);

		await expect(form.$locate("gatherings.0.units.0.identifications.0.taxon")).toBeVisible();
	});

	test("next unit is automatically added", async () => {
		await expect($shortHandForIdx(0, 1)).toBeVisible();
	});

	test("unit formData matches response", async () => {
		const formData = await form.getChangedData();

		expect(filterUUIDs(formData.gatherings[0].units[0])).toEqual(unitAutocompleteResponse.payload.unit);
		expect(formData.gatherings[0].units[0].identifications_0_taxon).toBe(undefined);
		expect(formData.gatherings[0].units[0].unitFact_autocompleteSelectedTaxonID).toBe(undefined);
		expect(formData.gatherings[0].units[0].unitFact_lineTransectObsType).toBe(undefined);
		expect(formData.gatherings[0].units[0].unitFact_lineTransectRouteFieldType).toBe(undefined);
	});

	test("next unit is focused", async () => {
		await expect($shortHandForIdx(0, 1)).toBeFocused();
	});

	test("prev unit is focused after keyboard navigation", async () => {
		await getFocusedElement(page).press("Alt+ArrowUp");
		await expect(form.$getInputWidget("gatherings.0.units.0.identifications.0.taxon")).toBeFocused();
	});

	test("next gathering is focused after keyboard navigation", async () => {
		await getFocusedElement(page).press("Alt+ArrowRight");
		await expect($shortHandForIdx(1, 0)).toBeFocused();
	});

	test("when prev focused taxon autocomplete finishes, data isn't in FlatField format", async () => {
		await taxonAutocompleteMock.resolve(taxonAutocompleteResponse);
		const formData = await form.getChangedData();

		expect(filterUUIDs(formData.gatherings[0].units[0])).toEqual(unitAutocompleteResponse.payload.unit);
		expect(formData.gatherings[0].units[0].identifications_0_taxon).toBe(undefined);
	});
});
