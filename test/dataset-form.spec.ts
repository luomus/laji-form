import { test, expect, Locator } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";

test.describe("dataset form (MHL.731)", () => {
	let form: DemoPageForm;
	let nameInEnglishInput$: Locator;
	let nameInFinnishInput$: Locator;

	const uiSchemaContext = {
		defaultPersonsResponsible: "Test, User"
	};

	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage(), {id: "MHL.731"});
		await form.setState({ uiSchemaContext });
		nameInEnglishInput$ = form.$locate("datasetName_en").locator("input");
		nameInFinnishInput$ = form.$locate("datasetName_fi").locator("input");
	});

	test("owner can be selected", async () => {
		const autosuggest = form.getAutosuggestWidget("owner");
		await autosuggest.$input.fill("ict team");
		await autosuggest.$suggestions.first().click();
		await expect(autosuggest.$input).toHaveValue("University of Helsinki, Finnish Museum of Natural History, General Services Unit, ICT Team");
		const formData = await form.getChangedData();
		expect(formData.owner).toBe("MOS.3100");
	});

	test("sets correct name to dataset when adding a name in one language", async () => {
		const name = "name";

		await nameInEnglishInput$.fill(name);
		await nameInEnglishInput$.press("Tab");
		const formData = await form.getChangedData();

		expect(formData.datasetName["en"]).toBe(name);
	});

	test("sets correct name to dataset when adding a name in two languages", async () => {
		const name1 = "name in English";
		const name2 = "name in Finnish";

		await nameInEnglishInput$.clear();
		await nameInEnglishInput$.fill(name1);
		await nameInFinnishInput$.fill(name2);
		await nameInFinnishInput$.press("Tab");
		const formData = await form.getChangedData();

		expect(formData.datasetName["en"]).toBe(name1);
		expect(formData.datasetName["fi"]).toBe(name2);
	});

	test("sets correct name to personsResponsible field when clicking a me button", async () => {
		await form.$locate("personsResponsible").locator("button").click();

		await expect(form.$getInputWidget("personsResponsible")).toHaveValue("Test, User");
		const formData = await form.getChangedData();
		expect(formData.personsResponsible).toBe("Test, User");
	});
});
