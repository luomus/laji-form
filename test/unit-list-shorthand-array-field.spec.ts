import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm, UnitListShorthandArrayFieldPO } from "./test-utils";
import { JSONSchema7 } from "json-schema";

test.describe.configure({ mode: "serial" });

test.describe("UnitListShorthandArrayField", () => {

	const schema: JSONSchema7 = {
		type: "array",
		items: {
			type: "object",
			properties: {
				identifications: {
					type: "array",
					items: {
						type: "object",
						properties: {
							taxon: { type: "string" }
						}
					}
				},
				unitFact: {
					type: "object",
					properties: {
						autocompleteSelectedTaxonID: { type: "string" }
					}
				},
				informalTaxonGroups: {
					type: "array",
					items: { type: "string" }
				}
			}

		}
	};
	const uiSchema = {
		"ui:field": "UnitListShorthandArrayField",
	};

	const formData: any = [];

	let form: DemoPageForm;
	let component: UnitListShorthandArrayFieldPO;

	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage(), {schema, uiSchema, formData});
		component = form.getUnitListShorthandArrayField("");
	});

	test("button renders", async () => {
		await expect(component.$button).toBeVisible();
	});

	test("button click shows modal", async () => {
		await component.$button.click();

		await expect(component.modal.$addButton).toBeVisible();
	});

	test("typing species in and submitting gets the formData", async () => {
		await form.updateValue(component.modal.$input, "susi, kettu");
		await component.modal.$addButton.click();
		await expect(form.$blocker).not.toBeVisible(); 
		const formData = await form.getChangedData();

		expect(formData[0]["informalTaxonGroups"]).toContain("MVL.2");
		expect(formData[0]["identifications"]).toEqual([{"taxon":"susi"}]);
		expect(formData[0]["unitFact"]).toEqual({"autocompleteSelectedTaxonID":"MX.46549"});

		expect(formData[1]["informalTaxonGroups"]).toContain("MVL.2");
		expect(formData[1]["identifications"]).toEqual([{"taxon":"kettu"}]);
		expect(formData[1]["unitFact"]).toEqual({"autocompleteSelectedTaxonID":"MX.46587"});
	});
});
