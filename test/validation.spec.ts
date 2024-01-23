import { test, expect } from "@playwright/test";
import { DemoPageForm, createForm, updateValue } from "./test-utils";
const properties = require("../properties.json");

test.describe.configure({mode: "serial"});

test.describe("Validations", () => {

	let form: DemoPageForm;

	// Uncomment when https://github.com/rjsf-team/react-jsonschema-form/pull/1528 is merged.
	//test.beforeAll(async ({browser}) => {
	test.beforeEach(async ({browser}) => {
		form = await createForm(await browser.newPage());
	});

	const schema = {
		type: "object",
		properties: {
			a: {
				type: "string"
			},
			b: {
				type: "string"
			}
		},
	};

	const formData = {b: "bar"};

	const message = "foo";
	const getCustom = (message = "foo", live?: string) => ({
		a: {
			presence: {
				message,
				options: {
					_live: live
				}
			}
		}
	});

	test("pass on no errors", async () => {
		await form.setState({ schema, formData });
		await form.submit();

		expect(await form.getSubmittedData()).toEqual(formData);
	});

	test("fail on schema errors", async () => {
		await form.setState({ schema: {...schema, required: ["a"]}, formData });
		await form.submit();

		await expect(form.errors.$$all).toHaveCount(1);
		expect(await form.getSubmittedData()).not.toEqual(formData);
	});

	test("doesn't run schema validators before submitted", async () => {
		const _formData = {...formData, a: "foo"};
		await form.setState({ schema: {...schema, required: ["a"]}, formData: _formData });
		await updateValue(form.$getInputWidget("a"), "");

		await expect(form.errors.$$all).toHaveCount(0);

		await form.submit();

		await expect(form.errors.$$all).toHaveCount(1);
	});

	test("fail on custom errors", async () => {
		const validators = getCustom();
		const formData = {};
		await form.setState({ schema, formData, validators });
		await form.submit();

		expect(await form.getSubmittedData()).not.toEqual(formData);
		await expect(form.errors.$$all.nth(0)).toHaveText(new RegExp(message));
	});

	test.describe("warnings", () => {

		test("prevent submit", async () => {
			const warnings = getCustom();
			await form.setState({ schema, formData, warnings });
			await form.submit();

			expect(await form.getSubmittedData()).not.toEqual(formData);
			await expect(form.warnings.$$all.nth(0)).toHaveText(new RegExp(message));
		});
	
		test("can be submitted via warnings-acknowledged-submit button", async() => {
			const warnings = getCustom();
			await form.setState({ schema, formData, warnings });
			await form.submit();
			await form.$acknowledgeWarnings.click();

			expect(await form.getSubmittedData()).toEqual(formData);
		});
	});

	[["errors", "validators"], ["warnings", "warnings"]].forEach(([type, propName]) => {
		test(`doesn't run ${type} live validators on init`, async () => {
			const validators = getCustom(message, "live");
			const formData = {};
			await form.setState({ schema, formData, [propName]: validators });

			await expect((form as any)[type].$panel).not.toBeVisible();
		});

		test(`runs live ${type} validators on onChange`, async () => {
			const validators = getCustom(message, "live");
			const formData = {a: "bar"};
			await form.setState({ schema, formData, [propName]: validators });
			await updateValue(form.$getInputWidget("a"), "");

			await expect((form as any)[type].$$all.nth(0)).toHaveText(new RegExp(message));
		});
	});

	test("doesn't show blocker during live validation", async () => {
		const validators = getCustom(message, "live");
		const formData = {a: "bar"};
		await form.setState({ schema, formData, validators });
		await updateValue(form.$getInputWidget("a"), "");

		await expect(form.$blocker).not.toBeVisible();
	});

	test("runs both validators and warnings live on Change", async () => {
		const validators = getCustom(message, "live");
		const formData = {a: "bar"};
		await form.setState({ schema, formData, validators, warnings: validators });
		await updateValue(form.$getInputWidget("a"), "");

		for (const type of ["errors", "warnings"]) {
			await expect((form as any)[type].$$all.nth(0)).toHaveText(new RegExp(message));
		}
	});

	test("keeps non live errors when doing only live validation", async () => {
		const validators = getCustom(message, "live");
		const warnings = getCustom(message);
		const formData = {a: "bar"};
		await form.setState({ schema, formData, validators, warnings });
		await updateValue(form.$getInputWidget("a"), "");
		await form.submit();
		await expect(form.$blocker).not.toBeVisible(); // Wait until hidden

		await expect(form.warnings.$$all.nth(0)).toHaveText(new RegExp(message));
		await expect(form.errors.$$all.nth(0)).toHaveText(new RegExp(message));

		await updateValue(form.$getInputWidget("a"), "bar");

		await expect(form.warnings.$$all.nth(0)).toHaveText(new RegExp(message));
		await expect(form.errors.$$all).toHaveCount(0);
		await updateValue(form.$getInputWidget("a"), "");

		for (const type of ["errors", "warnings"]) {
			await expect((form as any)[type].$$all.nth(0)).toHaveText(new RegExp(message));
		}
	});

	test("cached non live errors are cleared when validated again against valid", async () => {
		const validators = getCustom(message, "live");
		const warnings = getCustom(message);
		const formData = {a: "bar"};
		await form.setState({ schema, formData, validators, warnings });
		await updateValue(form.$getInputWidget("a"), "");
		await form.submit();
		await expect(form.$blocker).not.toBeVisible(); // Wait until hidden

		await expect(form.warnings.$$all.nth(0)).toHaveText(new RegExp(message));
		await expect(form.errors.$$all.nth(0)).toHaveText(new RegExp(message));

		await updateValue(form.$getInputWidget("a"), "bar");

		await expect(form.warnings.$$all.nth(0)).toHaveText(new RegExp(message));
		await expect(form.errors.$$all).toHaveCount(0);

		await updateValue(form.$getInputWidget("a"), "");
		await updateValue(form.$getInputWidget("a"), "bar");
		await form.submit();

		for (const type of ["errors", "warnings"]) {
			await expect((form as any)[type].$$all).toHaveCount(0);
		}
	});

	test("runs all validator types on submit", async () => {
		const validators = getCustom(message, "live");
		const _validators = {
			...validators,
			b: validators.a
		};
		const warnings = {
			...validators,
			b: validators.a
		};
		await form.setState({ schema, formData, validators: _validators, warnings });
		await updateValue(form.$getInputWidget("b"), "");
		await form.submit();

		expect(await form.getSubmittedData()).not.toEqual(formData);
		await expect(form.errors.$$all).toHaveCount(2);
		await expect(form.warnings.$$all).toHaveCount(2);
	});

	const response = {
		"error": {
			"statusCode": 422,
			"name": "Error",
			"message": "Unprocessable Entity",
			"details": {
				".a": [
					"mock"
				]
			}
		}
	};

	test("delays submit until async validators complete and doesn't submit when invalid", async () => {
		const validators = {
			a: {
				remote: {
					validator: "mock",
					message
				}
			}
		};

		const {resolve, remove} = await form.setMockResponse("/documents/validate", false);
		const _formData = {...formData, a: "empty isn't async validated so we have value here"};
		await form.setState({ schema, formData: _formData, validators });
		await form.submit();

		expect(await form.getSubmittedData()).not.toEqual(_formData);
		await expect(form.errors.$$all).toHaveCount(0);

		await resolve({status: 422, json: response}, !!"raw");

		await expect(form.errors.$$all).toHaveCount(1);
		await expect(form.errors.$$all.nth(0)).toHaveText(new RegExp(message));
		await remove();
	});

	test("delays submit until async validators complete and submits when valid", async () => {
		const validators = {
			a: {
				remote: {
					validator: "mock",
					message
				}
			}
		};

		const {resolve, remove} = await form.setMockResponse("/documents/validate", false);
		const _formData = {...formData, a: "empty isn't async validated so we have value here"};
		await form.setState({ schema, formData: _formData, validators });
		await form.submit();

		expect(await form.getSubmittedData()).not.toEqual(_formData);
		await expect(form.errors.$$all).toHaveCount(0);

		await resolve({});

		expect(await form.getSubmittedData()).toEqual(_formData);

		await remove();
	});

	test("delays all validators until async operations complete", async () => {
		const validators = {
			a: {
				remote: {
					validator: "mock",
					message
				}
			}
		};

		const {resolve, remove} = await form.setMockResponse("/documents/validate", false);
		const _formData = {...formData, a: "empty isn't async validated so we have value here"};
		await form.setState({ schema, formData: _formData, validators });
		await form.submit();

		expect(await form.getSubmittedData()).not.toEqual(_formData);
		await expect(form.errors.$$all).toHaveCount(0);

		await resolve({status: 422, json: response}, !!"raw");

		await expect(form.errors.$$all).toHaveCount(1);
		await expect(form.errors.$$all.nth(0)).toHaveText(new RegExp(message));

		await remove();
	});

	const uiSchema = {
		c: {
			"ui:field": "ImageArrayField"
		}
	};
	const uiSchemaContext = {
		creator: properties.userId
	};
	const schemaForAsync = {
		...schema,
		properties: {
			...schema.properties,
			c: {
				type: "array",
				items: {
					type: "string"
				}
			}
		}
	};
	const imageUploaded = "imgae uploaded";
	const asyncValidators = {
		b: {
			remote: {
				validator: "mock",
				message
			},
			presence: {
				message,
				options: {
					_live: true
				}
			}
		},
		c: {
			length: {
				maximum: 0,
				message: imageUploaded
			}
		}
	};

	test("validations aren't run when async validation running already", async () => {
		const {resolve, remove} = await form.setMockResponse("/documents/validate", false);
		await form.setState({ schema: schemaForAsync, formData, validators: asyncValidators, uiSchema, uiSchemaContext });

		const {resolve: imageResolve, remove: imageRemove} = await form.mockImageUpload("c");
		await form.submit();

		await expect(form.errors.$$all).toHaveCount(0);

		await imageResolve();

		await expect(form.errors.$$all).toHaveCount(0);

		await resolve({});
		await remove();
		await imageRemove();
	});

	test("revalidates when data is edited during async validation on submit", async () => {
		const {resolve, remove} = await form.setMockResponse("/documents/validate", false);
		await form.setState({ schema: schemaForAsync, formData, validators: asyncValidators, uiSchema, uiSchemaContext });

		const {resolve: imageResolve, remove: imageRemove} = await form.mockImageUpload("c");
		await form.submit();

		await expect(form.errors.$$all).toHaveCount(0);

		await imageResolve();
		await resolve({});
		await expect(form.$blocker).not.toBeVisible(); // Wait until hidden

		await expect(form.errors.$$all).toHaveCount(1);
		await expect(form.errors.$$all.nth(0)).toHaveText(new RegExp(imageUploaded));

		await remove();
		await imageRemove();
	});

	test("shows blocking loader when validating", async () => {
		const {resolve, remove} = await form.setMockResponse("/documents/validate", false);

		await form.setState({ schema, formData, validators: asyncValidators });

		await expect(form.$blocker).not.toBeVisible();

		await form.submit();

		await expect(form.$blocker).toBeVisible();

		await resolve({status: 422, json: response}, !!"raw");

		await expect(form.$blocker).not.toBeVisible();

		await remove();
	});

	test.describe("Custom validation bypass", () => {
		test("skips custom errors and warnings", async () => {
			const validators = getCustom(message);
			await form.setState({ schema, formData, validators, warnings: validators });
			await form.submitOnlySchemaValidations();
			await expect(form.$blocker).not.toBeVisible(); // Wait until hidden

			await expect(form.errors.$$all).toHaveCount(0);
			await expect(form.warnings.$$all).toHaveCount(0);
		});

		test("skips live errors and live warnings", async () => {
			const validators = getCustom(message, "live");
			await form.setState({ schema, formData, validators, warnings: validators });
			await form.submitOnlySchemaValidations();
			await expect(form.$blocker).not.toBeVisible(); // Wait until hidden

			await expect(form.errors.$$all).toHaveCount(0);
			await expect(form.warnings.$$all).toHaveCount(0);
		});

		test("runs schema validations", async ({browser}) => {
			form = await createForm(await browser.newPage());
			await form.setState({ schema: {...schema, required: ["a"]}, formData });
			await form.submitOnlySchemaValidations();
			await expect(form.$blocker).not.toBeVisible(); // Wait until hidden

			await expect(form.errors.$$all).toHaveCount(1);
		});
	});
});
