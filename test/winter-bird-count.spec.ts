import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";

test.describe.configure({ mode: "serial" });

test.describe("WBC (MHL.3)", () => {
	let form: DemoPageForm;

	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage(), {id: "MHL.3", localFormData: true, isAdmin: true});
	});

	test("taxon census has aves", async () => {
		const formData = await form.getPropsData();

		expect(formData.gatherings[0].taxonCensus[0].censusTaxonID).toBe("MX.37580");
	});

	test("taxon census has correct values when yes is selected", async () => {
		const widget = form.getBooleanWidget("gatherings.0.taxonCensus");
		await widget.$true.click();

		const formData = await form.getChangedData();

		expect(formData.gatherings[0].taxonCensus.length).toBe(2);
		expect(formData.gatherings[0].taxonCensus[0].censusTaxonID).toBe("MX.37580");
		expect(formData.gatherings[0].taxonCensus[1].censusTaxonID).toBe("MX.37612");
	});

	test("taxon census has correct values when no is selected", async () => {
		const widget = form.getBooleanWidget("gatherings.0.taxonCensus");
		await widget.$false.click();

		const formData = await form.getChangedData();

		expect(formData.gatherings[0].taxonCensus.length).toBe(1);
		expect(formData.gatherings[0].taxonCensus[0].censusTaxonID).toBe("MX.37580");
	});

	test("added existing user is shown as suggested", async () => {
		// ID for button is broken, should be gatheringEvent.leg?
		await form.$locateButton("gatheringEvent", "add").click();

		const autosuggest = form.getTaxonAutosuggestWidget("gatheringEvent.1.leg");
		await autosuggest.$input.fill("unit");
		await autosuggest.$suggestions.first().click();

		await expect(autosuggest.$getGlyph(".glyphicon-user")).toBeVisible();
	});

	test.describe("namedPlaceNotes", () => {
		test("renders", async() => {
			await expect(form.$locate("gatherings.0.namedPlaceNotes")).toBeVisible();
		});

		test("is textarea", async() => {
			await expect(form.$getTextareaWidget("gatherings.0.namedPlaceNotes")).toBeVisible();
		});

		test("updates", async() => {
			await form.updateValue(form.$getTextareaWidget("gatherings.0.namedPlaceNotes"), "test");

			await expect(form.$getTextareaWidget("gatherings.0.namedPlaceNotes")).toHaveValue("test");
			expect((await form.getChangedData()).gatheringEvent.namedPlaceNotes).toBe("test");
		});

		test("doesn't spill into gatherings", async () => {
			expect((await form.getChangedData()).gatherings[0]).not.toContain("namedPlaceNotes");
		});
	});

	test("added existing user ID is shown", async () => {
		const $input = form.$getInputWidget("gatheringEvent.1.leg");

		await expect($input).toHaveValue(/Unit.+ \(MA\.\d+\)/);
	});

	test("entering descriptionBiotopeF doesn't clear observerCount", async ({browser}) => {
		form = await createForm(await browser.newPage(), {id: "MHL.3", localFormData: true, isAdmin: true});
		const $descriptionBiotopeF = form.$locate("gatherings.0.gatheringFact.descriptionBiotopeF");
		const $otherBiotopeFCheckbox = $descriptionBiotopeF.locator(".checkbox label input").nth(2);
		await $otherBiotopeFCheckbox.click();
		await $otherBiotopeFCheckbox.click();
		await $otherBiotopeFCheckbox.click();
		const formData = await form.getChangedData();

		expect(formData.gatherings[0].gatheringFact.observerCount).toBe(1);
	});
});
