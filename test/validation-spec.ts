import { Form, createForm, updateValue, waitUntilBlockingLoaderHides } from "./test-utils";
const properties = require("../properties.json");

describe("Validations", () => {

	let form: Form;

	// Uncomment when https://github.com/rjsf-team/react-jsonschema-form/pull/1528 is merged.
	//beforeAll(async () => {
	beforeEach(async () => {
		form = await createForm();
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

	it("pass on no errors", async () => {
		await form.setState({ schema, formData });
		await form.submit();

		expect(await form.getSubmittedData()).toEqual(formData);
	});


	it("fail on schema errors", async () => {
		await form.setState({ schema: {...schema, required: ["a"]}, formData });
		await form.submit();

		expect(await form.getSubmittedData()).not.toEqual(formData);
		expect(await form.errors.$$all.count()).toBe(1);
	});

	it("doesn't run schema validators before submitted", async () => {
		const _formData = {...formData, a: "foo"};
		await form.setState({ schema: {...schema, required: ["a"]}, formData: _formData });
		await updateValue(form.$getInputWidget("a"), "");

		expect(await form.errors.$$all.count()).toBe(0);


		await form.submit();

		expect(await form.errors.$$all.count()).toBe(1);
	});

	it("fail on custom errors", async () => {
		const validators = getCustom();
		const formData = {};
		await form.setState({ schema, formData, validators });
		await form.submit();

		expect(await form.getSubmittedData()).not.toEqual(formData);
		expect(await form.errors.$$all.get(0).getText()).toBe(message);
	});

	describe("warnings", () => {

		it("prevent submit", async () => {
			const warnings = getCustom();
			debugger;
			await form.setState({ schema, formData, warnings });
			debugger;
			await form.submit();

			expect(await form.getSubmittedData()).not.toEqual(formData);
			expect(await form.warnings.$$all.get(0).getText()).toBe(message);
		});
	
		it("can be submitted via warnings-acknowledged-submit button", async() => {
			const warnings = getCustom();
			await form.setState({ schema, formData, warnings });
			await form.submit();
			await waitUntilBlockingLoaderHides();
			await form.$acknowledgeWarnings.click();

			expect(await form.getSubmittedData()).toEqual(formData);
		});
	});

	[["errors", "validators"], ["warnings", "warnings"]].forEach(([type, propName]) => {
		it(`doesn't run ${type} live validators on init`, async () => {
			const validators = getCustom(message, "live");
			const formData = {};
			await form.setState({ schema, formData, [propName]: validators });

			expect(await (form as any)[type].$panel.isPresent()).toBe(false);
		});

		it(`runs live ${type} validators on onChange`, async () => {
			const validators = getCustom(message, "live");
			const formData = {a: "bar"};
			await form.setState({ schema, formData, [propName]: validators });
			await updateValue(form.$getInputWidget("a"), "");

			expect(await (form as any)[type].$$all.get(0).getText()).toBe(message);
		});
	});

	it("doesn't show blocker during live validation", async () => {
		const validators = getCustom(message, "live");
		const formData = {a: "bar"};
		await form.setState({ schema, formData, validators });
		await updateValue(form.$getInputWidget("a"), "");

		expect (await form.isBlocked()).toBe(false);
	});

	it("runs both validators and warnings live on Change", async () => {
		const validators = getCustom(message, "live");
		const formData = {a: "bar"};
		await form.setState({ schema, formData, validators, warnings: validators });
		await updateValue(form.$getInputWidget("a"), "");

		for (const type of ["errors", "warnings"]) {
			expect(await (form as any)[type].$$all.get(0).getText()).toBe(message);
		}
	});

	it("keeps non live errors when doing only live validation", async () => {
		const validators = getCustom(message, "live");
		const warnings = getCustom(message);
		const formData = {a: "bar"};
		await form.setState({ schema, formData, validators, warnings });
		await updateValue(form.$getInputWidget("a"), "");
		await form.submit();
		await waitUntilBlockingLoaderHides();

		expect(await form.warnings.$$all.get(0).getText()).toBe(message);
		expect(await form.errors.$$all.get(0).getText()).toBe(message);

		await updateValue(form.$getInputWidget("a"), "bar");

		expect(await form.warnings.$$all.get(0).getText()).toBe(message);
		expect(await form.errors.$$all.count()).toBe(0);
		await updateValue(form.$getInputWidget("a"), "");

		for (const type of ["errors", "warnings"]) {
			expect(await (form as any)[type].$$all.get(0).getText()).toBe(message);
		}
	});

	it("cached non live errors are cleared when validated again against valid", async () => {
		const validators = getCustom(message, "live");
		const warnings = getCustom(message);
		const formData = {a: "bar"};
		await form.setState({ schema, formData, validators, warnings });
		await updateValue(form.$getInputWidget("a"), "");
		await form.submit();
		await waitUntilBlockingLoaderHides();

		expect(await form.warnings.$$all.get(0).getText()).toBe(message);
		expect(await form.errors.$$all.get(0).getText()).toBe(message);

		await updateValue(form.$getInputWidget("a"), "bar");

		expect(await form.warnings.$$all.get(0).getText()).toBe(message);
		expect(await form.errors.$$all.count()).toBe(0);

		await updateValue(form.$getInputWidget("a"), "");
		await updateValue(form.$getInputWidget("a"), "bar");
		await form.submit();

		for (const type of ["errors", "warnings"]) {
			expect(await (form as any)[type].$$all.count()).toBe(0);
		}
	});

	it("runs all validator types on submit", async () => {
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
		expect(await form.errors.$$all.count()).toBe(2);
		expect(await form.warnings.$$all.count()).toBe(2);
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

	it("delays submit until async validators complete and doesn't submit when invalid", async () => {
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
		await form.startSubmit();

		expect(await form.getSubmittedData()).not.toEqual(_formData);
		expect(await form.errors.$$all.count()).toBe(0);

		await resolve({status: 422, json: response}, !!"raw");

		expect(await form.errors.$$all.count()).toBe(1);
		expect(await form.errors.$$all.get(0).getText()).toBe(message);
		await remove();
	});

	it("delays submit until async validators complete and submits when valid", async () => {
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
		await form.startSubmit();

		expect(await form.getSubmittedData()).not.toEqual(_formData);
		expect(await form.errors.$$all.count()).toBe(0);

		await resolve({});

		expect(await form.getSubmittedData()).toEqual(_formData);

		await remove();
	});

	it("delays all validators until async operations complete", async () => {
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
		await form.startSubmit();

		expect(await form.getSubmittedData()).not.toEqual(_formData);
		expect(await form.errors.$$all.count()).toBe(0);

		await resolve({status: 422, json: response}, !!"raw");

		expect(await form.errors.$$all.count()).toBe(1);
		expect(await form.errors.$$all.get(0).getText()).toBe(message);

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

	it("validations aren't run when async validation running already", async () => {
		const {resolve, remove} = await form.setMockResponse("/documents/validate", false);
		await form.setState({ schema: schemaForAsync, formData, validators: asyncValidators, uiSchema, uiSchemaContext });

		const {resolve: imageResolve, remove: imageRemove} = await form.mockImageUpload("c");
		await form.startSubmit();

		expect(await form.errors.$$all.count()).toBe(0);

		await imageResolve();

		expect(await form.errors.$$all.count()).toBe(0);

		await resolve({});
		await remove();
		await imageRemove();
	});

	it("revalidates when data is edited during async validation on submit", async () => {
		const {resolve, remove} = await form.setMockResponse("/documents/validate", false);
		await form.setState({ schema: schemaForAsync, formData, validators: asyncValidators, uiSchema, uiSchemaContext });

		const {resolve: imageResolve, remove: imageRemove} = await form.mockImageUpload("c");
		await form.startSubmit();

		expect(await form.errors.$$all.count()).toBe(0);

		await imageResolve();
		await resolve({});
		await waitUntilBlockingLoaderHides();

		expect(await form.errors.$$all.count()).toBe(1);
		expect(await form.errors.$$all.get(0).getText()).toBe(imageUploaded);

		await remove();
		await imageRemove();
	});

	it("shows blocking loader when validating", async () => {
		const {resolve, remove} = await form.setMockResponse("/documents/validate", false);

		await form.setState({ schema, formData, validators: asyncValidators });

		expect (await form.isBlocked()).toBe(false);

		await form.startSubmit();

		expect (await form.isBlocked()).toBe(true);

		await resolve({status: 422, json: response}, !!"raw");
		await waitUntilBlockingLoaderHides();

		expect (await form.isBlocked()).toBe(false);

		await remove();
	});

	describe("Custom validation bypass", () => {
		it("skips custom errors and warnings", async () => {
			const validators = getCustom(message);
			await form.setState({ schema, formData, validators, warnings: validators });
			await form.submitOnlySchemaValidations();
			await form.waitUntilBlockingLoaderHides();

			expect(await form.errors.$$all.count()).toBe(0);
			expect(await form.warnings.$$all.count()).toBe(0);
		});

		it("skips live errors and live warnings", async () => {
			const validators = getCustom(message, "live");
			await form.setState({ schema, formData, validators, warnings: validators });
			await form.submitOnlySchemaValidations();
			await form.waitUntilBlockingLoaderHides();

			expect(await form.errors.$$all.count()).toBe(0);
			expect(await form.warnings.$$all.count()).toBe(0);
		});

		it("runs schema validations", async () => {
			form = await createForm();
			await form.setState({ schema: {...schema, required: ["a"]}, formData });
			await form.submitOnlySchemaValidations();
			await form.waitUntilBlockingLoaderHides();

			expect(await form.errors.$$all.count()).toBe(1);
		});
	});
});
