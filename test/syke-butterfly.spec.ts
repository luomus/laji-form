import { test, expect, Locator } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";

test.describe.configure({ mode: "serial" });

test.describe("SYKE butterfly form (MHL.59)", () => {
	let form: DemoPageForm;

	let $firstUnitsAdd: Locator;
	let $secondUnitsAdd: Locator;
	let $gatheringsAdd: Locator;

	test.beforeAll(async ({browser}) => {
		const formData = {
			"gatherings": [
				{
					"section": 1,
					"units": []
				},
				{
					"units": []
				}
			]
		};
		form = await createForm(await browser.newPage(), {id: "MHL.59", formData});
		const $$addButtons = form.$locate("gatherings.0.units").locator("button");
		$firstUnitsAdd = $$addButtons.nth(0);
		$secondUnitsAdd = $$addButtons.nth(1);
		$gatheringsAdd = form.$locateButton("gatherings", "add");
	});

	test("has gatherings", async () => {
		await expect(form.$locate("gatherings")).toBeVisible();
	});

	test("has one gathering by default", async () => {
		await expect(form.$locate("gatherings.0")).toBeVisible();
	});

	test("has gatherings add", async () => {
		await expect($gatheringsAdd).toBeVisible();
	});

	test("has first unit add", async () => {
		await expect($firstUnitsAdd).toBeVisible();
	});

	test("has second unit add", async () => {
		expect($secondUnitsAdd).toBeVisible();
	});

	test.describe("adding unit to first group", () => {
		test("works", async () => {
			await $firstUnitsAdd.click();

			await expect(form.$locate("gatherings.0.units.0.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.0.individualCount")).toBeVisible();
		});

		test("autofocuses", async () => {
			await expect(form.$getInputWidget("gatherings.0.units.0.identifications.0.taxonVerbatim")).toBeFocused();
		});
	});

	test.describe("adding unit to second group", () => {
		test("works", async () => {
			await $secondUnitsAdd.click();

			await expect(form.$locate("gatherings.0.units.0.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.0.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.individualCount")).toBeVisible();
		});

		test("autofocuses", async () => {
			await expect(form.$getInputWidget("gatherings.0.units.1.identifications.0.taxonVerbatim")).toBeFocused();
		});
	});

	test.describe("adding new section", () => {
		test("works", async () => {
			await $gatheringsAdd.click();
			await form.$locateAddition("gatherings", "section-input").fill("2");
			await form.$locateAddition("gatherings", "section-input").press("Enter");

			await expect(form.$locate("gatherings.0.units.1.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.0.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.0.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.1.individualCount")).toBeVisible();
		});

		test("autofocuses", async () => {
			await expect(form.$getInputWidget("gatherings.1.gatheringFact.sykeButterFlyCensusWind")).toBeFocused();
		});
	});

	test.describe("adding unit to first group again", () => {
		test("works", async () => {
			await $firstUnitsAdd.click();

			await expect(form.$locate("gatherings.0.units.0.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.2.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.0.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.2.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.0.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.1.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.2.individualCount")).toBeVisible();
		});

		test("autofocuses", async () => {
			await expect(form.$getInputWidget("gatherings.0.units.1.identifications.0.taxonVerbatim")).toBeFocused();
		});
	});

	test.describe("adding unit to second group again", () => {
		test("works", async () => {
			await $secondUnitsAdd.click();

			await expect(form.$locate("gatherings.0.units.0.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.2.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.3.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.0.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.2.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.3.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.0.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.1.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.2.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.3.individualCount")).toBeVisible();
		});

		test("autofocuses", async () => {
			await expect(form.$getInputWidget("gatherings.0.units.3.identifications.0.taxonVerbatim")).toBeFocused();
		});
	});

	test.describe("adding new section again", () => {
		test("works", async () => {
			await $gatheringsAdd.click();
			await form.$locateAddition("gatherings", "section-input").fill("3");
			await form.$locateAddition("gatherings", "section-input").press("Enter");

			await expect(form.$locate("gatherings.0.units.0.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.2.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.3.identifications.0.taxonVerbatim")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.0.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.2.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.3.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.0.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.1.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.2.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.1.units.3.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.2.units.0.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.2.units.1.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.2.units.2.individualCount")).toBeVisible();
			await expect(form.$locate("gatherings.2.units.3.individualCount")).toBeVisible();
		});

		test("autofocuses", async () => {
			await expect(form.$getInputWidget("gatherings.2.gatheringFact.sykeButterFlyCensusWind")).toBeFocused();
		});
	});

	test("removing new section works", async () => {
		const gatheringsLength = (await form.getChangedData()).gatherings.length;
		await form.$locateButton("gatherings.0", "delete").click();
		const formData = await form.getChangedData();

		expect(formData.gatherings.length).not.toBe(gatheringsLength);
		expect(formData.gatherings[0].section).toBe(2);
		expect(formData.gatherings[formData.gatherings.length - 1].section).toBe(undefined);
	});
});
