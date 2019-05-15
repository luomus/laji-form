const {HOST, PORT} = process.env;
export const getLocatorForContextId = contextId => path =>  `#_laji-form_${contextId}_root_${path.replace(/\./g, "_")}`;

export const navigateToForm = async (formID, params = "") => browser.get(`http://${HOST}:${PORT}?id=${formID}&local=true&settings=false${params}`);
export const lajiFormLocator = getLocatorForContextId(0);
export const lajiFormLocate = str => $(lajiFormLocator(str));

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
