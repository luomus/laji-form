import { browser, $, $$, protractor, ElementFinder as _ElementFinder, ElementArrayFinder } from "protractor";
import * as path from "path";
import { isObject } from "../src/utils";
import { JSONSchema7 } from "json-schema";
import { LajiFormProps, LajiFormState } from "../src/components/LajiForm";
const { HOST, PORT } = process.env;

const EC = protractor.ExpectedConditions;

export const getLocatorForContextId = (contextId: number) => (path: string) => `#_laji-form_${contextId}_root${typeof path === "string" && path.length ? `_${path.replace(/\./g, "_")}` : ""}`;

export const emptyForm = async (params = "") => browser.get(`http://${HOST}:${PORT}?test=true&settings=false&mockApi=true&${params}`);
export const navigateToForm = async (formID: string, params = "") => browser.get(`http://${HOST}:${PORT}?id=${formID}&local=true&settings=false&mockApi=true${params}`);
export const lajiFormLocator = getLocatorForContextId(0);
export const lajiFormLocate = (str: string) => $(lajiFormLocator(str));

export const getFocusedId = () => browser.driver.switchTo().activeElement().getAttribute("id");

export declare class ElementFinder extends _ElementFinder {
	    then: (fn: (value: any) => any, errorFn?: (error: any) => any) => Promise<any>;
}

export interface Mock {
	resolve: (response?: any, raw?: boolean) => void;
	reject: (response?: any, raw?: boolean) => void;
	remove: () => void;
}

export interface DateWidgetPO {
	$container: ElementFinder;
	$input: ElementFinder;
	buttons: {
		$today: ElementFinder;
		$yesterday: ElementFinder;
	}
}

interface FormProps extends LajiFormProps {
	schema?: JSONSchema7;
	uiSchema?: any;
	formData?: any;
	uiSchemaContext?: any;
	isAdmin?: boolean;
	isEdit?: boolean;
	id?: string;
	localFormData?: boolean;
}

export class Form {
	props: FormProps;
	contextId: number;

	constructor(params: FormProps = {}) {
		this.props = params;
	}

	async initialize() {
		const query = (params: any) => Object.keys(params).reduce((q, key) =>
			`${q}&${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
		, "");
		if (this.props.id) {
			const {id, ..._props} = this.props;
			await navigateToForm(id, query(_props));
		} else {
			await emptyForm();
		}
		await this.setState(this.props);
		this.contextId = await this.e("app.refs.lajiform._id") as number;
	}

	e(path: string) {
		return browser.executeScript(`return window.lajiForm.${path}`) as Promise<any>;
	}

	setState(state: LajiFormProps) {
		const onSubmit = "function(data) {window.submittedData = data.formData;}";
		const onChange = "function(formData) {window.changedData = formData;}";
		return this.e(`setState({onSubmit: ${onSubmit}, onChange: ${onChange}, ...${JSON.stringify(state)}})`);
	}

	getState() {
		return this.e("app.refs.lajiform.state") as Promise<LajiFormState>;
	}

	async submit() {
		await this.e("submit()");
		await waitUntilBlockingLoaderHides();
	}

	async startSubmit() {
		await this.e("submit()");
	}


	waitUntilBlockingLoaderHides(timeout?: number) {
		return waitUntilBlockingLoaderHides(timeout);
	}

	getSubmittedData() {
		return browser.executeScript("return window.submittedData") as Promise<any>;
	}

	getChangedData() {
		return browser.executeScript("return window.changedData") as Promise<any>;
	}

	getPropsData() {
		return this.e("app.refs.lajiform.props.formData") as Promise<any>;
	}

	$locate(path: string) {
		return $(getLocatorForContextId(this.contextId)(path));
	}

	$locateButton(path: string, selector: string) {
		return $(`#root${typeof path === "string" && path.length > 0 ? `_${path.replace(/\./g, "_")}` : ""}-${selector}`);
	}

	$locateAddition(path: string, selector: string) {
		return this.$locateButton(path, selector);
	}

	getMockStr = (path: string, query: any) => `window.mockResponses[window.getMockQueryKey(${JSON.stringify(path)}, ${JSON.stringify(query)})]`;

	async setMockResponse(path: string, query?: any): Promise<Mock> {
		await browser.executeScript(`return window.setMockResponse(${JSON.stringify(path)}, ${JSON.stringify(query)})`);
		const mock = (method: "resolve" | "reject" | "remove", response?: any, raw?: boolean) => browser.executeScript(`return ${this.getMockStr(path, query)}.${method}(${JSON.stringify(response)}, ${JSON.stringify(raw)})`);
		return {
			resolve: (response?: any, raw?: boolean) => mock("resolve", response, raw),
			reject: (response?: any, raw?: boolean) => mock("reject", response, raw),
			remove: () => mock("remove")
		};
	}

	async createMockResponseQueue(path: string, query: any) {
		await browser.executeScript(`return window.createMockResponseQueue(${JSON.stringify(path)}, ${JSON.stringify(query)})`);
		const queueStr = `window.mockQueues[window.getMockQueryKey(${JSON.stringify(path)}, ${JSON.stringify(query)})]`;
		const mock = (method: "resolve" | "reject" | "remove", response: any, raw: boolean, pointer: number) => {
			return browser.executeScript(`return ${this.getMockStr(path, query)}[${pointer}].${method}(${JSON.stringify(response)}, ${JSON.stringify(raw)})`);
		};
		let pointer = 0;
		return {
			create: async () => {
				await browser.executeScript(`return ${queueStr}.create()`);
				const _pointer = pointer;
				pointer = pointer + 1;
				return {
					resolve: (response: any, raw: boolean) => mock("resolve", response, raw, _pointer),
					reject: (response: any, raw: boolean) => mock("reject", response, raw, _pointer),
				};
			},
			remove: () => {
				browser.executeScript(`return ${queueStr}.remove()`);
			}
		};
	}

	createValidatorPO = (type: "error" | "warning") => ({
		$$all: $$(`.laji-form-error-list:not(.laji-form-failed-jobs-list) .${type}-panel .list-group button`),
		$panel: $(`.laji-form-error-list:not(.laji-form-failed-jobs-list) .${type}-panel`)
	})

	errors = this.createValidatorPO("error")
	warnings = this.createValidatorPO("warning")
	failedJobs = {
		$container: $(".laji-form-failed-jobs-list")
	}

	$acknowledgeWarnings = $(".laji-form-warning-list .panel-footer button")

	isBlocked = () => $(".laji-form.blocking-loader").isDisplayed()

	mockImageUpload = async (lajiFormLocator: string) => {
		const filePath = path.resolve(__dirname, "./pixel.png");
		const imageResponse = [{name: "data", filename: "pixel.png", id: "mock", expires: 1575979685}];
		const {resolve, remove} = await this.setMockResponse("/images", false);
		const mdResponse = mockImageMetadata;

		const {resolve: mdResolve, remove: mdRemove} = await this.setMockResponse("/images/mock", false);

		await this.getImageArrayField(lajiFormLocator).$dropzone.$("input").sendKeys(filePath);
		return {
			resolve: async () => {
				await resolve(imageResponse);
				await browser.sleep(200);
				await mdResolve(mdResponse);
			},
			remove: async () => {
				await remove();
				await mdRemove();
			}
		};
	}

	$getCheckboxWidget(str: string): ElementFinder {
		 // @ts-expect-error https://github.com/microsoft/TypeScript/issues/41159
		return this.$locate(str).$(".checkbox-container");
	}

	$getInputWidget(str: string): ElementFinder {
		 // @ts-expect-error https://github.com/microsoft/TypeScript/issues/41159
		return this.$locate(str).$("input");
	}

	$getTextareaWidget(str: string): ElementFinder {
		 // @ts-expect-error https://github.com/microsoft/TypeScript/issues/41159
		return this.$locate(str).$("textarea");
	}

	$getEnumWidget(str: string): ElementFinder {
		 // @ts-expect-error https://github.com/microsoft/TypeScript/issues/41159
		return this.$locate(str).$(".rw-combobox");
	}

	getDateWidget(str: string): DateWidgetPO {
		const $widget = this.$locate(str).$(".date-widget");
		return {
			// @ts-expect-error https://github.com/microsoft/TypeScript/issues/41159
			$container: $widget,
			$input: $widget.$("input") as ElementFinder,
			buttons: {
				$today: $widget.$(".today") as ElementFinder,
				$yesterday: $widget.$("yesterday") as ElementFinder,
			}
		};
	}

	$$getFieldErrors(str: string) {
		return this.$locate(str).$$(".laji-form-error-container li");
	}

	_getImageArrayField = (form: Form) => (lajiFormLocator: string): ImageArrayFieldPOI => new class ImageArrayFieldPO implements ImageArrayFieldPOI {
		$container = form.$locate(lajiFormLocator).$(".laji-form-medias") as ElementFinder;
		$$imgs = form.$locate(lajiFormLocator).$$(".media-container");
		$$imgInteractives = this.$$imgs.$$(".media-container a");
		$$imgRemoves = this.$$imgs.$$(".button-corner");
		$imgRemoveConfirmButton = (id: string) => form.$locateAddition(id, "delete-confirm-yes") as ElementFinder;
		$dropzone = form.$locate(lajiFormLocator).$(".laji-form-drop-zone") as ElementFinder;
		$modal = $(".laji-form.media-modal") as ElementFinder;
		$modalClose = this.$modal.$(".close") as ElementFinder;
	}
	getImageArrayField = this._getImageArrayField(this);
	
	_getTaxonAutosuggestWidget = (form: Form) => (lajiFormLocator: string): TaxonAutosuggestWidgetPOI =>
		new class TaxonAutosuggestWidgetPO implements TaxonAutosuggestWidgetPOI {
			$input = form.$locate(lajiFormLocator).$("input") as ElementFinder;
			$suggestionsContainer = form.$locate(lajiFormLocator).$(".rw-list") as ElementFinder;
			$$suggestions = form.$locate(lajiFormLocator).$$(".rw-list-option");
			waitForSuggestionsToLoad = () => browser.wait(EC.visibilityOf(this.$suggestionsContainer), 5000, "Suggestion list timeout") as Promise<void>;
			waitForGlyph = () => browser.wait(EC.visibilityOf(form.$locate(lajiFormLocator).$(".glyphicon.form-control-feedback")), 5000, "Glyph didn't load") as Promise<void>;
			isSuggested = () => presentAndDisplayed(form.$locate(lajiFormLocator).$(".glyphicon-ok") as ElementFinder);
			isNonsuggested = () => presentAndDisplayed(form.$locate(lajiFormLocator).$(".glyphicon-warning-sign") as ElementFinder);
			$powerUserButton = $(".power-user-addon") as ElementFinder;
			powerUserButtonIsActive = async () => (await this.$powerUserButton.getAttribute("class")).includes("active");
		}
	getTaxonAutosuggestWidget = this._getTaxonAutosuggestWidget(this);

	getScopeField = (lajiFormLocator: string) => ({
		$button: this.$locateButton(lajiFormLocator, "additionals") as ElementFinder,
		$$listItems: this.$locate(lajiFormLocator).$$(".dropdown.open li a")
	})
}

const presentAndDisplayed = async ($elem: ElementFinder) => (await $elem.isPresent()) && (await $elem.isDisplayed());

export interface ImageArrayFieldPOI {
	$container: ElementFinder;
	$$imgs: ElementArrayFinder;
	$$imgInteractives: ElementArrayFinder;
	$$imgRemoves: ElementArrayFinder;
	$imgRemoveConfirmButton: (id: string) => ElementFinder;
	$dropzone: ElementFinder;
	$modal: ElementFinder;
	$modalClose: ElementFinder;
}

export interface TaxonAutosuggestWidgetPOI {
	$input: ElementFinder;
	$suggestionsContainer: ElementFinder;
	$$suggestions: ElementArrayFinder;
	waitForSuggestionsToLoad: () => Promise<void>;
	waitForGlyph: () => Promise<void>;
	isSuggested: () => Promise<boolean>;
	isNonsuggested: () => Promise<boolean>;
	$powerUserButton: ElementFinder;
	powerUserButtonIsActive: () => Promise<boolean>;
}

export async function createForm(props?: FormProps): Promise<Form> {
	const form = new Form(props);
	await form.initialize();
	return form;
}

export function waitUntilBlockingLoaderHides(timeout?: number) {
	return browser.wait(protractor.ExpectedConditions.invisibilityOf($(".laji-form.blocking-loader")), timeout || 20000, "Geocoding timeout");
}

export async function putForeignMarkerToMap() {
	const $gatheringsMap = lajiFormLocate("gatherings").$(".laji-map");
	const $markerButton = $(".leaflet-draw-draw-marker");
	await $markerButton.click();

	await browser.actions().mouseMove($gatheringsMap.getWebElement(), {x: -100, y: -100}).perform();
	await browser.actions().click().perform();
}

export async function removeUnit(gatheringIdx: number, unitIdx: number) {
	await $(`#root_gatherings_${gatheringIdx}_units_${unitIdx}-delete`).click();
	return $(`#root_gatherings_${gatheringIdx}_units_${unitIdx}-delete-confirm-yes`).click();
}

const _mockGeo = (lat: number, lon: number) => `window.navigator.geolocation.getCurrentPosition =
	function (success, error) {
		success({
			coords : {
				latitude: ${lat},
				longitude: ${lon}
			}
		})
	}
`;

export const mockGeo = (lat: number, lon: number) => browser.executeScript(_mockGeo(lat, lon));

const _mockGeoError = (code?: string) => `window.navigator.geolocation.getCurrentPosition =
	function (success, error) {
		error({
			code: ${code},
			PERMISSION_DENIED: 1,
			POSITION_UNAVAILABLE: 2,
			TIMEOUT: 3
		});
	}
`;

export const mockGeoError = (code?: string) => browser.executeScript(_mockGeoError(code));

export async function getWidget(str: string): Promise<ElementFinder> {
	const $afterLabel = $(`${lajiFormLocator(str)} > div > div`);
	if (await $afterLabel.isPresent()) {
		 // @ts-expect-error https://github.com/microsoft/TypeScript/issues/41159
		return $afterLabel;
	}
	const $afterLabelNotSoDeep = $(`${lajiFormLocator(str)} > div`);
	if (await $afterLabelNotSoDeep.isPresent()) {
		// @ts-expect-error https://github.com/microsoft/TypeScript/issues/41159
		return $afterLabelNotSoDeep;
	}
	const $insideLabel = $(`${lajiFormLocator(str)} > div > label > div`);
	// @ts-expect-error https://github.com/microsoft/TypeScript/issues/41159
	return $insideLabel;
}

export const updateValue = async ($input: ElementFinder, value: string, blur = true): Promise<void> => {
	const current = await $input.getAttribute("value");
	await $input.sendKeys("\b".repeat((current || "").length) + value);
	if (blur) {
		return $input.sendKeys(protractor.Key.TAB);
	}
};

export const mockImageMetadata = {
	"id": "mock",
	"capturerVerbatim": [
		"mock"
	],
	"intellectualOwner": "mock",
	"intellectualRights": "MZ.intellectualRightsCC-BY-SA-4.0",
	"fullURL": "https://imagetest.laji.fi/MM.97056/pixel_full.jpg",
	"largeURL": "https://imagetest.laji.fi/MM.97056/pixel_large.jpg",
	"squareThumbnailURL": "https://imagetest.laji.fi/MM.97056/pixel_square.jpg",
	"thumbnailURL": "https://imagetest.laji.fi/MM.97056/pixel_thumb.jpg",
	"originalURL": "https://imagetest.laji.fi/MM.97056/pixel.png",
	"uploadedBy": "MA.308",
	"@context": "http://schema.laji.fi/context/image-en.jsonld"
};

export const filterUUIDs = (any: any): any => {
	if (isObject(any)) {
		return Object.keys(any).filter(key => key !== "_lajiFormId").reduce((_any, key) => ({
			..._any,
			[key]: filterUUIDs(any[key])
		}), {});
	} else if (Array.isArray(any)) {
		return any.map(filterUUIDs);
	}
	return any;
};

export const maybeJSONPointerToLocator = (pointer: string) => pointer[0] === "/" ? pointer.slice(1).replace(/\//g, "_") : pointer;
