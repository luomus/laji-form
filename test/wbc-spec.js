const { createForm } = require("./test-utils.js");

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
});
