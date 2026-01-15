import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm, DateWidgetPO } from "./test-utils";
import { JSONSchema7 } from "json-schema";

test.describe.configure({mode: "serial"});

// Can't test generate ID fields on specimen form directly without the Kotka api client, test the functionality on a demo form instead
test.describe("Specimen form generate ID", () => {
	let form: DemoPageForm;

	const schema = {
		type: "string"
	} as JSONSchema7;

	const uiSchema = {
		"ui:widget": "InputWithDefaultValueButtonWidget",
		"ui:options": {
			"apiQueryForDefaultValue": {
				"path": "/areas/ML.1",
				"query": {"lang": "en"},
				"resultKey": "name"
			},
			"buttonLabel": "Generate country"
		}
	};


	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage());
		await form.setState({ schema, uiSchema });
	});

	test("clicking the generate button fetches a value from the api", async () => {
		await form.$locate("").locator("button").click();

		await expect(form.$getInputWidget("")).toHaveValue("Afghanistan");
		expect (await form.getChangedData()).toBe("Afghanistan");
	});

	test.describe("confirm click", () => {
		test.beforeAll(async () => {
			await form.setState({
				uiSchema: {
					...uiSchema,
					"ui:options": {...uiSchema["ui:options"], confirmClick: true}
				}
			});
			await form.$locate("").locator("input").fill("");
		});

		test("clicking cancel doesn't update the value", async () => {
			await form.$locate("").locator("button").click();
			await form.$locateButton("", "default-value-button-confirm-no", true).click();

			await expect(form.$getInputWidget("")).toHaveValue("");
			expect (await form.getChangedData()).toBe(undefined);
		});

		test("clicking ok updates the value", async () => {
			await form.$locate("").locator("button").click();
			await form.$locateButton("", "default-value-button-confirm-yes", true).click();

			await expect(form.$getInputWidget("")).toHaveValue("Afghanistan");
			expect (await form.getChangedData()).toBe("Afghanistan");
		});
	});
});
