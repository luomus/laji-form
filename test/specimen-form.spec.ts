import { test, expect, Page } from "@playwright/test";
import { DemoPageForm, createForm, EnumWidgetPOI, getFocusedElement } from "./test-utils";

test.describe.configure({mode: "serial"});

test.describe("specimen form (MHL.1158)", () => {
	let page: Page;
	let form: DemoPageForm;
	let addMeasurementEnum$: EnumWidgetPOI;

	const uiSchemaContext = {
		userName: "Test, User",
		userEmail: "user.test@email.com"
	};

	test.beforeAll(async ({browser}) => {
		page = await browser.newPage();
		form = await createForm(page, {id: "MHL.1158"});
		await form.setState({uiSchemaContext});

		addMeasurementEnum$ = form.$getEnumWidget("gatherings.0.units.0.measurement");
	});

	test.describe("measurements", () => {
		test("can add a measurement field", async () => {
			await addMeasurementEnum$.openEnums();
			await addMeasurementEnum$.$$enums.nth(1).click();

			expect(form.$locate("gatherings.0.units.0.measurement.beakMillimeters.0")).toBeVisible();

			const formData = await form.getChangedData();
			expect(formData.gatherings[0].units[0].measurement).toEqual({beakMillimeters: [undefined]});
		});

		test("can add multiple measurement field", async () => {
			await addMeasurementEnum$.openEnums();
			await addMeasurementEnum$.$$enums.nth(2).click();
			await addMeasurementEnum$.openEnums();
			await addMeasurementEnum$.$$enums.nth(1).click();

			expect(form.$locate("gatherings.0.units.0.measurement.bodyCentimeters.0")).toBeVisible();
			expect(form.$locate("gatherings.0.units.0.measurement.beakMillimeters.1")).toBeVisible();

			const formData = await form.getChangedData();
			expect(formData.gatherings[0].units[0].measurement).toEqual({beakMillimeters: [undefined, undefined], bodyCentimeters: [undefined]});
		});

		test("can fill measurement fields", async () => {
			await form.$locate("gatherings.0.units.0.measurement.beakMillimeters.0").locator("input").fill("2");
			await form.$locate("gatherings.0.units.0.measurement.bodyCentimeters.0").locator("input").fill("1");
			await form.$locate("gatherings.0.units.0.measurement.beakMillimeters.1").locator("input").fill("7");
			await getFocusedElement(page).press("Tab");

			const formData = await form.getChangedData();
			expect(formData.gatherings[0].units[0].measurement).toEqual({beakMillimeters: [2, 7], bodyCentimeters: [1]});
		});

		test("can remove measurement field", async () => {
			await form.$locateButton("gatherings.0.units.0.measurement.beakMillimeters.0", "delete").click();

			expect(form.$locate("gatherings.0.units.0.measurement.beakMillimeters.1")).not.toBeVisible();

			const formData = await form.getChangedData();
			expect(formData.gatherings[0].units[0].measurement).toEqual({beakMillimeters: [7], bodyCentimeters: [1]});
		});

		test("can remove all measurement fields", async () => {
			await form.$locateButton("gatherings.0.units.0.measurement.bodyCentimeters.0", "delete").click();
			await form.$locateButton("gatherings.0.units.0.measurement.beakMillimeters.0", "delete").click();

			expect(form.$locate("gatherings.0.units.0.measurement.bodyCentimeters.0")).not.toBeVisible();
			expect(form.$locate("gatherings.0.units.0.measurement.beakMillimeters.0")).not.toBeVisible();

			const formData = await form.getChangedData();
			expect(formData.gatherings[0].units[0].measurement).toEqual(undefined);
		});
	});
});
