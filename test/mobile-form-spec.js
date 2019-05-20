
import { navigateToForm, lajiFormLocate, waitUntilBlockingLoaderHides, putForeignMarkerToMap, removeUnit } from "./test-utils.js";

import { googleApiKey } from "../properties.json"

function mockGeo(lat, lon) {
	return 'window.navigator.geolocation.getCurrentPosition = ' +
		'       function (success, error) {' +
		'           var position = {' +
		'               "coords" : {' +
		'                   "latitude": "' + lat + '",' +
		'                   "longitude": "' + lon + '"' +
		'               }' +
		'           };' +
		'           success(position);' +
		'       }';
}

function mockGeoError(code) {
	return 'window.navigator.geolocation.getCurrentPosition = ' +
		'       function (success, error) {' +
		'           var err = {' +
		'               code: ' + code + ',' +
		'               PERMISSION_DENIED: 1,' +
		'               POSITION_UNAVAILABLE: 2,' +
		'               TIMEOUT: 3' +
		'           };' +
		'           error(err);' +
		'       }';
}


describe("Mobile form (MHL.51)", () => {

	it("navigate to form", async () => {
		await navigateToForm("MHL.51");
	});

	it("is displayed", async () => {
		await expect($(".laji-form form").isPresent()).toBe(true);
	});

	const $imageAddModal = $(".image-add-modal");

	it("image add modal is displayed", async () => {
		await expect($imageAddModal.isPresent()).toBe(true);
	});

	it("clicking cancel on image add modal hides it", async () => {
		await $imageAddModal.$(".cancel").click();
		await expect($imageAddModal.isPresent()).toBe(false);
	});

	const $blocker = lajiFormLocate("gatherings.0.geometry").$(".blocker");

	it("map shows geolocating blocker after image add modal hides", async () => {
		await expect($blocker.isPresent()).toBe(true);
	});

	describe("after geolocating", () => {

		it("map removes geolocating blocker", async () => {
			await browser.executeScript(mockGeo(60, 25));
			await browser.wait(protractor.ExpectedConditions.invisibilityOf($blocker), 1000, "Blocker didn't hide");
			await expect($blocker.isPresent()).toBe(false);
		});

		it("map shows mobile editor", async () => {
			const $mobileEditorMap = $(".laji-form.fullscreen .laji-form-map");
			await browser.wait(protractor.ExpectedConditions.visibilityOf($mobileEditorMap), 1000, "Mobile editor map didn't show up");
			await expect($mobileEditorMap.isPresent()).toBe(true);
		});

	});
});
