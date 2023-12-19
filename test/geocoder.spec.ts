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
			}
		]
	};

	test("parses location in Finland correctly", async ({page}) => {
		const form = await createForm(page);
		const {resolve, remove} = await form.setMockResponse("/coordinates/location", false);
		await form.setState({schema, uiSchema, formData});

		expect(await form.$locate("country").locator("input").getAttribute("value")).toBe("");
		expect(await form.$locate("municipality").locator("input").getAttribute("value")).toBe("");
		expect(await form.$locate("biologicalProvince").locator("input").getAttribute("value")).toBe("");

		await resolve(response);
		await remove();

		expect(await form.$locate("country").locator("input").getAttribute("value")).toBe("Suomi");
		expect(await form.$locate("municipality").locator("input").getAttribute("value")).toBe("Helsinki");
		expect(await form.$locate("biologicalProvince").locator("input").getAttribute("value")).toBe("Nylandia");
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
		expect(await form.$locate("country").locator("input").getAttribute("value")).toBe("Suomi");
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

			await reject();
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
