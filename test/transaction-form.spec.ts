import { test, expect, Page } from "@playwright/test";
import { DemoPageForm, createForm, EnumWidgetPOI } from "./test-utils";

test.describe.configure({mode: "serial"});

test.describe("transaction form (MHL.930)", () => {
	let page: Page;
	let form: DemoPageForm;
	let typeEnum$: EnumWidgetPOI;

	const uiSchemaContext = {
		userName: "Test, User",
		userEmail: "user.test@email.com"
	};

	test.beforeAll(async ({browser}) => {
		page = await browser.newPage();
		form = await createForm(page, {id: "MHL.930"});
		await form.setState({ uiSchemaContext });
		typeEnum$ = form.$getEnumWidget("type");

		await typeEnum$.openEnums();
		await typeEnum$.$$enums.nth(1).click();
	});

	test("sets correct name and email when clicking a me button", async () => {
		await form.$locate("localPerson").locator("button").click();

		await expect(form.$getInputWidget("localPerson")).toHaveValue("Test, User");
		await expect(form.$getInputWidget("localPersonEmail")).toHaveValue("user.test@email.com");

		const formData = await form.getChangedData();
		expect(formData.localPerson).toBe("Test, User");
		expect(formData.localPersonEmail).toBe("user.test@email.com");
	});

	test.describe("specimen fields", () => {
		test("adds the ids", async () => {
			const $input = form.$getInputWidget("specimenIDs.awayIDs");
			await $input.fill("abc cde efg");
			await $input.press("Tab");

			let formData = await form.getChangedData();
			expect(formData.awayIDs).toEqual(["abc", "cde", "efg"]);
		});

		test("marks all as returned", async () => {
			const returnAllButton$ = page.locator(".laji-form-multi-tag-array-field-buttons button").nth(0);
			await returnAllButton$.click();

			const formData = await form.getChangedData();
			expect(formData.awayIDs).toEqual([]);
			expect(formData.returnedIDs).toEqual(["abc", "cde", "efg"]);
		});

		test("marks selected ids as missing", async () => {
			const markAsMissingButton$ = page.locator(".laji-form-multi-tag-array-field-buttons button").nth(3);
			await markAsMissingButton$.click();

			const tags$ = form.$locate("specimenIDs.returnedIDs").locator(".rw-multiselect-tag");
			await tags$.nth(1).click();

			const formData = await form.getChangedData();
			expect(formData.returnedIDs).toEqual(["abc", "efg"]);
			expect(formData.missingIDs).toEqual(["cde"]);
		});

		test("adds HA. prefix to H-numbers", async () => {
			const $input = form.$getInputWidget("specimenIDs.awayIDs");
			await $input.fill("H9123456 ABCDE");
			await $input.press("Tab");

			let formData = await form.getChangedData();
			expect(formData.awayIDs).toEqual(["HA.H9123456", "ABCDE"]);
		});

		test("shows correct total counts", async () => {
			const $input = form.$getInputWidget("specimenCounts.returnedCount");
			await $input.fill("4");
			await $input.press("Tab");

			await expect(form.$locate("totalAwayCount").locator('.plainText')).toHaveText('2');
			await expect(form.$locate("totalReturnedCount").locator('.plainText')).toHaveText('6');
			await expect(form.$locate("totalMissingCount").locator('.plainText')).toHaveText('1');
			await expect(form.$locate("totalCount").locator('.plainText')).toHaveText('9');
		});
	});
});
