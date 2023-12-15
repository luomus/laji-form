import { test } from "@playwright/test";
import { createForm } from "./test-utils";

test.describe("invasive species eradication named place form (MHL.32)", () => {
	test("renders", async ({browser}) => {
		// Just check that no error occurs.
		await createForm(await browser.newPage(), {id: "MHL.32", localFormData: true});
	});
});
