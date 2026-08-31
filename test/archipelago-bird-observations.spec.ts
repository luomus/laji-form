import { test, expect, Page } from "@playwright/test";
import { createForm, DemoPageForm } from "./test-utils";

test.describe.configure({ mode: "serial" });

const wadersResponse = {
	results: [
		{
			"vernacularName": "meriharakka",
			"taxonSets": [
				"MX.taxonSetWaterbirdWaders",
				"MX.taxonSetArchipelagoWaders"
			],
			"scientificName": "Haematopus ostralegus",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.27459",
			"vernacularNameMultiLang": {
				"fi": "meriharakka",
				"sv": "strandskata",
				"en": "Eurasian Oystercatcher"
			}
		},
		{
			"vernacularName": "töyhtöhyyppä",
			"taxonSets": [
				"MVL.1201",
				"MX.taxonSetWaterbirdWaders",
				"MX.taxonSetArchipelagoWaders"
			],
			"scientificName": "Vanellus vanellus",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.27527",
			"vernacularNameMultiLang": {
				"fi": "töyhtöhyyppä",
				"sv": "tofsvipa",
				"en": "Northern Lapwing"
			}
		},
		{
			"vernacularName": "tylli",
			"taxonSets": [
				"MX.taxonSetWaterbirdWaders",
				"MX.taxonSetArchipelagoWaders"
			],
			"scientificName": "Charadrius hiaticula",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.27559",
			"vernacularNameMultiLang": {
				"fi": "tylli",
				"sv": "större strandpipare",
				"en": "Common Ringed Plover"
			}
		},
		{
			"vernacularName": "pikkutylli",
			"taxonSets": [
				"MX.taxonSetArchipelagoWaders",
				"MX.taxonSetWaterbirdWaders"
			],
			"scientificName": "Thinornis dubius",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.27562",
			"vernacularNameMultiLang": {
				"fi": "pikkutylli",
				"sv": "mindre strandpipare",
				"en": "Little Ringed Plover"
			}
		},
		{
			"vernacularName": "karikukko",
			"taxonSets": [
				"MX.taxonSetArchipelagoWaders"
			],
			"scientificName": "Arenaria interpres",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.27642",
			"vernacularNameMultiLang": {
				"fi": "karikukko",
				"sv": "roskarl",
				"en": "Ruddy Turnstone"
			}
		},
		{
			"vernacularName": "lapinsirri",
			"taxonSets": [
				"MX.taxonSetWaterbirdWaders",
				"MX.taxonSetArchipelagoWaders"
			],
			"scientificName": "Calidris temminckii",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.27689",
			"vernacularNameMultiLang": {
				"fi": "lapinsirri",
				"sv": "mosnäppa",
				"en": "Temminck's Stint"
			}
		},
		{
			"vernacularName": "rantasipi",
			"taxonSets": [
				"MX.taxonSetWaterbirdWaders",
				"MVL.1201",
				"MX.taxonSetBirdAtlasCommon",
				"MX.taxonSetArchipelagoWaders"
			],
			"scientificName": "Actitis hypoleucos",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.27634",
			"vernacularNameMultiLang": {
				"fi": "rantasipi",
				"sv": "drillsnäppa",
				"en": "Common Sandpiper"
			}
		},
		{
			"vernacularName": "punajalkaviklo",
			"taxonSets": [
				"MX.taxonSetWaterbirdWaders",
				"MX.taxonSetArchipelagoWaders"
			],
			"scientificName": "Tringa totanus",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.27620",
			"vernacularNameMultiLang": {
				"fi": "punajalkaviklo",
				"sv": "rödbena",
				"en": "Common Redshank"
			}
		},
		{
			"vernacularName": "taivaanvuohi",
			"taxonSets": [
				"MX.taxonSetBirdAtlasCommon",
				"MX.taxonSetWaterbirdWaders",
				"MX.taxonSetArchipelagoWaders"
			],
			"scientificName": "Gallinago gallinago",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.27666",
			"vernacularNameMultiLang": {
				"fi": "taivaanvuohi",
				"sv": "enkelbeckasin",
				"en": "Common Snipe"
			}
		}
	]
};

const egretsResponse = {
	results: [
		{
			"vernacularName": "jalohaikara",
			"taxonSets": [
				"MX.taxonSetWaterbirdWaders",
				"MX.taxonSetArchipelagoEgrets"
			],
			"scientificName": "Ardea alba",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.26105",
			"vernacularNameMultiLang": {
				"fi": "jalohaikara",
				"sv": "ägretthäger",
				"en": "Great Egret"
			}
		},
		{
			"vernacularName": "harmaahaikara",
			"taxonSets": [
				"MX.taxonSetWaterbirdWaders",
				"MX.taxonSetArchipelagoEgrets"
			],
			"scientificName": "Ardea cinerea",
			"informalTaxonGroups": [
				"MVL.1"
			],
			"id": "MX.26094",
			"vernacularNameMultiLang": {
				"fi": "harmaahaikara",
				"sv": "gråhäger",
				"en": "Grey Heron"
			}
		}
	]
};

test.describe("archipelago bird census observation form (MHL.1166)", () => {
	let page: Page;
	let form: DemoPageForm;

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
		await page.route("**/taxa**", route => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(wadersResponse)
			});
		});
		form = await createForm(page, { id: "MHL.1166", localFormData: true });
	});

	test("selecting a taxon set shows its units", async () => {
		await expect(page.getByText("taivaanvuohi")).not.toBeVisible();
		await page.locator(".checkbox-row > :nth-child(2) .checkbox-container input[value=\"true\"]").click();
		await expect(page.getByText("taivaanvuohi")).toBeVisible();
		await page.locator(".checkbox-row > :nth-child(2) .checkbox-container input[value=\"false\"]").click();
		await expect(page.getByText("taivaanvuohi")).not.toBeVisible();
	});

	test("setting unit as observed prevents removing its taxon set", async () => {
		await page.locator(".checkbox-row > :nth-child(2) .checkbox-container input[value=\"true\"]").click();
		await page.getByText("taivaanvuohi").click();
		const statusWidget = form.$getEnumWidget("gatherings_0_units_8_observationStatus");
		await statusWidget.openEnums();
		await statusWidget.$$enums.filter({ hasText: "C - Observed, not counted" }).click();
		await page.locator(".checkbox-row > :nth-child(2) .checkbox-container input[value=\"false\"]").click();
		await expect(page.getByText("meriharakka")).toBeVisible();
	});
});

test.describe("archipelago bird census observation form (MHL.1166) - select all", () => {
	let page: Page;
	let form: DemoPageForm;

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
		await page.route("**/taxa**", route => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify({ results: [...wadersResponse.results, ...egretsResponse.results] })
			});
		});
		form = await createForm(page, { id: "MHL.1166", localFormData: true });
	});

	test("pressing select all shows taxa of all sets", async () => {
		await expect(page.getByText("taivaanvuohi")).not.toBeVisible();
		await expect(page.getByText("jalohaikara")).not.toBeVisible();
		await page.getByText("Valitse kaikki").click();
		await expect(page.getByText("taivaanvuohi")).toBeVisible();
		await expect(page.getByText("jalohaikara")).toBeVisible();
	});
});
