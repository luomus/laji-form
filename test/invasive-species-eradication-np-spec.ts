import { createForm } from "./test-utils";


describe("invasive species eradication named place form (MHL.32)", () => {
	it("renders", async () => {
		// Just check that no error occurs.
		await createForm({id: "MHL.32", localFormData: true});
	});
});
