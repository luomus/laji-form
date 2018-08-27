import { navigateToForm, lajiFormLocate, waitUntilBlockingLoaderHides, putForeignMarkerToMap, removeUnit } from "./test-utils.js";

describe("Trip report (JX.519) autosuggestions", () => {

	it("navigate to form", async () => {
		await navigateToForm("JX.519");
		await putForeignMarkerToMap();
		await waitUntilBlockingLoaderHides(6000);
	});

	const $taxon = lajiFormLocate("gatherings.0.units.0.identifications.0.taxon")
	const $poweruserButton = $taxon.$(".power-user-addon");
	const $taxonInput = $taxon.$("input");

	const $okSign = $taxon.$(".glyphicon-ok");
	const $warningSign = $taxon.$(".glyphicon-warning-sign");
	const $taxonSuggestionList = $taxon.$(".rw-list");
	const $$taxonSuggestions = $taxon.$$(".rw-list-option");

	it("clicking any match selects it", async () => {
		await $taxonInput.sendKeys("kett");
		await browser.wait(protractor.ExpectedConditions.visibilityOf($taxonSuggestionList), 5000, "Suggestion list timeout");
		await $$taxonSuggestions.first().click();
		await browser.wait(protractor.ExpectedConditions.visibilityOf($okSign), 5000, "taxon tag glyph didn't show up");

		await expect($okSign.isDisplayed()).toBe(true);
		await expect($taxonInput.getAttribute("value")).toBe("kettu");

		await removeUnit(0, 0);
	});

	it("typing exact match and pressing enter after waiting for suggestion list selects exact match", async () => {
		await $taxonInput.sendKeys("kettu");
		await browser.wait(protractor.ExpectedConditions.visibilityOf($taxonSuggestionList), 5000, "Suggestion list timeout");
		await $taxonInput.sendKeys(protractor.Key.ENTER);
		await browser.wait(protractor.ExpectedConditions.visibilityOf($okSign), 5000, "taxon tag glyph didn't show up");

		await expect($okSign.isDisplayed()).toBe(true);
		await expect($taxonInput.getAttribute("value")).toBe("kettu");

		await removeUnit(0, 0);
	});

	it("typing exact match and pressing enter without waiting for suggestion list selects exact match", async () => {
		await $taxonInput.sendKeys("kettu");
		await $taxonInput.sendKeys(protractor.Key.ENTER);
		await browser.wait(protractor.ExpectedConditions.visibilityOf($okSign), 5000, "taxon tag glyph didn't show up");
		await expect($okSign.isDisplayed()).toBe(true);
		await expect($taxonInput.getAttribute("value")).toBe("kettu");

		await removeUnit(0, 0);
	});

	it("typing exact match and pressing tab after waiting for suggestion list selects exact match", async () => {
		await $taxonInput.sendKeys("kettu");
		await browser.wait(protractor.ExpectedConditions.visibilityOf($taxonSuggestionList), 5000, "Suggestion list timeout");
		await $taxonInput.sendKeys(protractor.Key.TAB);
		await browser.wait(protractor.ExpectedConditions.visibilityOf($okSign), 5000, "taxon tag glyph didn't show up");

		await expect($okSign.isDisplayed()).toBe(true);
		await expect($taxonInput.getAttribute("value")).toBe("kettu");

		await removeUnit(0, 0);
	});

	it("typing exact match and pressing tab without waiting for suggestion list selects exact match", async () => {
		await $taxonInput.sendKeys("kettu");
		await $taxonInput.sendKeys(protractor.Key.TAB);
		await browser.wait(protractor.ExpectedConditions.visibilityOf($okSign), 5000, "taxon tag glyph didn't show up");

		await expect($okSign.isDisplayed()).toBe(true);
		await expect($taxonInput.getAttribute("value")).toBe("kettu");

		await removeUnit(0, 0);
	});

	it("typing non exact match and blurring after waiting for suggestion list shows warning sign", async () => {
		await $taxonInput.sendKeys("kett");
		await browser.wait(protractor.ExpectedConditions.visibilityOf($taxonSuggestionList), 5000, "Suggestion list timeout");
		await $taxonInput.sendKeys(protractor.Key.TAB);
		await browser.wait(protractor.ExpectedConditions.visibilityOf($warningSign), 5000, "taxon warning glyph didn't show up");

		await expect($warningSign.isDisplayed()).toBe(true);
		await expect($taxonInput.getAttribute("value")).toBe("kett");

		await removeUnit(0, 0);
	});

	it("typing non exact match and blurring without waiting for suggestion list shows warning sign", async () => {
		await $taxonInput.sendKeys("kett");
		await $taxonInput.sendKeys(protractor.Key.TAB);
		await browser.wait(protractor.ExpectedConditions.visibilityOf($warningSign), 5000, "taxon warning glyph didn't show up");

		await expect($warningSign.isDisplayed()).toBe(true);
		await expect($taxonInput.getAttribute("value")).toBe("kett");

		await removeUnit(0, 0);
	});

	it("typing exact match and blurring after waiting for suggestion list selects exact match", async () => {
		await $taxonInput.sendKeys("kettu");
		await browser.wait(protractor.ExpectedConditions.visibilityOf($taxonSuggestionList), 5000, "Suggestion list timeout");
		await $taxonInput.sendKeys(protractor.Key.TAB);

		await expect($okSign.isDisplayed()).toBe(true);
		await expect($taxonInput.getAttribute("value")).toBe("kettu");

		await removeUnit(0, 0);
	});

	it("typing exact match and blurring before waiting for suggestion list selects exact match", async () => {
		await $taxonInput.sendKeys("kettu");
		await $taxonInput.sendKeys(protractor.Key.TAB);
		await browser.wait(protractor.ExpectedConditions.visibilityOf($okSign), 5000, "taxon tag glyph didn't show up");

		await expect($okSign.isDisplayed()).toBe(true);
		await expect($taxonInput.getAttribute("value")).toBe("kettu");

		await removeUnit(0, 0);
	});

	it("shows power user for taxon field", async () => {
		await $taxonInput.click();

		await expect($poweruserButton.isDisplayed()).toBe(true);
	});

	it("clicking power user button toggles power user mode on/off", async () => {
		await $poweruserButton.click();

		await expect($poweruserButton.getAttribute("class")).toContain("active");

		await $poweruserButton.click();

		await expect($poweruserButton.getAttribute("class")).not.toContain("active");
	});


	it("clicking any match after waiting for suggestion list works with power user mode", async () => {
		await $taxonInput.click();
		await $poweruserButton.click();

		await $taxonInput.sendKeys("kettu");
		await browser.wait(protractor.ExpectedConditions.visibilityOf($taxonSuggestionList), 5000, "Suggestion list timeout");
		await $$taxonSuggestions.last().click();
		await browser.wait(protractor.ExpectedConditions.visibilityOf(lajiFormLocate("gatherings.0.units.1")), 5000, "Suggestion list timeout");

		await expect(lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("tr");

		const enteredUnitTaxon = await lajiFormLocate("gatherings.0.units.0").$$("td").first().getText();

		await expect(enteredUnitTaxon).not.toBe("kettu");

		await removeUnit(0, 0);
		await removeUnit(0, 0);
	});


	it("entering exact match when power user mode is on adds new unit automatically", async () => {
		await $taxonInput.sendKeys("susi");
		await $taxonInput.sendKeys(protractor.Key.ENTER);
		await browser.wait(protractor.ExpectedConditions.visibilityOf(lajiFormLocate("gatherings.0.units.1")), 5000, "New unit didn't show up");

		await expect(lajiFormLocate("gatherings.0.units.0").getTagName()).toBe("tr");
		await expect(lajiFormLocate("gatherings.0.units.1").getTagName()).toBe("div");

		await removeUnit(0, 1);

		await $taxonInput.click();
		await $poweruserButton.click();

		await expect($poweruserButton.getAttribute("class")).not.toContain("active");
	});

});
