import { Form, createForm, updateValue } from "./test-utils";
import { protractor, browser } from "protractor";

describe("WBC (MHL.3)", () => {
	let form: Form;

	it("navigate to form", async () => {
		form = await createForm({id: "MHL.3", localFormData: true, isAdmin: true});
	});

	it("taxon census has aves", async () => {
		const formData = await form.getPropsData();

		expect(formData.gatherings[0].taxonCensus[0].censusTaxonID).toBe("MX.37580");
	});

	it("taxon census has correct values when yes is selected", async () => {
		const widget = form.getBooleanWidget("gatherings.0.taxonCensus");
		await widget.$true.click();

		const formData = await form.getChangedData();

		expect(formData.gatherings[0].taxonCensus.length).toBe(2);
		expect(formData.gatherings[0].taxonCensus[0].censusTaxonID).toBe("MX.37580");
		expect(formData.gatherings[0].taxonCensus[1].censusTaxonID).toBe("MX.37612");
	});

	it("taxon census has correct values when no is selected", async () => {
		const widget = form.getBooleanWidget("gatherings.0.taxonCensus");
		await widget.$false.click();

		const formData = await form.getChangedData();

		expect(formData.gatherings[0].taxonCensus.length).toBe(1);
		expect(formData.gatherings[0].taxonCensus[0].censusTaxonID).toBe("MX.37580");
	});

	it("added existing user is shown as suggested", async () => {
		// ID for button is broken, should be gatheringEvent.leg?
		await form.$locateButton("gatheringEvent", "add").click();
		const $field = form.$locate("gatheringEvent.1.leg");
		const $input = form.$getInputWidget("gatheringEvent.1.leg");
		await $input.sendKeys("unit");
		const $suggestionList = $field.$(".rw-list");
		const $$suggestions = $field.$$(".rw-list-option");
		await browser.wait(protractor.ExpectedConditions.visibilityOf($suggestionList), 5000, "Suggestion list timeout");
		await $$suggestions.first().click();
		await browser.wait(protractor.ExpectedConditions.invisibilityOf($field.$(".react-spinner")), 5000, "Field input spinner didn't leave");

		expect(await form.$locate("gatheringEvent.1.leg").$(".glyphicon-user").isDisplayed()).toBe(true);
	});

	describe("namedPlaceNotes", () => {
		it("renders", async() => {
			expect(await form.$locate("gatherings.0.namedPlaceNotes").isDisplayed()).toBe(true);
		});

		it("is textarea", async() => {
			expect(await form.$getTextareaWidget("gatherings.0.namedPlaceNotes").isDisplayed()).toBe(true);
		});

		it("updates", async() => {
			await updateValue(form.$getTextareaWidget("gatherings.0.namedPlaceNotes"), "test");

			expect(await form.$getTextareaWidget("gatherings.0.namedPlaceNotes").getAttribute("value")).toBe("test");
			expect((await form.getChangedData()).gatheringEvent.namedPlaceNotes).toBe("test");
		});

		it("doesn't spill into gatherings", async () => {
			expect((await form.getChangedData()).gatherings[0]).not.toContain("namedPlaceNotes");
		});
	});

	it("added existing user ID is shown", async () => {
		const $input = form.$getInputWidget("gatheringEvent.1.leg");

		expect(await $input.getAttribute("value")).toMatch(/Unit.+ \(MA\.\d+\)/);
	});

	it("entering descriptionBiotopeF doesn't clear observerCount", async () => {
		form = await createForm({id: "MHL.3", localFormData: true, isAdmin: true});
		const $descriptionBiotopeF = form.$locate("gatherings.0.gatheringFact.descriptionBiotopeF");
		const $otherBiotopeFCheckbox = $descriptionBiotopeF.$$(".checkbox label input").get(2);
		await $otherBiotopeFCheckbox.click();
		await $otherBiotopeFCheckbox.click();
		await $otherBiotopeFCheckbox.click();
		//await $descriptionBiotopeF.$("input.form-control").sendKeys("test");
		const formData = await form.getChangedData();

		expect(formData.gatherings[0].gatheringFact.observerCount).toBe(1);
	});
});
