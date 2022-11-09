import { Form, createForm } from "./test-utils";
import { browser, ElementFinder, protractor } from "protractor";

describe("dataset form (MHL.731)", () => {
	let form: Form;
	let nameInEnglishInput$: ElementFinder;
	let nameInFinnishInput$: ElementFinder;

	beforeAll(async () => {
		form = await createForm({id: "MHL.731"});
		nameInEnglishInput$ = form.$locate("datasetName_en").$("input");
		nameInFinnishInput$ = form.$locate("datasetName_fi").$("input");
	});

	it("sets correct name to dataset when adding a name in one language", async () => {
		const name = "name";

		await nameInEnglishInput$.sendKeys(name + protractor.Key.TAB);
		const formData = await form.getChangedData();

		expect(formData.datasetName["en"]).toBe(name);
	});

	it("sets correct name to dataset when adding a name in two languages", async () => {
		const name1 = "name in English";
		const name2 = "name in Finnish";

		await nameInEnglishInput$.clear();
		await nameInEnglishInput$.sendKeys(name1);
		await nameInFinnishInput$.sendKeys(name2 + protractor.Key.TAB);
		const formData = await form.getChangedData();

		expect(formData.datasetName["en"]).toBe(name1);
		expect(formData.datasetName["fi"]).toBe(name2);
	});
});
