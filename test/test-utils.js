const path = require("path");
const { isObject } = require("../lib/utils");
const { HOST, PORT } = process.env;

function getJsonFromUrl() {
	  var query = location.search.substr(1);
	  var result = {};
	  query.split("&").forEach(function(part) {
			    var item = part.split("=");
			    result[item[0]] = decodeURIComponent(item[1]);
			  });
	  return result;
}

const getLocatorForContextId = contextId => path => `#_laji-form_${contextId}_root${typeof path === "string" && path.length ? `_${path.replace(/\./g, "_")}` : ""}`;

const emptyForm = async (params = "") => browser.get(`http://${HOST}:${PORT}?test=true&settings=false&mockApi=true&${params}`);
const navigateToForm = async (formID, params = "") => browser.get(`http://${HOST}:${PORT}?id=${formID}&local=true&settings=false&mockApi=true${params}`);
const lajiFormLocator = getLocatorForContextId(0);
const lajiFormLocate = str => $(lajiFormLocator(str));

const getFocusedId = () => browser.driver.switchTo().activeElement().getAttribute("id");

class Form {
	constructor(params = {}) {
		this.props = params;
	}

	async initialize() {
		const query = params => Object.keys(params).reduce((q, key) =>
			`${q}&${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
		, "");
		if (this.props.id) {
			const {id, ..._props} = this.props;
			await navigateToForm(id, query(_props));
		} else {
			await emptyForm();
		}
		await this.setState(this.props);
		this.contextId = await this.e("app.refs.lajiform._id");
	}

	e(path) {
		return browser.executeScript(`return window.lajiForm.${path}`);
	}

	setState(state) {
		const onSubmit = "function(data) {window.submittedData = data.formData;}";
		const onChange = "function(formData) {window.changedData = formData;}";
		return this.e(`setState({onSubmit: ${onSubmit}, onChange: ${onChange}, ...${JSON.stringify(state)}})`);
	}

	getState() {
		return this.e("app.refs.lajiform.state");
	}

	async submit() {
		await this.e("submit()");
		return waitUntilBlockingLoaderHides();
	}

	startSubmit() {
		return this.e("submit()");
	}

	getSubmittedData() {
		return browser.executeScript("return window.submittedData");
	}

	getChangedData() {
		return browser.executeScript("return window.changedData");
	}

	getPropsData() {
		return this.e("app.refs.lajiform.props.formData");
	}

	$locate(path) {
		return $(getLocatorForContextId(this.contextId)(path));
	}

	$locateButton(path, selector) {
		return $(`#root${typeof path === "string" && path.length > 0 ? `_${path.replace(/\./g, "_")}` : ""}-${selector}`)
	}

	$locateAddition(path, selector) {
		return this.$locateButton(path, selector);
	}

	getMockStr = (path, query) => `window.mockResponses[window.getMockQueryKey(${JSON.stringify(path)}, ${JSON.stringify(query)})]`;

	async setMockResponse(path, query) {
		await browser.executeScript(`return window.setMockResponse(${JSON.stringify(path)}, ${JSON.stringify(query)})`);
		const mock = (method, response, raw) => browser.executeScript(`return ${this.getMockStr(path, query)}.${method}(${JSON.stringify(response)}, ${JSON.stringify(raw)})`);
		return {
			resolve: (response, raw) => mock("resolve", response, raw),
			reject: (response, raw) => mock("reject", response, raw),
			remove: () => mock("remove")
		};
	}

	async createMockResponseQueue(path, query) {
		await browser.executeScript(`return window.createMockResponseQueue(${JSON.stringify(path)}, ${JSON.stringify(query)})`);
		const queueStr = `window.mockQueues[window.getMockQueryKey(${JSON.stringify(path)}, ${JSON.stringify(query)})]`;
		const mock = (method, response, raw, pointer) => {
			return browser.executeScript(`return ${this.getMockStr(path, query)}[${pointer}].${method}(${JSON.stringify(response)}, ${JSON.stringify(raw)})`);
		};
		let pointer = 0;
		return {
			create: async () => {
				await browser.executeScript(`return ${queueStr}.create()`);
				const _pointer = pointer;
				pointer = pointer + 1;
				return {
					resolve: (response, raw) => mock("resolve", response, raw, _pointer),
					reject: (response, raw) => mock("reject", response, raw, _pointer),
				};
			},
			remove: () => {
				browser.executeScript(`return ${queueStr}.remove()`);
			}
		};
	}

	createValidatorPO = (type) => ({
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

	mockImageUpload = async (lajiFormLocator) => {
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
	$getCheckboxWidget = (str) => {
		return this.$locate(str).$(".checkbox-container");
	}
	$getInputWidget = (str) => {
		return this.$locate(str).$("input");
	}
	$getTextareaWidget = (str) => {
		return this.$locate(str).$("textarea");
	}
	$getEnumWidget = (str) => {
		return this.$locate(str).$(".rw-combobox");
	}
	getDateWidget = (str) => {
		const $widget = this.$locate(str).$(".date-widget");
		return {
			$container: $widget,
			$input: $widget.$("input"),
			buttons: {
				$today: $widget.$(".today"),
				$yesterday: $widget.$("yesterday"),
			}
		};
	}
	$$getFieldErrors = (str) => {
		return this.$locate(str).$$(".laji-form-error-container li");
	}
	_getImageArrayField = (form) => (lajiFormLocator) => new class ImageArrayFieldPO {
		$container = form.$locate(lajiFormLocator).$(".laji-form-medias");
		$$imgs = form.$locate(lajiFormLocator).$$(".media-container");
		$$imgInteractives = this.$$imgs.$$(".media-container a");
		$$imgRemoves = this.$$imgs.$$(".button-corner");
		$imgRemoveConfirmButton = (id) => form.$locateAddition(id, "delete-confirm-yes");
		$dropzone = form.$locate(lajiFormLocator).$(".laji-form-drop-zone");
		$modal = $(".laji-form.media-modal");
		$modalClose = this.$modal.$(".close");
	}
	getImageArrayField = this._getImageArrayField(this);
}

async function createForm(props) {
	const form = new Form(props);
	await form.initialize();
	return form;
}

function waitUntilBlockingLoaderHides(timeout) {
	return browser.wait(protractor.ExpectedConditions.invisibilityOf($(".laji-form.blocking-loader")), timeout || 20000, "Geocoding timeout");
}

function isDisplayed(elem) {
	return elem.isDisplayed();
}

async function putForeignMarkerToMap() {
	const $gatheringsMap = lajiFormLocate("gatherings").$(".laji-map");
	const $markerButton = $(".leaflet-draw-draw-marker");
	await $markerButton.click();

	return browser.actions({bridge: true}).move({origin: $gatheringsMap.getWebElement(), x: -100, y: -100}).click().perform();
}

async function removeUnit(gatheringIdx, unitIdx) {
	await $(`#root_gatherings_${gatheringIdx}_units_${unitIdx}-delete`).click();
	return $(`#root_gatherings_${gatheringIdx}_units_${unitIdx}-delete-confirm-yes`).click();
}

const _mockGeo = (lat, lon) => `window.navigator.geolocation.getCurrentPosition =
	function (success, error) {
		success({
			coords : {
				latitude: ${lat},
				longitude: ${lon}
			}
		})
	}
`;

const mockGeo = (lat, lon) => browser.executeScript(_mockGeo(lat, lon));

const _mockGeoError = code => `window.navigator.geolocation.getCurrentPosition =
	function (success, error) {
		error({
			code: ${code},
			PERMISSION_DENIED: 1,
			POSITION_UNAVAILABLE: 2,
			TIMEOUT: 3
		});
	}
`;

const mockGeoError = (code) => browser.executeScript(_mockGeoError(code));

const getWidget = async (str) => {
	const $afterLabel = $(`${lajiFormLocator(str)} > div > div`);
	if (await $afterLabel.isPresent()) {
		return $afterLabel;
	}
	const $afterLabelNotSoDeep = $(`${lajiFormLocator(str)} > div`);
	if (await $afterLabelNotSoDeep.isPresent()) {
		return $afterLabelNotSoDeep;
	}
	const $insideLabel = $(`${lajiFormLocator(str)} > div > label > div`);
	return $insideLabel;
};

const updateValue = async ($input, value, blur = true) => {
	const current = await $input.getAttribute("value");
	await $input.sendKeys("\b".repeat((current || "").length) + value);
	if (blur) {
		return browser.actions().sendKeys(protractor.Key.TAB).perform();
	}
};

const mockImageMetadata = {
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

const filterUUIDs = (any) => {
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

const maybeJSONPointerToLocator = pointer => pointer[0] === "/" ? pointer.slice(1).replace(/\//g, "_") : pointer;

module.exports = {
	getLocatorForContextId,
	emptyForm,
	navigateToForm,
	lajiFormLocator,
	lajiFormLocate,
	getFocusedId,
	Form,
	createForm,
	waitUntilBlockingLoaderHides,
	isDisplayed,
	putForeignMarkerToMap,
	removeUnit,
	mockGeo,
	mockGeoError,
	getWidget,
	updateValue,
	mockImageMetadata,
	filterUUIDs,
	maybeJSONPointerToLocator
};
