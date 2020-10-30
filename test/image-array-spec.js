const { createForm, getInputWidget, updateValue, waitUntilBlockingLoaderHides, mockImageMetadata } = require("./test-utils.js");
const properties = require("../properties.json");

describe("Image array", () => {

	let form;

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

	// Uncomment when https://github.com/rjsf-team/react-jsonschema-form/pull/1528 is merged.
	beforeAll(async () => {
		form = await createForm();
		await form.setState({ schema, uiSchema, uiSchemaContext });
	});

	it("renders correctly", async () => {
		expect(await $(".laji-form-medias").isDisplayed()).toBe(true);
		expect(await $$(".laji-form-drop-zone").count()).toBe(1);
	});

	it("adds image", async () => {
		const {resolve, remove} = await form.mockImageUpload("");
		await resolve();
		expect(await $$(".media-container").count()).toBe(1);
		await remove();
	});

	it("open metadata modal on click", async () => {
		const {resolve, remove} = await form.setMockResponse("/images/mock", false);
		await $(".media-container a").click();
		await resolve(mockImageMetadata);
		await browser.sleep(1000);
		expect(await $(".laji-form.media-modal").isDisplayed()).toBe(true);
		await remove();
		await $(".laji-form.media-modal .close").click();
	});

	it("deletes image", async () => {
		await browser.sleep(1000);
		expect(await $$(".media-container").count()).toBe(1);
		expect(await $(".media-container .button-corner").isDisplayed()).toBe(true)
		const {resolve, remove} = await form.setMockResponse("/images/mock", false);
		await $(".media-container .button-corner").click();
		await form.$locateButton("0", "delete-confirm-yes").click();
		expect(await $$(".media-container").count()).toBe(0);
		await resolve();
		await remove();
	});
});
