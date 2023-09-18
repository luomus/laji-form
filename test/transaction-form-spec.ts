import {Form, createForm, EnumWidgetPOI} from "./test-utils";
import {$, by, protractor} from "protractor";

describe("transaction form (MHL.930)", () => {
	let form: Form;
	let typeEnum$: EnumWidgetPOI;

	const uiSchemaContext = {
		userName: "Test, User",
		userEmail: "user.test@email.com"
	};

	beforeAll(async () => {
		form = await createForm({id: "MHL.930"});
		await form.setState({ uiSchemaContext });
		typeEnum$ = form.$getEnumWidget("type");

		await typeEnum$.openEnums();
		await typeEnum$.$$enums.first().click();
	});

	it("sets correct name and email when clicking a me button", async () => {
		await form.$locate("localPerson").$("button").click();

		const $input = form.$locate("localPerson").$("input");
		expect(await $input.getAttribute("value")).toBe("Test, User");
		const $input2 = form.$locate("localPersonEmail").$("input");
		expect(await $input2.getAttribute("value")).toBe("user.test@email.com");

		const formData = await form.getChangedData();
		expect(formData.localPerson).toBe("Test, User");
		expect(formData.localPersonEmail).toBe("user.test@email.com");
	});

	describe("specimen fields", () => {
		it("adds the ids", async () => {
			const $input = form.$getInputWidget("awayIDs")
			await $input.sendKeys("abc cde efg");
			await $input.sendKeys(protractor.Key.TAB);

			let formData = await form.getChangedData();
			expect(formData.awayIDs).toEqual(["abc", "cde", "efg"]);
		});

		it("marks all as returned", async () => {
			const returnAllButton$ = $(".laji-form-multi-tag-array-field-buttons").all(by.tagName("button")).get(0);
			await returnAllButton$.click();

			const formData = await form.getChangedData();
			expect(formData.awayIDs).toEqual([]);
			expect(formData.returnedIDs).toEqual(["abc", "cde", "efg"]);
		});

		it("marks selected ids as missing", async () => {
			const markAsMissingButton$ = $(".laji-form-multi-tag-array-field-buttons").all(by.tagName("button")).get(3);
			await markAsMissingButton$.click();

			const tags$ = form.$locate("returnedIDs").$$(".rw-multiselect-tag");
			await tags$.get(1).click();

			const formData = await form.getChangedData();
			expect(formData.returnedIDs).toEqual(["abc", "efg"]);
			expect(formData.missingIDs).toEqual(["cde"]);
		});
	});
});
