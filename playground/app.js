import LajiForm from "../src/index.ts";
import * as lajiFormUtils from "../src/utils.tsx";
import * as schemas from "./schemas.json";
import * as properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation.js";
import * as _notus from "notus";
import * as queryString from "querystring";
import { isObject } from "../src/utils.tsx";
import bs3 from "../src/themes/bs3";

import "../src/styles.js";
import "./styles-dev.css";

import "notus/src/notus.css";

const notus = _notus();

function getJsonFromUrl() {
	const type = (value) => {
		try {
			return JSON.parse(value);
		} catch (e) {
			return value;
		}
	};

	let query = location.search.substr(1);
	let result = {};
	query.split("&").forEach(function(part) {
		var item = part.split("=");
		result[item[0]] = type(decodeURIComponent(item[1]));
	});
	return result;
}

const query = getJsonFromUrl();

const log = (type) => console.info.bind(console, type);

let lang = query.lang || "fi";

const apiClient = new ApiClientImplementation(
	"https://apitest.laji.fi/v0",
	properties.accessToken,
	properties.userToken,
	lang
);

const {mockApi, test, id, local, localFormData, settings, ...lajiFormOptions} = query;

if (mockApi) {
	const mockResponses = {};
	const mockQueues = {};
	window.mockResponses = mockResponses;
	window.mockQueues = mockQueues;
	const getKey = (path, queryObject) => queryObject
		? `${path}?${queryString.stringify(queryObject)})}`
		: path;
	window.getMockQueryKey = getKey;
	const createMock = () => {
		let resolve, reject;
		const promise = new Promise((_resolve, _reject) => {
			resolve = (response, raw) =>  _resolve(raw ? {...(response || {}), json: () =>  (response || {}).json} : {json: () => response, status: 200});
			reject = (response, raw) => _reject(raw ? {...(response || {}), json: () => (response || {}).json} : response);
		});
		const mock = {promise, resolve, reject};
		return mock;
	};

	window.setMockResponse = (path, query) => {
		const key = getKey(path, query);
		const mock = createMock();
		mock.remove = () => {
			delete mockResponses[key];
		};
		mockResponses[key] =  mock;
		return mock;
	};
	window.createMockResponseQueue = (path, query) => {
		const key = getKey(path, query);
		const create = () => {
			const mock = createMock();
			mockResponses[key] = [ ...(mockResponses[key] || []), mock ];
			return mock;
		};
		const remove = () => {
			delete mockQueues[key];
			delete mockResponses[key];
		};
		const mock = {create, remove, pointer: 0};
		mockQueues[key] = mock;
		return mock;
	};
	const fetch = apiClient.fetch;
	apiClient.fetch = (path, query, options) => {
		const key = getKey(path, query);
		const keyWithoutQuery = getKey(path, false);
		let mock = mockResponses[key] || mockResponses[keyWithoutQuery];
		if (Array.isArray(mock)) {
			const queue = mockQueues[key] || mockQueues[keyWithoutQuery];
			const {pointer} = queue;
			if (pointer > mock.length - 1) {
				throw new Error("used mock queue when no more mocks in queue");
			}
			queue.pointer = queue.pointer + 1;
			mock = mock[pointer];
		}
		return mock
			? mock.promise
			: fetch.call(apiClient, path, query, options);
	};
}

const ownerFilledFormData = {gatheringEvent: {leg: [properties.userId]}};

let promise = undefined;
if (test === true) {
	promise = Promise.resolve({});
} else if (id !== undefined && local !== true) {
	promise = apiClient.fetch(`/forms/${id}`, {lang, format: "schema"}).then(response => {
		return response.json();
	});
} else {
	promise = Promise.resolve(id ? require(`../forms/${id}.json`) : schemas);
}

promise = promise.then(data => ({...data, ...lajiFormOptions}));

if (test !== true) {
	promise = promise.then(data => ({
		...data,
		uiSchema: {
			...data.uiSchema,
			"ui:disabled": query.readonly
		},
		settings: "settings" in query
			? isObject(settings)
				? settings
				: settings !== false
					? schemas.settings
					: undefined
			: schemas.settings,
		formData: query.localFormData
			? require(`../forms/${localFormData === true ? id : localFormData}.formData.json`)
			: data.options && data.options.prepopulatedDocument
				? {
					...data.options.prepopulatedDocument,
					gatheringEvent: {
						...(data.options.prepopulatedDocument.gatheringEvent || {}),
						...ownerFilledFormData.gatheringEvent
					}
				}
				: ownerFilledFormData,
		onSubmit,
		onError: log("errors"),
		renderSubmit: true,
		onSettingsChange: console.info,
		googleApiKey: properties.googleApiKey,
		notifier,
		optimizeOnChange: true,
		mediaMetadata: {
			intellectualRights: "MZ.intellectualRightsCC-BY-SA-4.0",
			capturerVerbatim: "Test",
			intellectualOwner: "Test"
		},
		lajiGeoServerAddress: "https://geoserver-dev.laji.fi"
	}));
}

promise = promise.then(data => ({ 
	...data,
	apiClient,
	rootElem: document.getElementById("app"),
	staticImgPath: "/build",
	lang,
	theme: bs3,
	uiSchemaContext: {
		...(data.uiSchemaContext || {}),
		creator: properties.userId,
		isAdmin: query.isAdmin,
		isEdit: query.isEdit,
		municipalityEnum:  require("./municipalityEnum.json"),
		biogeographicalProvinceEnum:  require("./biogeographicalProvinceEnum.json"),
		birdAssociationAreaEnum:  require("./birdAssociationAreaEnum.json")
	}
}));

const notifier = [["warning", "warning"], ["success", "success"], ["info", undefined], ["error", "failure"]].reduce((notifier, [method, notusType]) => {
	notifier[method] = message => notus.send({message, alertType: notusType, title: ""});
	return notifier;
}, {});

promise.then(data => {
	const lajiForm = new LajiForm(data);
	if (process.env.NODE_ENV !== "production") {
		window.lajiForm = lajiForm;
		window.lajiFormUtils = lajiFormUtils;
	}
});

function onSubmit({formData}) {
	console.info(formData);
}
