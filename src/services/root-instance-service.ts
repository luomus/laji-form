import ErrorListTemplate from "../components/templates/ErrorListTemplate";

/**
 * Used to access the root LajiForm instance from a child component.
 */
export default class RootInstanceService {
	private schema: any;
	private formData: any;
	private onChangeCallback: (formData: any) => void;
	private validateCallback: () => void;
	private submitWithWarningsCallback: () => void;
	private mounted = false;
	private errorListInstance: ErrorListTemplate;
	constructor(schema: any, formData: any, onChange: (formData: any) => void, validate: () => void, submitWithWarnings: () => void) {
		this.schema = schema;
		this.formData = formData;
		this.onChangeCallback = onChange;
		this.validate = validate;
		this.submitWithWarningsCallback = submitWithWarnings;
	}

	setFormData(formData: any) {
		this.formData = formData;
	}

	getFormData() {
		return this.formData;
	}

	onChange(formData: any) {
		this.onChangeCallback(formData);
	}

	setSchema(schema: any) {
		this.schema = schema;
	}

	getSchema() {
		return this.schema;
	}

	validate() {
		this.validateCallback();
	}

	submitWithWarnings() {
		this.submitWithWarningsCallback();
	}

	setIsMounted(mounted: boolean) {
		this.mounted = mounted;
	}

	isMounted() {
		return this.mounted;
	}

	setErrorListInstance(instance: ErrorListTemplate) {
		this.errorListInstance = instance;
	}
	getErrorListInstance() {
		return this.errorListInstance;
	}

}
