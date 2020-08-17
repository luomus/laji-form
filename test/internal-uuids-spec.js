const { createForm } = require("./test-utils.js");

describe("Internal UUIDs", () => {

	let form;

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

	beforeAll(async () => {
		form = await createForm();
		await form.setState({ schema, formData });
	});

	it("are generated on initialization", async () => {
		const {formData} = await form.getState();
		await expect(formData.arrayOfObjects[0]._lajiFormId).not.toBe(undefined);
		await expect(formData.arrayOfObjects[0].innerArrayOfObjects[0]._lajiFormId).not.toBe(undefined);
		await expect(formData.object.innerObject.arrayOfObjects[0]._lajiFormId).not.toBe(undefined);
	});

	it("keeps data intact on id generation", async () => {
		const {formData} = await form.getState();
		await expect(formData.arrayOfObjects[0].string).toBe("foo");
		await expect(formData.arrayOfObjects[0].innerArrayOfObjects[0].string).toBe("foo");
		await expect(formData.object.innerObject.arrayOfObjects[0].string).toBe("foo");
		await expect(formData.number).toBe(2);
	});

	it("are removed on submit", async () => {
		await form.submit();
		const submitted = await form.getSubmittedData();		
		await expect(submitted.arrayOfObjects[0].hasOwnProperty("_lajiFormId")).toBe(false);
		await expect(submitted.arrayOfObjects[0].innerArrayOfObjects[0].hasOwnProperty("_lajiFormId")).toBe(false);
		await expect(submitted.object.innerObject.arrayOfObjects[0].hasOwnProperty("_lajiFormId")).toBe(false);
	});

	it("keeps data intact when ids removed", async () => {
		await form.submit();
		const submitted = await form.getSubmittedData();		
		await expect(submitted.arrayOfObjects[0].string).toBe("foo");
		await expect(submitted.arrayOfObjects[0].innerArrayOfObjects[0].string).toBe("foo");
		await expect(submitted.object.innerObject.arrayOfObjects[0].string).toBe("foo");
		await expect(submitted.number).toBe(2);
	});

	it("are removed on change by default", async () => {
		await form.$locateButton("arrayOfObjects", "add").click();
		const changed = await form.getChangedData();
		await expect(changed.arrayOfObjects[0].hasOwnProperty("_lajiFormId")).toBe(false);
		await expect(changed.arrayOfObjects[0].innerArrayOfObjects[0].hasOwnProperty("_lajiFormId")).toBe(false);
		await expect(changed.object.innerObject.arrayOfObjects[0].hasOwnProperty("_lajiFormId")).toBe(false);
	});

	it("are not removed on change if optimizeOnChange", async () => {
		await form.setState({optimizeOnChange: true});
		await form.$locateButton("arrayOfObjects", "add").click();
		const changed = await form.getChangedData();
		await expect(changed.arrayOfObjects[0]._lajiFormId).not.toBe(undefined);
		await form.setState({optimizeOnChange: false});
	});

	it("are added to new array items", async () => {
		await form.setState({optimizeOnChange: true, formData: {...formData}});
		form.$locateButton("arrayOfObjects", "add").click();
		const changed = await form.getChangedData();
		await expect(changed.arrayOfObjects[1]._lajiFormId).not.toBe(undefined);
	});

	describe("use pre-existing ids", () => {
		beforeAll(async () => {
			await form.setState({
				formData: {...formData, arrayOfObjects: [{...formData.arrayOfObjects[0], id: "ID"}]}
			});
		});

		it("instead of _lajiFormId", async () => {
			const {formData} = await form.getState();
			await expect(formData.arrayOfObjects[0].id).toBe("ID");
			await expect(formData.arrayOfObjects[0].hasOwnProperty('_lajiFormId')).toBe(false);
		});

		it("and they are kept intact when ids are removed", async () => {
			await form.submit();
			const submitted = await form.getSubmittedData();		
			await expect(submitted.arrayOfObjects[0].id).toBe("ID");
		});
	});
});
