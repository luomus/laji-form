const {HOST, PORT} = process.env;

function getJsonFromUrl() {
	  var query = location.search.substr(1);
	  var result = {};
	  query.split("&").forEach(function(part) {
			    var item = part.split("=");
			    result[item[0]] = decodeURIComponent(item[1]);
			  });
	  return result;
}

export const getLocatorForContextId = contextId => path =>  `#_laji-form_${contextId}_root_${path.replace(/\./g, "_")}`;

export const emptyForm = async (params = "") => browser.get(`http://${HOST}:${PORT}?test=true&{params}`);
export const navigateToForm = async (formID, params = "") => browser.get(`http://${HOST}:${PORT}?id=${formID}&local=true&settings=false${params}`);
export const lajiFormLocator = getLocatorForContextId(0);
export const lajiFormLocate = str => $(lajiFormLocator(str));

export class Form {
	constructor(params = {}) {
		this.props = params;
	}

	initialize() {
		const query = params => Object.keys(params).reduce((q, key, i) =>
			`${q}${i === 0 ? "?" : "&"}${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
		, "");
		if (this.props.id) {
			const {id, ..._props} = this.props;
			return navigateToForm(id, query(_props));
		} else {
			this.props.test = true;
			return emptyForm(query(this.props));
		}
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

	getSubmittedData() {
		return browser.executeScript("return window.submittedData");
	}

	getChangedData() {
		return browser.executeScript("return window.changedData");
	}

	async locate(path, selector) {
		const contextId = await this.e("app.refs.lajiform._id");
		const $elem = $(getLocatorForContextId(contextId)(path));
		if (!selector) {
			return $elem;
		}
		return $elem.$(selector);
	}
	async locateButton(path, selector) {
		return $(`#root_${path.replace(/\./g, "_")}-${selector}`)
	}
}

export async function createForm(props) {
	const form = new Form(props);
	await form.initialize();
	return form;
}

export function waitUntilBlockingLoaderHides(timeout) {
	return browser.wait(protractor.ExpectedConditions.invisibilityOf($(".laji-form.blocking-loader")), timeout || 20000, "Geocoding timeout");
}

export function isDisplayed(elem) {
	return elem.isDisplayed();
}

export async function putForeignMarkerToMap() {
	const $gatheringsMap = lajiFormLocate("gatherings").$(".laji-map");
	const $markerButton = $(".leaflet-draw-draw-marker");

	await expect($markerButton.isDisplayed()).toBe(true);

	await $markerButton.click();

	await browser.actions()
		.mouseMove($gatheringsMap, {x: 100, y: 100}).perform();

	return browser.actions()
		.click().perform();
}

export async function removeUnit(gatheringIdx, unitIdx) {
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

export const mockGeo = (lat, lon) => browser.executeScript(_mockGeo(lat, lon));

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

export const mockGeoError = (code) => browser.executeScript(_mockGeoError(code));
