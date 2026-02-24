import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm } from "./test-utils";

test.describe("Geocoder", () => {

	const schema = {
		type: "object",
		properties: {
			country: {
				type: "string"
			},
			municipality: {
				type: "string"
			},
			biologicalProvince: {
				type: "string"
			},
			geometry: {
				type: "object",
				properties: {
					coordinates: {
						type: "array",
						items: {
							type: "number"
						}
					},
					type: {
						type: "string"
					}
				}
			}
		}
	};

	const uiSchema = {
		"ui:field": "GeocoderField"
	};

	const formData = {geometry: {type: "Point", coordinates: [25, 60]}};

	const response = {
		"status": "OK",
		"results": [
			{
				"address_components": [
					{
						"long_name": "Nylandia",
						"short_name": "N",
						"types": [
							"biogeographicalProvince"
						]
					}
				],
				"types": [
					"biogeographicalProvince"
				]
			},
			{
				"address_components": [
					{
						"short_name": "Helsinki",
						"types": [
							"municipality"
						]
					}
				],
				"formatted_address": "Helsinki",
				"types": [
					"municipality"
				]
			},
			{
				"address_components": [{
					"long_name": "Suomi",
					"short_name": "Suomi",
					"types": ["country"]
				}],
				"formatted_address": "Suomi",
				"types": ["country"],
				"place_id": "ML.206"
			}
		]
	};

	test("parses location in Finland correctly", async ({page}) => {
		const form = await createForm(page);
		const {resolve, remove} = await form.setMockResponse("/coordinates/location", false);
		await form.setState({schema, uiSchema, formData});

		await expect(form.$getInputWidget("country")).toHaveValue("");
		await expect(form.$getInputWidget("municipality")).toHaveValue("");
		await expect(form.$getInputWidget("biologicalProvince")).toHaveValue("");

		await resolve(response);
		await remove();

		await expect(form.$getInputWidget("country")).toHaveValue("Suomi");
		await expect(form.$getInputWidget("municipality")).toHaveValue("Helsinki");
		await expect(form.$getInputWidget("biologicalProvince")).toHaveValue("Nylandia");
	});

	test("blocks submit until done", async ({page}) => {
		const form = await createForm(page);
		const {resolve, remove} = await form.setMockResponse("/coordinates/location", false);
		await form.setState({schema, uiSchema, formData});
		await form.submit();

		await expect(form.$runningJobs).toBeVisible();
		await resolve(response);
		await remove();

		await expect(form.$runningJobs).not.toBeVisible();
		await expect(form.$getInputWidget("country")).toHaveValue("Suomi");
		expect(await form.getSubmittedData()).not.toBe(undefined);
	});

	test.describe("rejecting", () => {
		let form: DemoPageForm;

		test.beforeEach(async ({browser}) => {
			form = await createForm(await browser.newPage());
		});

		test("blocks submit", async () => {
			const {reject, remove} = await form.setMockResponse("/coordinates/location", false);
			await form.setState({schema, uiSchema, formData});
			await form.setState({formData: {}});
			await form.setState({formData});
			await form.submit();

			expect(await form.getSubmittedData()).toBe(undefined);
			await expect(form.$runningJobs).toBeVisible();

			await reject("foo");
			await remove();

			await expect(form.failedJobs.$$errors).toHaveCount(1);
			await expect(form.$runningJobs).not.toBeVisible();
			expect(await form.getSubmittedData()).not.toBe(undefined);
		});

		test("and then locating again removes old bg job", async () => {
			const {resolve, remove} = await form.setMockResponse("/coordinates/location", false);
			await form.setState({schema, uiSchema, formData});
			await form.submit();

			await expect(form.failedJobs.$$errors).toHaveCount(0);
			await expect(form.$runningJobs).toBeVisible();

			await resolve(response);
			await remove();

			await expect(form.failedJobs.$$errors).toHaveCount(0);
			await expect(form.$runningJobs).not.toBeVisible();
		});
	});
});
