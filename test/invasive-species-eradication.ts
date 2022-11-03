import { createForm } from "./test-utils";

describe("invasive species eradication form (MHL.33)", () => {
	it("renders", async () => {
		// Just check that no error occurs.
		await createForm({id: "MHL.33", localFormData: true});
	});
});
