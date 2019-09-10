import LajiForm from "../src/app";
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";
import _notus from "notus";
import queryString from "querystring";

import "../src/styles";
import "./styles.css";
import "./styles-dev.css";

import "notus/src/notus.css";

const notus = _notus();

function getJsonFromUrl() {
	  var query = location.search.substr(1);
	  var result = {};
	  query.split("&").forEach(function(part) {
			    var item = part.split("=");
			    result[item[0]] = decodeURIComponent(item[1]);
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

if (query.mockApi) {
	let mockResponses = {};
	window.mockResponses = mockResponses;
	const getKey = (path, queryObject) => queryObject
			? `${path}?${queryString.stringify(queryObject)})}`
			: path;
	window.getMockQueryKey = getKey;
	window.setMockResponse = (path, query, response) => {
		let resolve;
		const promise = new Promise(_resolve => {
			resolve = () => _resolve({json: () => response});
		});
		const key = getKey(path, query);
		const remove = () => {
			delete mockResponses[key];
		};
		mockResponses[key] = {promise, resolve, remove};
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
if (query.test === "true") {
	promise = Promise.resolve({});
} else if (query.id !== undefined && query.local !== "true") {
	promise = apiClient.fetch(`/forms/${query.id}`, {lang, format: "schema"}).then(response => {
		return response.json();
	});
} else {
	promise = Promise.resolve(query.id ? require(`../forms/${query.id}.json`) : schemas);
}

if (query.test !== "true") {
	promise = promise.then(data => ({
		...data,
		uiSchema: {
			...data.uiSchema,
			"ui:disabled": query.readonly
		},
		settings: query.settings === "false" ? undefined : schemas.settings,
		formData: query.localFormData
			? require(`../forms/${query.localFormData === "true" ? query.id : query.localFormData}.formData.json`)
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
			isAdmin: query.admin,
			isEdit: query.edit,
			municipalityEnum:  require("./municipalityEnum.json"),
			biogeographicalProvinceEnum:  require("./biogeographicalProvinceEnum.json")
		},
		onSubmit,
		lang,
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
