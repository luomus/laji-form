import { createForm } from "./test-utils.js";

describe("WBC (MHL.3)", () => {
	let form;

	it("navigate to form", async () => {
		form = await createForm({id: "MHL.3", localFormData: true});
	});

	it("taxon census has aves", async () => {
		const formData = await form.getPropsData();

		expect(formData.gatherings[0].taxonCensus[0].censusTaxonID).toBe("MX.37580");
	});

	it("taxon census has correct values when yes is selected", async () => {
		const widget = await form.$getCheckboxWidget("gatherings.0.taxonCensus");
		await widget.click();

		const formData = await form.getChangedData();

		expect(formData.gatherings[0].taxonCensus.length).toBe(2);
		expect(formData.gatherings[0].taxonCensus[0].censusTaxonID).toBe("MX.37580");
		expect(formData.gatherings[0].taxonCensus[1].censusTaxonID).toBe("MX.37612");
	});

	it("taxon census has correct values when no is selected", async () => {
		const widget = await form.$getCheckboxWidget("gatherings.0.taxonCensus");
		await widget.click();

		const formData = await form.getChangedData();

		expect(formData.gatherings[0].taxonCensus.length).toBe(1);
		expect(formData.gatherings[0].taxonCensus[0].censusTaxonID).toBe("MX.37580");
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
