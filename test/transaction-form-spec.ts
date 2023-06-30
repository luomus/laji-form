import { Form, createForm, EnumWidgetPOI } from "./test-utils";

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
});
