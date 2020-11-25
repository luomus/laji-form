const { createForm, getInputWidget, updateValue, waitUntilBlockingLoaderHides, mockImageMetadata } = require("./test-utils.js");
const properties = require("../properties.json");

describe("Image array", () => {

	let form;
	let imgArrayField;

	const schema = {
		type: "array",
		items: {
			type: "string"
		}
	};

	const uiSchema = {
		"ui:field": "ImageArrayField",
		"ui:options": {
			"deleteConfirmPlacement": "bottom"
		}
	};

	const uiSchemaContext = {
		creator: properties.userId
	}

	describe("", () => {

		beforeAll(async () => {
			form = await createForm();
			await form.setState({ schema, uiSchema, uiSchemaContext });
			imgArrayField = form.getImageArrayField("");
		});

		it("renders correctly", async () => {
			expect(await imgArrayField.$container.isDisplayed()).toBe(true);
			expect(await imgArrayField.$dropzone.isDisplayed()).toBe(true);
		});

		it("adds image", async () => {
			const {resolve, remove} = await form.mockImageUpload("");
			await resolve();
			expect(await imgArrayField.$$imgs.count()).toBe(1);
			await remove();
		});

		it("open metadata modal on click", async () => {
			const {resolve, remove} = await form.setMockResponse("/images/mock", false);
			await imgArrayField.$$imgInteractives.first().click();
			await resolve(mockImageMetadata);
			await browser.sleep(1000);

			expect(await imgArrayField.$modal.isDisplayed()).toBe(true);
			await remove();
			await imgArrayField.$modalClose.click();
		});

		it("deletes image", async () => {
			await browser.sleep(1000);
			expect(await imgArrayField.$$imgs.count()).toBe(1);
			expect(await imgArrayField.$$imgRemoves.first().isDisplayed()).toBe(true);
			const {resolve, remove} = await form.setMockResponse("/images/mock", false);
			await imgArrayField.$$imgRemoves.first().click();
			await imgArrayField.$imgRemoveConfirmButton("0").click();
			expect(await imgArrayField.$$imgs.count()).toBe(0);
			await resolve();
			await remove();
		});
	});

	it("Image saves even if the image component unmounts", async () => {
		const _schema = {
			type: "array",
			minItems: 1,
			items: {
				type: "object",
				properties: {
					images: schema
				}
			}
		};
		const _uiSchema = {
			items: {
				images: uiSchema
			}
		};

		await form.setState({schema: _schema, uiSchema: _uiSchema, formData: [{}]});
		const {resolve, remove} = await form.mockImageUpload("0");
		await form.setState({uiSchema: {..._uiSchema, "ui:field": "HiddenField"}});
		await resolve();
		await form.setState({uiSchema: _uiSchema});

		expect(await $$(".media-container").count()).toBe(1);
		await remove();
	});
});
