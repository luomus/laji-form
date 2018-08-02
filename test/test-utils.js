const {HOST, PORT} = process.env;
export const getLocatorForContextId = contextId => path =>  `#_laji-form_${contextId}_root_${path.replace(/\./g, "_")}`;

export const navigateToForm = async formID => browser.get(`http://${HOST}:${PORT}?id=${formID}&local=true&settings=false`);
export const lajiFormLocator = getLocatorForContextId(0);
export const lajiFormLocate = str => $(lajiFormLocator(str));

export function waitUntilBlockingLoaderHides(timeout) {
	return browser.wait(protractor.ExpectedConditions.invisibilityOf($(".laji-form.blocking-loader")), timeout || 20000, "Geocoding timeout");
}

export function isDisplayed(elem) {
	return elem.isDisplayed();
}
