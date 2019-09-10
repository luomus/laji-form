import { createForm } from "./test-utils.js";

describe("Geocoder", () => {

	let form;

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

	beforeAll(async () => {
		form = await createForm();
	});

	it("parses location in Finland correctly", async () => {
		const {resolve, remove} = await form.setMockResponse("/coordinates/location", false, response);
		await form.setState({ schema, uiSchema, formData });
		await expect(form.$locate("country").$("input").getAttribute("value")).toBe("");
		await expect(form.$locate("municipality").$("input").getAttribute("value")).toBe("");
		await expect(form.$locate("biologicalProvince").$("input").getAttribute("value")).toBe("");
		await resolve();
		await remove();
		await expect(form.$locate("country").$("input").getAttribute("value")).toBe("Finland");
		await expect(form.$locate("municipality").$("input").getAttribute("value")).toBe("Helsinki");
		await expect(form.$locate("biologicalProvince").$("input").getAttribute("value")).toBe("Nylandia");
	});
});
