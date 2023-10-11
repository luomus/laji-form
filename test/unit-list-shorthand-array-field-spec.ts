import { Form, createForm, updateValue, UnitListShorthandArrayFieldPOI, isDisplayed, EC } from "./test-utils";
import { JSONSchema7 } from "json-schema";
import {browser} from "protractor";

describe("UnitListShorthandArrayField", () => {

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

	let form: Form;
	let component: UnitListShorthandArrayFieldPOI;

	beforeAll(async () => {
		form = await createForm({schema, uiSchema, formData});
		component = form.getUnitListShorthandArrayField("");
	});

	it("button renders", async () => {
		expect(await isDisplayed(component.$button)).toBe(true);
	});

	it("button click shows modal", async () => {
		await component.$button.click();

		await browser.wait(EC.visibilityOf(component.modal.$addButton), 100, "Modal didn't show up");
	});

	it("typing species in and submitting gets the formData", async () => {
		await updateValue(component.modal.$input, "susi, kettu");

		await component.modal.$addButton.click();

		await form.waitUntilBlockingLoaderHides(5000);

		const formData = await form.getChangedData();

		const susiAndKettu = [{"informalTaxonGroups":["MVL.2", "MVL.1261",  "MVL.1262"],"identifications":[{"taxon":"susi"}],"unitFact":{"autocompleteSelectedTaxonID":"MX.46549"}},{"informalTaxonGroups":["MVL.2", "MVL.1261",  "MVL.1262"],"identifications":[{"taxon":"kettu"}],"unitFact":{"autocompleteSelectedTaxonID":"MX.46587"}}];

		expect(formData).toEqual(susiAndKettu);
	});
});
