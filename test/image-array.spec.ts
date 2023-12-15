import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm, mockImageMetadata, ImageArrayFieldPO } from "./test-utils";
import properties from "../properties.json";

test.describe("Image array", () => {

	let form: DemoPageForm;
	let imgArrayField: ImageArrayFieldPO;

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
	};

	test.beforeAll(async ({browser}) => {
		form = await createForm(await browser.newPage());
		await form.setState({ schema, uiSchema, uiSchemaContext });
		imgArrayField = form.getImageArrayField("");
	});

	test.beforeEach(async () => {
		const {resolve, remove} = await form.mockImageUpload("");
		await resolve();
		await expect(imgArrayField.$imgLoading).not.toBeVisible();
		await expect(imgArrayField.$imgContainers).toHaveCount(1);
		await remove();
	});

	test("open metadata modal on click", async () => {
		const {resolve, remove} = await form.setMockResponse("/images/mock", false);
		await imgArrayField.$imgContainers.first().click();
		await resolve(mockImageMetadata);

		await expect(imgArrayField.$modal).toBeVisible();

		await remove();
		await imgArrayField.$modalClose.click();
	});

	test("deletes image", async () => {
		await expect(imgArrayField.$imgs).toHaveCount(1);
		await expect(imgArrayField.$imgRemoves.first()).toBeVisible();

		const {resolve, remove} = await form.setMockResponse("/images/mock", false);
		await imgArrayField.$imgRemoves.first().click();
		await imgArrayField.$imgRemoveConfirmButton("0").click();

		expect(await imgArrayField.$imgs.count()).toBe(0);

		await resolve();
		await remove();
	});

	test("Image saves even if the image component unmounts", async () => {
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

		await expect(form.getImageArrayField("0").$imgs).toHaveCount(1);
		await remove();
	});
});
