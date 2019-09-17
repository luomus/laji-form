import LajiForm from "../src/app";
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";
import _notus from "notus";
import queryString from "querystring";
import { isObject } from "../src/utils";

import "../src/styles";
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
	let mockResponses = {};
	window.mockResponses = mockResponses;
	const getKey = (path, queryObject) => queryObject
			? `${path}?${queryString.stringify(queryObject)})}`
			: path;
	window.getMockQueryKey = getKey;
	window.setMockResponse = (path, query, response) => {
		let resolve, reject;
		const promise = new Promise((_resolve, _reject) => {
			resolve = () => _resolve({json: () => response});
			reject = _reject;
		});
		const key = getKey(path, query);
		const remove = () => {
			delete mockResponses[key];
		};
		mockResponses[key] = {promise, resolve, reject, remove};
		return mockResponses[key];
	};
	const fetch = apiClient.fetch;
	apiClient.fetch = (path, query, options) => {
		const key = getKey(path, query);
		const keyWithoutQuery = getKey(path, false);
		const mock = mockResponses[key] || mockResponses[keyWithoutQuery];
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
		settings: query.hasOwnProperty("settings")
			? isObject(settings)
				? settings
				: settings !== false
					? schemas.settings
					: undefined
			: schemas.settings,
		formData: query.localFormData
			? require(`../forms/${localFormData === true ? id : localFormData}.formData.json`)
			: data.prepopulatedDocument
				? {
					...data.prepopulatedDocument,
					gatheringEvent: {
						...(data.prepopulatedDocument.gatheringEvent || {}),
						...ownerFilledFormData.gatheringEvent
					}
				}
				: ownerFilledFormData,
		uiSchemaContext: {
			...(data.uiSchemaContext || {}),
			creator: properties.userId,
			isAdmin: query.isAdmin,
			isEdit: query.isEdit,
			municipalityEnum:  require("./municipalityEnum.json"),
			biogeographicalProvinceEnum:  require("./biogeographicalProvinceEnum.json")
		},
		onSubmit,
		onError: log("errors"),
		renderSubmit: true,
		onSettingsChange: console.info,
		googleApiKey: properties.googleApiKey,
		notifier,
		optimizeOnChange: true,
	}));
}

promise = promise.then(data => ({ 
	...data,
	apiClient,
	rootElem: document.getElementById("app"),
	staticImgPath: "/build",
	lang,
}));

const notifier = [["warning", "warning"], ["success", "success"], ["info", undefined], ["error", "failure"]].reduce((notifier, [method, notusType]) => {
	notifier[method] = message => notus.send({message, alertType: notusType, title: ""});
	return notifier;
}, {});

promise.then(data => {
	const lajiForm = new LajiForm(data);
	if (process.env.NODE_ENV !== "production") window.lajiForm = lajiForm;
});

function onSubmit({formData}) {
	console.info(formData);
}
