import { Form, createForm } from "./test-utils";
import { $, $$ } from "protractor";

describe("Geocoder", () => {

	let form: Form;

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

	beforeEach(async () => {
		form = await createForm();
	});

	it("parses location in Finland correctly", async () => {
		const {resolve, remove} = await form.setMockResponse("/coordinates/location", false);
		await form.setState({schema, uiSchema, formData});

		expect(await form.$locate("country").$("input").getAttribute("value")).toBe("");
		expect(await form.$locate("municipality").$("input").getAttribute("value")).toBe("");
		expect(await form.$locate("biologicalProvince").$("input").getAttribute("value")).toBe("");

		await resolve(response);
		await remove();

		expect(await form.$locate("country").$("input").getAttribute("value")).toBe("Suomi");
		expect(await form.$locate("municipality").$("input").getAttribute("value")).toBe("Helsinki");
		expect(await form.$locate("biologicalProvince").$("input").getAttribute("value")).toBe("Nylandia");
	});

	const $runningJobs = $(".running-jobs");

	it("blocks submit until done", async () => {
		const {resolve, remove} = await form.setMockResponse("/coordinates/location", false);
		await form.setState({schema, uiSchema, formData});
		await form.e("submit()");

		expect(await $runningJobs.isDisplayed()).toBe(true);
		await resolve(response);
		await remove();

		expect(await $runningJobs.isPresent()).toBe(false);
		expect(await form.$locate("country").$("input").getAttribute("value")).toBe("Suomi");
		expect(await form.getSubmittedData()).not.toBe(null);
	});

	describe("rejecting", () => {
		it("blocks submit", async () => {
			const {reject, remove} = await form.setMockResponse("/coordinates/location", false);
			await form.setState({schema, uiSchema, formData});
			await form.setState({formData: {}});
			await form.setState({formData});
			await form.e("submit()");

			expect(await form.getSubmittedData()).toBe(null);
			expect(await $runningJobs.isDisplayed()).toBe(true);

			await reject();
			await remove();

			expect(await $$(".laji-form-failed-jobs-list .list-group-item").count()).toBe(1);
			expect(await $runningJobs.isPresent()).toBe(false);
			expect(await form.getSubmittedData()).not.toBe(null);
		});

		it("and then locating again removes old bg job", async () => {
			const {resolve, remove} = await form.setMockResponse("/coordinates/location", false);
			await form.setState({schema, uiSchema, formData});
			await form.e("submit()");

			expect(await $$(".laji-form-failed-jobs-list .list-group-item").count()).toBe(0);
			expect(await $runningJobs.isDisplayed()).toBe(true);

			await resolve(response);
			await remove();

			expect(await $$(".laji-form-failed-jobs-list .list-group-item").count()).toBe(0);
			expect(await $runningJobs.isPresent()).toBe(false);
		});
	});
});
