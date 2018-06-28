const {HOST, PORT} = process.env;

const getLocatorForContextId = contextId => path =>  `#_laji-form_${contextId}_root_${path.replace(".", "_")}`;
const navigateToForm = formID => browser.get(`http://${HOST}:${PORT}?id=${formID}&local=true`);

const lajiFormLocator = getLocatorForContextId(0);
const lajiFormLocate = str => $(lajiFormLocator(str));

describe("Trip report (JX.519)", () => {

	navigateToForm("JX.519");

	describe("gatheringEvent container", () => {

		const $gatheringEvent = lajiFormLocate("gatheringEvent");

		it("has gatheringEvent", () => {
			expect($gatheringEvent.isPresent()).toBe(true);
		});

		it("contains secureLevel", () => {
			const $secureLevel = lajiFormLocate("secureLevel");

			expect($gatheringEvent.element($secureLevel.locator()).isDisplayed()).toBe(true);
		});

		//TODO TableField messes up ids!
		//it("contains gatheringEvent.observer.0", () => {
		//	expect(lajiFormLocate("gatheringEvent.leg.0").isDisplayed()).toBe(true);
		//});

		it("contains gatheringEvent.legPublic", () => {
			expect(lajiFormLocate("gatheringEvent.legPublic").isDisplayed()).toBe(true);
		});

		it("contains gatheringEvent.dateBegin", () => {
			expect(lajiFormLocate("gatheringEvent.dateBegin").isDisplayed()).toBe(true);
		});

		it("contains gatheringEvent.dateEnd", () => {
			expect(lajiFormLocate("gatheringEvent.dateEnd").isDisplayed()).toBe(true);
		});

		it("contains keywords", () => {
			expect(lajiFormLocate("keywords").isDisplayed()).toBe(true);
		});
	});

	it("has gatherings", () => {
		expect(lajiFormLocate("gatherings").isDisplayed()).toBe(true);
	});

	it("gatherings is empty", () => {
		expect(lajiFormLocate("gatherings.0").isPresent()).toBe(false);
	});

	const $map = $(".laji-map");

	it("map is present", () => {
		expect($map.isPresent()).toBe(true);
	});

	it("creating pointer on map creates gathering", () => {
		const $markerButton = $(".leaflet-draw-draw-marker");
		expect($markerButton.isPresent()).toBe(true);

		$markerButton.click();

		browser.actions()
			.mouseMove($map, {x: 100, y: 100})
			.click()
			.perform();

		expect(lajiFormLocate("gatherings.0").isPresent()).toBe(true);
	});

});
