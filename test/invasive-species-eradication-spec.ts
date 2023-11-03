import { Form, createForm } from "./test-utils";
import { MapPageObject } from "@luomus/laji-map/test-export/test-utils";


describe("invasive species eradication form (MHL.33)", () => {
	let form: Form;

	it("renders", async () => {
		// Just check that no error occurs.
		form = await createForm({id: "MHL.33", localFormData: true});
	});

	it("geometry can be drawn", async () => {
		const map = new MapPageObject();

		await map.drawRectangle();

		expect((await form.getChangedData()).gatherings[0].geometry.geometries[0].type).toBe("Polygon");
	});
});
