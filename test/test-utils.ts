import { Locator, Page } from "@playwright/test";
import * as path from "path";
import { JSONSchema7 } from "json-schema";
import { MapPageObject } from "@luomus/laji-map/test-export/test-utils";

export const emptyForm = async (page: Page, params = "") => page.goto(`/?test=true&settings=false&mockApi=true&${params}`);
export const navigateToForm = async (page: Page, formID: string, params = "") => page.goto(`/?id=${formID}&local=true&settings=false&mockApi=true${params}`);
export const lajiFormLocator = (path: string) => `#_laji-form_root${typeof path === "string" && path.length ? `_${path.replace(/\./g, "_")}` : ""}`;
export const lajiFormLocate = (page: Page, str: string) => page.locator(lajiFormLocator(str));

export const getFocusedElement = (page: Page) => page.locator("*:focus");
export const getFocusedId = (page: Page) => getFocusedElement(page).getAttribute("id");

export interface Mock {
	resolve: (response?: any, raw?: boolean) => Promise<void>;
	reject: (response?: any, raw?: boolean) => Promise<void>;
	remove: () => Promise<void>;
}

export interface DateWidgetPO {
	$container: Locator;
	$input: Locator;
	buttons: {
		$today: Locator;
		$yesterday: Locator;
		$same: Locator;
		$date: Locator;
		$time: Locator;
	}
	calendar: {
		$today: Locator;
	},
	clock: {
		"$01:00": Locator;
	}
}

export interface BooleanWidgetPO {
	$container: Locator;
	$true: Locator;
	$false: Locator;
	$undefined: Locator;
	$active: Locator;
	$nonactive: Locator;
}

export type EnumWidgetPOI = ReturnType<typeof getEnumWidgetForContainer>

function getEnumWidgetForContainer($container: Locator) {
	return {
		$container,
		openEnums: () => $container.click(),
		$enumContainer: $container.locator(".rw-popup-container"),
		$$enums: $container.locator(".rw-list-option"),
		$input: $container.locator("input")
	};
}

interface DemoPageProps {
	schema?: JSONSchema7;
	uiSchema?: any;
	formData?: any;
	uiSchemaContext?: any;
	isAdmin?: boolean;
	isEdit?: boolean;
	id?: string;
	localFormData?: boolean | string;
}

export class Form {
	constructor(protected page: Page, protected $locator = page.locator(".laji-form")) { }

	$form = this.$locator.locator(".rjsf");

	$locate(path: string) {
		return this.$locator.locator(lajiFormLocator(path));
	}

	$locateButton(path: string, selector: string, locateFromBody = false) {
		return (locateFromBody ? this.page : this.$locator).locator(`#root${typeof path === "string" && path.length > 0 ? `_${path.replace(/\./g, "_")}` : ""}-${selector}`);
	}

	$locateAddition(path: string, selector: string, locateFromBody = false) {
		return this.$locateButton(path, selector, locateFromBody);
	}

	getMockStr = (path: string, query: any) => `window.mockResponses[window.getMockQueryKey(${JSON.stringify(path)}, ${JSON.stringify(query)})]`;

	async setMockResponse(path: string, query?: any): Promise<Mock> {
		await this.page.evaluate(`window.setMockResponse(${JSON.stringify(path)}, ${JSON.stringify(query)})`);
		const mock = (method: "resolve" | "reject" | "remove", response?: any, raw?: boolean) =>
			this.page.evaluate<void>(
				`${this.getMockStr(path, query)}.${method}(${JSON.stringify(response)}, ${JSON.stringify(raw)})`
			);
		return {
			resolve: (response?: any, raw?: boolean) => mock("resolve", response, raw),
			reject: (response?: any, raw?: boolean) => mock("reject", response, raw),
			remove: () => mock("remove")
		};
	}

	async createMockResponseQueue(path: string, query?: any) {
		await this.page.evaluate(`window.createMockResponseQueue(${JSON.stringify(path)}, ${JSON.stringify(query)})`);
		const queueStr = `window.mockQueues[window.getMockQueryKey(${JSON.stringify(path)}, ${JSON.stringify(query)})]`;
		const mock = (method: "resolve" | "reject" | "remove", response: any, raw: boolean | undefined, pointer: number) => {
			return this.page.evaluate(`${this.getMockStr(path, query)}[${pointer}].${method}(${JSON.stringify(response)}, ${JSON.stringify(raw)})`);
		};
		let pointer = 0;
		return {
			create: async () => {
				await this.page.evaluate(`${queueStr}.create()`);
				const _pointer = pointer;
				pointer = pointer + 1;
				return {
					resolve: (response: any, raw?: boolean) => mock("resolve", response, raw, _pointer),
					reject: (response: any, raw?: boolean) => mock("reject", response, raw, _pointer),
				};
			},
			remove: () => this.page.evaluate(`${queueStr}.remove()`)
		};
	}

	createValidatorPO = (type: "error" | "warning") => ({
		$$all: this.$locator.locator(`.laji-form-error-list:not(.laji-form-failed-jobs-list) .${type}-panel .list-group button`),
		$panel: this.$locator.locator(`.laji-form-error-list:not(.laji-form-failed-jobs-list) .${type}-panel`)
	})

	errors = this.createValidatorPO("error")
	warnings = this.createValidatorPO("warning")
	failedJobs = {
		$container: this.$locator.locator(".laji-form-failed-jobs-list"),
		$$errors: this.$locator.locator(".laji-form-failed-jobs-list .list-group-item")
	}

	$runningJobs = this.$locator.locator(".running-jobs");

	$acknowledgeWarnings = this.$locator.locator(".laji-form-warning-list .panel-footer button")
	$blocker = this.page.locator(".laji-form.blocking-loader");
	$mapFieldFullscreenMap = this.$locator.locator(".laji-form.fullscreen .laji-form-map");

	getBooleanWidget(str: string) {
		const $container = this.$locate(str).locator(".btn-toolbar");
		return {
			$container,
			$true: $container.locator(".btn").nth(0), // eslint-disable-line  protractor/use-first-last
			$false: $container.locator(".btn").nth(1),
			$undefined: this.$locate(str).locator(".btn").nth(2),
			$active: $container.locator(".btn.active"),
			$nonactive: $container.locator(".btn:not(.active)").first()
		};
	}

	$getInputWidget(str: string) {
		return this.$locate(str).locator("input");
	}

	$getTextareaWidget(str: string) {
		return this.$locate(str).locator("textarea");
	}

	$getEnumWidget(str: string){
		const $container = this.$locate(str).locator(".rw-combobox");
		return getEnumWidgetForContainer($container);
	}

	getDateWidget(str: string) {
		const $widget = this.$locate(str).locator(".date-widget");
		return {
			$container: $widget,
			$input: $widget.locator("input"),
			buttons: {
				$today: $widget.locator(".today"),
				$yesterday: $widget.locator(".yesterday"),
				$same: $widget.locator(".same"),
				$date: $widget.locator(".rw-i-calendar"),
				$time: $widget.locator(".rw-i-clock-o")
			},
			calendar: {
				$today: $widget.locator(".rw-calendar-footer button"),
			},
			clock: {
				"$01:00": $widget.locator(".rw-list li").nth(2),
			}
		};
	}

	$getFieldErrors(str: string) {
		return this.$locate(str).locator(".laji-form-error-container li");
	}

	getImageArrayField = (lajiFormLocator: string) => {
		const $container = this.$locate(lajiFormLocator).locator(".laji-form-medias");
		const $imgContainers = this.$locate(lajiFormLocator).locator(".media-container");
		const $modal = this.page.locator(".laji-form.media-modal");
		const $addModal = this.page.locator(".laji-form.media-add-modal");
		return {
			$container,
			$imgContainers,
			$$imgs: $imgContainers.locator("img"),
			$$imgLoading: $imgContainers.locator(".react-spinner"),
			$$imgRemoves: $imgContainers.locator(".button-corner"),
			$imgRemoveConfirmButton: (id: string) => this.$locateAddition(id, "delete-confirm-yes", true),
			$dropzone: this.$locate(lajiFormLocator).locator(".laji-form-drop-zone"),
			$modal,
			$addModal,
			$modalClose: $modal.locator(".modal-header .close"),
			$addModalCancel: $addModal.locator(".cancel")
		};
	}

	getAutosuggestWidget = (lajiFormLocator: string) => {
		return {
			$input: this.$locate(lajiFormLocator).locator("input"),
			$suggestionsContainer: this.$locate(lajiFormLocator).locator(".rw-list"),
			$suggestions: this.$locate(lajiFormLocator).locator(".rw-list-option"),
		};
	}

	getTaxonAutosuggestWidget = (lajiFormLocator: string) => {
		const autosuggest = this.getAutosuggestWidget(lajiFormLocator);
		return {
			...autosuggest,
			$powerUserButton: this.$locator.locator(".power-user-addon"),
			$suggestedGlyph: this.$locate(lajiFormLocator).locator(".glyphicon-ok"),
			$nonsuggestedGlyph: this.$locate(lajiFormLocator).locator(".glyphicon-warning-sign"),
		};
	}

	getPersonAutosuggestWidget = (lajiFormLocator: string) => {
		const autosuggest = this.getAutosuggestWidget(lajiFormLocator);
		return {
			...autosuggest,
			$suggestedGlyph: this.$locate(lajiFormLocator).locator(".glyphicon-user")
		};
	}

	getScopeField = (lajiFormLocator: string) => ({
		$button: this.$locateButton(lajiFormLocator, "additionals"),
		$$listItems: this.$locate(lajiFormLocator).locator(".dropdown.open li a"),
		modal: {
			$container: this.page.locator(".scope-field-modal"),
			$close: this.page.locator(".scope-field-modal .close"),
			$$loadingGroups: this.page.locator(".scope-field-modal .list-group .react-spinner"),
			$$groupTitles: this.page.locator(".scope-field-modal .list-group .list-group-item strong"),
			$$listItems: this.page.locator(".scope-field-modal .list-group-item"),
		}
	});

	getLocationChooser = (lajiFormLocator: string) => {
		const $peeker = this.$locateButton(lajiFormLocator, "location-peeker", true);
		return {
			$button: this.$locateButton(lajiFormLocator, "location"),
			modal: {
				$container: this.page.locator(".map-dialog"),
				map: new MapPageObject(this.page, this.page.locator(".map-dialog .laji-map"))
			},
			peeker: {
				$popover: $peeker,
				$map: $peeker.locator(".laji-map"),
				$$markers: $peeker.locator(".vector-marker path"),
			}
		};
	};

	getUnitListShorthandArrayField = (lajiFormLocator: string) => ({
		$button: this.$locateButton(lajiFormLocator, "addUnitList"),
		modal: {
			$input: this.page.locator(".unit-list-shorthand-modal input"),
			$addButton: this.page.locator(".unit-list-shorthand-modal button")
		}
	});

	$getShortHandWidget = (lajiFormLocator: string) => this.$locateAddition(lajiFormLocator, "shortHandText");

	getGeocoder = (lajiFormLocator = "") => ({
		$btn: this.$locate(lajiFormLocator).locator(".geocoder-btn"),
		$spinner: this.$locate(lajiFormLocator).locator(".geocoder-btn .react-spinner")
	});

	getNamedPlaceChooser = () => {
		const $namedPlaceChooserModal = this.page.locator(".named-place-chooser-modal");
		const $mapPopupContainer = this.page.locator(".named-place-popup");
		return {
			select: getEnumWidgetForContainer(this.page.locator("#named-place-chooser-select")),
			mapPopup: {
				$container: $mapPopupContainer,
				$useBtn: $mapPopupContainer.locator(".btn-default")
			},
			$alert: $namedPlaceChooserModal.locator(".alert"),
			$close: $namedPlaceChooserModal.locator(".close")
		};
	};


	/** Draws a marker to the center of a laji-map rendered to the given locator. The locator defaults to "gatherings" */
	async putMarkerToMap(lajiFormLocator = "gatherings") {
		const $map = this.$locate(lajiFormLocator).locator(".laji-map");
		await $map.scrollIntoViewIfNeeded();
		const map = new MapPageObject(this.page, $map);
		await map.drawMarker();
	}
}


export type ImageArrayFieldPOI = ReturnType<Form["getImageArrayField"]>;
export type TaxonAutosuggestWidgetPOI = ReturnType<Form["getTaxonAutosuggestWidget"]>;
export type UnitListShorthandArrayFieldPOI = ReturnType<Form["getUnitListShorthandArrayField"]>;
export type NamedPlaceChooserPO = ReturnType<Form["getNamedPlaceChooser"]>;

export class DemoPageForm extends Form {
	constructor(page: Page, private props?: DemoPageProps) {
		super(page);
	}

	async initialize(beforeInit?: (form: Form) => Promise<void>) {
		const query = (params: any) => Object.keys(params).reduce((q, key) =>
			`${q}&${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
		, "");
		if (this.props?.id) {
			const {id, ..._props} = this.props;
			await navigateToForm(this.page, id, query(_props));
		} else {
			await emptyForm(this.page);
		}
		beforeInit && await beforeInit(this);
		await this.setState(this.props);
	}

	e(path: string) {
		return this.page.evaluate(`window.lajiForm.${path}`) as Promise<any>;
	}

	setState(state: any) {
		const onSubmit = "function(data) {window.submittedData = data.formData;}";
		const onChange = "function(formData) {window.changedData = formData;}";
		return this.e(`setState({onSubmit: ${onSubmit}, onChange: ${onChange}, ...${JSON.stringify(state)}})`);
	}

	getState() {
		return this.page.evaluate(() => {
			const { formData } = (window as any).lajiForm.lajiForm.state;
			return { formData };
		});
	}

	async submit() {
		await this.e("submit()");
	}

	startSubmit() {
		this.e("submit()");
	}

	submitOnlySchemaValidations() {
		return this.e("submitOnlySchemaValidations()");
	}

	getSubmittedData() {
		return this.page.evaluate("window.submittedData") as Promise<any>;
	}

	getChangedData() {
		return this.page.evaluate("window.changedData") as Promise<any>;
	}

	getPropsData() {
		return this.e("lajiForm.props.formData") as Promise<any>;
	}

	mockImageUpload = async (lajiFormLocator: string) => {
		const filePath = path.resolve(__dirname, "./mock/pixel.png");
		const imageResponse = [{name: "data", filename: "pixel.png", id: "mock", expires: 1575979685}];
		const {resolve, remove} = await this.setMockResponse("/images", false);
		const mdResponse = mockImageMetadata;

		const {resolve: mdResolve, remove: mdRemove} = await this.setMockResponse("/images/mock", false);

		await this.getImageArrayField(lajiFormLocator).$dropzone.locator("input").setInputFiles(filePath);
		return {
			resolve: async () => {
				await resolve(imageResponse);
				await mdResolve(mdResponse);
			},
			remove: async () => {
				await remove();
				await mdRemove();
			}
		};
	}
}

export async function createForm(page: Page, props?: DemoPageProps, beforeInit?: (form: Form) => Promise<void>): Promise<DemoPageForm> {
	const form = new DemoPageForm(page, props);
	await form.initialize(beforeInit);
	return form;
}

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
	if (typeof any === "object" && !Array.isArray(any) && any !== null) {
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

/** Fills value into given input and presses tab to unfocus it. Useful for inputs with debounce */
export const updateValue = async ($input: Locator, value: string) => {
	await $input.fill(value);
	await $input.press("Tab");
};

export const getRemoveUnit = (page: Page) => async (gatheringIdx: number, unitIdx: number) => {
	await page.locator(`#root_gatherings_${gatheringIdx}_units_${unitIdx}-delete`).click();
	return page.locator(`#root_gatherings_${gatheringIdx}_units_${unitIdx}-delete-confirm-yes`).click();
}
;
