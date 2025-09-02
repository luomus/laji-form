import { test, expect, Page, Locator } from "@playwright/test";
import { DemoPageForm, createForm, EnumWidgetPOI, getFocusedElement, getRemoveUnit } from "./test-utils";
import { MapPageObject } from "@luomus/laji-map/test-export/test-utils";

test.describe.configure({mode: "serial"});

test.describe("specimen form (MHL.1158)", () => {
	let page: Page;
	let form: DemoPageForm;

	const uiSchemaContext = {
		userName: "Test, User",
		userEmail: "user.test@email.com"
	};

	test.beforeAll(async ({browser}) => {
		page = await browser.newPage();
		form = await createForm(page, {id: "MHL.1158"});
		await form.setState({uiSchemaContext});
	});

	test("point can be added to map", async () => {
		const map = new MapPageObject(page, page.locator(".laji-map"));

		await map.drawMarker();

		const formData = await form.getChangedData();
		expect(formData.gatherings[0].wgs84Latitude).toBeDefined();
		expect(formData.gatherings[0].wgs84Longitude).toBeDefined();
	});

	test.describe("units", () => {
		let $unitAdd: Locator;
		let removeUnit: (g: number, u: number) => Promise<void>;

		test.beforeAll(async () => {
			$unitAdd = form.$locateButton("gatherings.0.units", "add");
			removeUnit = getRemoveUnit(page);
		});

		test("has one by default", async () => {
			await expect(form.$locate("gatherings.0.units.0")).toBeVisible();
		});

		test("can be added", async () => {
			await $unitAdd.click();
			await expect(form.$locate("gatherings.0.units.1")).toBeVisible();
		});

		test("panels are open on default", async () => {
			await expect(form.$locate("gatherings.0.units.0.primarySpecimen")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.primarySpecimen")).toBeVisible();
		});

		test("panels can be closed automatically", async () => {
			await form.e("closeAllMultiActiveArrays()");
			await expect(form.$locate("gatherings.0.units.0.primarySpecimen")).not.toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.primarySpecimen")).not.toBeVisible();
		});

		test("panels can be opened automatically", async () => {
			await form.e("openAllMultiActiveArrays()");
			await expect(form.$locate("gatherings.0.units.0.primarySpecimen")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.primarySpecimen")).toBeVisible();
		});

		test("panel can be closed by clicking", async () => {
			await form.$locateAddition("gatherings.0.units.0", "panel").locator(".laji-form-clickable-panel-header").click();
			await expect(form.$locate("gatherings.0.units.0.primarySpecimen")).not.toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.primarySpecimen")).toBeVisible();
		});

		test("focusing opens the panel", async () => {
			await form.e("focusField('/gatherings/0/units/0')");
			await expect(form.$locate("gatherings.0.units.0.primarySpecimen")).toBeVisible();
			await expect(form.$locate("gatherings.0.units.1.primarySpecimen")).toBeVisible();
		});

		test.describe("samples", () => {
			let $sampleAdd: Locator;
			let preparationTypeEnum$: EnumWidgetPOI;
			let preparationMaterialEnum$: EnumWidgetPOI;

			test.beforeAll(async () => {
				$sampleAdd = form.$locateButton("gatherings.0.units.0.samples", "add");
				preparationTypeEnum$ = form.$getEnumWidget("gatherings.0.units.0.samples.0.preparationType");
				preparationMaterialEnum$ = form.$getEnumWidget("gatherings.0.units.0.samples.0.material");
			});

			test("can be added", async () => {
				await $sampleAdd.click();
				await expect(form.$locate("gatherings.0.units.0.samples.0")).toBeVisible();
			});

			test("preparation material options depends on the preparation type", async () => {
				await preparationTypeEnum$.openEnums();
				await preparationTypeEnum$.$$enums.nth(2).click();

				await preparationMaterialEnum$.openEnums();
				await preparationMaterialEnum$.$$enums.nth(1).click();

				const formData = await form.getChangedData();
				expect(formData.gatherings[0].units[0].samples[0].material).toEqual("MF.materialSkull");
			});
		});

		test("can be deleted", async () => {
			await removeUnit(0, 1);

			await expect(form.$locate("gatherings.0.units.1")).not.toBeVisible();
		});
	});

	test.describe("measurements", () => {
		let addMeasurementEnum$: EnumWidgetPOI;

		test.beforeAll(async () => {
			addMeasurementEnum$ = form.$getEnumWidget("gatherings.0.units.0.measurement");
		});

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

	test.describe("relationship", () => {
		let addRelationshipEnum$: EnumWidgetPOI;

		test.beforeAll(async () => {
			addRelationshipEnum$ = form.$getEnumWidget("relationship");
		});

		test("can add a relationship prefix", async () => {
			await addRelationshipEnum$.openEnums();
			await addRelationshipEnum$.$$enums.nth(1).click();

			expect(form.$locate("relationship.0")).toBeVisible();

			const formData = await form.getChangedData();
			expect(formData.relationship).toEqual(["host:"]);
		});

		test("can add multiple relationships", async () => {
			await addRelationshipEnum$.openEnums();
			await addRelationshipEnum$.$$enums.nth(2).click();
			await addRelationshipEnum$.openEnums();
			await addRelationshipEnum$.$$enums.nth(1).click();

			expect(form.$locate("relationship.1")).toBeVisible();
			expect(form.$locate("relationship.2")).toBeVisible();

			const formData = await form.getChangedData();
			expect(formData.relationship).toEqual(["host:", "parasite:", "host:"]);
		});

		test("can edit relationship fields", async () => {
			await form.$locate("relationship.0").locator("input").fill("1");
			await form.$locate("relationship.1").locator("input").fill("2");
			await form.$locate("relationship.0").locator("input").fill("3");
			await getFocusedElement(page).press("Tab");

			const formData = await form.getChangedData();
			expect(formData.relationship).toEqual(["host:3", "parasite:2", "host:"]);
		});

		test("can remove relationship field", async () => {
			await form.$locateButton("relationship.0", "delete").click();

			expect(form.$locate("relationship.2")).not.toBeVisible();

			const formData = await form.getChangedData();
			expect(formData.relationship).toEqual(["parasite:2", "host:"]);
		});
	});
});
