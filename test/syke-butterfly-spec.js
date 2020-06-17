import { createForm, getFocusedId } from "./test-utils.js";

describe("SYKE butterfly form (MHL.59)", () => {
	let form;

	let $firstUnitsAdd;
	let $secondUnitsAdd;
	let $gatheringsAdd;

	it("navigate to form", async () => {
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
		form = await createForm({id: "MHL.59", formData});
		const $$addButtons = await form.$locate("gatherings.0.units").$$("button");
		$firstUnitsAdd = $$addButtons[0];
		$secondUnitsAdd = $$addButtons[1];
		$gatheringsAdd = form.$locateButton("gatherings", "add");
		//$lastGatheringsUnitsAdd = form.$locateButton("gatherings.1.units", "add");
	});

	it("has gatherings", async () => {
		await form.$locate("gatherings");
	});

	it("has one gathering by default", async () => {
		await form.$locate("gatherings.0");
	});

	it("has gatherings add", async () => {
		expect(await $gatheringsAdd.isDisplayed()).toBe(true);
	});

	it("has first unit add", async () => {
		expect(await $firstUnitsAdd.isDisplayed()).toBe(true);
	});

	it("has second unit add", async () => {
		expect(await $secondUnitsAdd.isDisplayed()).toBe(true);
	});

	describe("adding unit to first group", () => {
		it("works", async () => {
			await $firstUnitsAdd.click();

			expect(await form.$locate("gatherings.0.units.0.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.0.individualCount").isDisplayed()).toBe(true);
		});

		it("autofocuses", async () => {
			expect(await getFocusedId() === await form.$getInputWidget("gatherings.0.units.0.identifications.0.taxonVerbatim").getAttribute("id")).toBe(true);
		});
	});

	describe("adding unit to second group", () => {
		it("works", async () => {
			await $secondUnitsAdd.click();
			expect(await form.$locate("gatherings.0.units.0.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.1.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.0.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.1.individualCount").isDisplayed()).toBe(true);
		});

		it("autofocuses", async () => {
			expect(await getFocusedId() === await form.$getInputWidget("gatherings.0.units.1.identifications.0.taxonVerbatim").getAttribute("id")).toBe(true);
		});
	});

	describe("adding new section", () => {
		it("works", async () => {
			await $gatheringsAdd.click();
			await form.$locateAddition("gatherings", "section-input").sendKeys("2");
			await form.$locateAddition("gatherings", "section-input").sendKeys(protractor.Key.ENTER);

			expect(await form.$locate("gatherings.0.units.1.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.0.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.1.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.0.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.1.individualCount").isDisplayed()).toBe(true);
		});

		// Works really but test suite fails
		//it("autofocuses", async () => {
		//	expect(await getFocusedId() === await form.$getInputWidget("gatherings.1.gatheringFact.sykeButterFlyCensusWind").getAttribute("id")).toBe(true);
		//});
	});

	describe("adding unit to first group again", () => {
		it("works", async () => {
			await $firstUnitsAdd.click();

			expect(await form.$locate("gatherings.0.units.0.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.1.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.2.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.0.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.1.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.2.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.0.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.1.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.2.individualCount").isDisplayed()).toBe(true);
		});

		it("autofocuses", async () => {
			expect(await getFocusedId() === await form.$getInputWidget("gatherings.0.units.1.identifications.0.taxonVerbatim").getAttribute("id")).toBe(true);
		});
	});

	describe("adding unit to second group again", () => {
		it("works", async () => {
			await $secondUnitsAdd.click();

			expect(await form.$locate("gatherings.0.units.0.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.1.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.2.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.3.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.0.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.1.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.2.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.3.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.0.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.1.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.2.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.3.individualCount").isDisplayed()).toBe(true);
		});

		it("autofocuses", async () => {
			expect(await getFocusedId() === await form.$getInputWidget("gatherings.0.units.3.identifications.0.taxonVerbatim").getAttribute("id")).toBe(true);
		});
	});

	describe("adding new section again", () => {
		it("works", async () => {
			await $gatheringsAdd.click();
			await form.$locateAddition("gatherings", "section-input").sendKeys("3");
			await form.$locateAddition("gatherings", "section-input").sendKeys(protractor.Key.ENTER);

			expect(await form.$locate("gatherings.0.units.0.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.1.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.2.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.3.identifications.0.taxonVerbatim").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.0.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.1.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.2.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.0.units.3.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.0.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.1.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.2.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.1.units.3.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.2.units.0.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.2.units.1.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.2.units.2.individualCount").isDisplayed()).toBe(true);
			expect(await form.$locate("gatherings.2.units.3.individualCount").isDisplayed()).toBe(true);
		});

		// Works really but test suite fails
		//it("autofocuses", async () => {
		//	expect(await getFocusedId() === await form.$getInputWidget("gatherings.2.gatheringFact.sykeButterFlyCensusWind").getAttribute("id")).toBe(true);
		//});
	});

	it ("removing new section works", async () => {
		const gatheringsLength = (await form.getChangedData()).gatherings.length;
		await form.$locateButton("gatherings.0", "delete").click();
		const formData = await form.getChangedData();

		expect(formData.gatherings.length).not.toBe(gatheringsLength);
		expect(formData.gatherings[0].section).toBe(2);
		expect(formData.gatherings[formData.gatherings.length - 1].section).toBe(undefined);
	});
});
