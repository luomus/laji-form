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
		await typeEnum$.$$enums.first().click();
	});

	test("sets correct name and email when clicking a me button", async () => {
		await form.$locate("localPerson").locator("button").click();

		const $input = form.$locate("localPerson").locator("input");
		expect(await $input.getAttribute("value")).toBe("Test, User");
		const $input2 = form.$locate("localPersonEmail").locator("input");
		expect(await $input2.getAttribute("value")).toBe("user.test@email.com");

		const formData = await form.getChangedData();
		expect(formData.localPerson).toBe("Test, User");
		expect(formData.localPersonEmail).toBe("user.test@email.com");
	});

	test.describe("specimen fields", () => {
		test("adds the ids", async () => {
			const $input = form.$getInputWidget("awayIDs");
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

			const tags$ = form.$locate("returnedIDs").locator(".rw-multiselect-tag");
			await tags$.nth(1).click();

			const formData = await form.getChangedData();
			expect(formData.returnedIDs).toEqual(["abc", "efg"]);
			expect(formData.missingIDs).toEqual(["cde"]);
		});
	});
});
