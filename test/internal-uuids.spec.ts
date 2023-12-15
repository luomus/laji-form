import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";

test.describe("Internal UUIDs", () => {

	let form: DemoPageForm;

	const schema = {
		type: "object",
		properties: {
			arrayOfObjects: {
				type: "array",
				items: {
					type: "object",
					properties: {
						string: {
							type: "string"
						},
						innerArrayOfObjects: {
							type: "array",
							items: {
								type: "object",
								properties: {
									string: {
										type: "string"
									}
								}
							}
						}
					}
				}
			},
			object: {
				type: "object",
				properties: {
					innerObject: {
						type: "object",
						properties: {
							arrayOfObjects: {
								type: "array",
								items: {
									type: "object",
									properties: {
										string: {
											type: "string"
										}
									}
								}
							}
						}
					}
				}
			},
			number: {
				type: "number"
			},
		}
	};

	const formData = {
		arrayOfObjects: [
			{
				string: "foo",
				innerArrayOfObjects: [
					{
						string: "foo"
					}
				]
			}
		],
		object: {
			innerObject: {
				arrayOfObjects: [
					{
						string: "foo"
					}
				]
			}
		},
		number: 2
	};

	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage());
		await form.setState({ schema, formData });
	});

	test("are generated on initialization", async () => {
		const {formData} = await form.getState();

		expect(formData.arrayOfObjects[0]._lajiFormId).not.toBe(undefined);
		expect(formData.arrayOfObjects[0].innerArrayOfObjects[0]._lajiFormId).not.toBe(undefined);
		expect(formData.object.innerObject.arrayOfObjects[0]._lajiFormId).not.toBe(undefined);
	});

	test("keeps data intact on id generation", async () => {
		const {formData} = await form.getState();

		expect(formData.arrayOfObjects[0].string).toBe("foo");
		expect(formData.arrayOfObjects[0].innerArrayOfObjects[0].string).toBe("foo");
		expect(formData.object.innerObject.arrayOfObjects[0].string).toBe("foo");
		expect(formData.number).toBe(2);
	});

	test("are removed on submit", async () => {
		await form.submit();
		const submitted = await form.getSubmittedData();		

		expect(submitted.arrayOfObjects[0]).not.toContain("_lajiFormId");
		expect(submitted.arrayOfObjects[0].innerArrayOfObjects[0]).not.toContain("_lajiFormId");
		expect(submitted.object.innerObject.arrayOfObjects[0]).not.toContain("_lajiFormId");
	});

	test("keeps data intact when ids removed", async () => {
		await form.submit();
		const submitted = await form.getSubmittedData();		

		expect(submitted.arrayOfObjects[0].string).toBe("foo");
		expect(submitted.arrayOfObjects[0].innerArrayOfObjects[0].string).toBe("foo");
		expect(submitted.object.innerObject.arrayOfObjects[0].string).toBe("foo");
		expect(submitted.number).toBe(2);
	});

	test("are removed on change by default", async () => {
		await form.$locateButton("arrayOfObjects", "add").click();
		const changed = await form.getChangedData();

		expect(changed.arrayOfObjects[0]).not.toContain("_lajiFormId");
		expect(changed.arrayOfObjects[0].innerArrayOfObjects[0]).not.toContain("_lajiFormId");
		expect(changed.object.innerObject.arrayOfObjects[0]).not.toContain("_lajiFormId");
	});

	test("are not removed on change if optimizeOnChange", async () => {
		await form.setState({optimizeOnChange: true});
		await form.$locateButton("arrayOfObjects", "add").click();
		const changed = await form.getChangedData();

		expect(changed.arrayOfObjects[0]._lajiFormId).not.toBe(undefined);
		await form.setState({optimizeOnChange: false});
	});

	test("are added to new array items", async () => {
		await form.setState({optimizeOnChange: true, formData: {...formData}});
		await form.$locateButton("arrayOfObjects", "add").click();
		const changed = await form.getChangedData();

		expect(changed.arrayOfObjects[1]._lajiFormId).not.toBe(undefined);
	});

	test.describe("use pre-existing ids", () => {
		test.beforeAll(async () => {
			await form.setState({
				formData: {...formData, arrayOfObjects: [{...formData.arrayOfObjects[0], id: "ID"}]}
			});
		});

		test("instead of _lajiFormId", async () => {
			const {formData} = await form.getState();

			expect(formData.arrayOfObjects[0].id).toBe("ID");
			expect(formData.arrayOfObjects[0]).not.toContain("_lajiFormId");
		});

		test("and they are kept intact when ids are removed", async () => {
			await form.submit();
			const submitted = await form.getSubmittedData();		

			expect(submitted.arrayOfObjects[0].id).toBe("ID");
		});
	});
});
