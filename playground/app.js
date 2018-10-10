import LajiForm from "../src/app";
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";
import _notus from "notus";

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

const ownerFilledFormData = {gatheringEvent: {leg: [properties.userId]}};

let promise = undefined;
if (query.id !== undefined && query.local !== "true") {
	promise = apiClient.fetch(`/forms/${query.id}`, {lang, format: "schema"}).then(response => {
		return response.json();
	});
} else {
	promise = Promise.resolve(query.id ? require(`../forms/${query.id}.json`) : schemas);
}

const notifier = [["warning", "warning"], ["success", "success"], ["info", undefined], ["error", "failure"]].reduce((notifier, [method, notusType]) => {
	notifier[method] = message => notus.send({message, alertType: notusType, title: ""});
	return notifier;
}, {});

promise.then(data => {
	const lajiForm = new LajiForm({
		...data,
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
			municipalityEnum:  require("./municipalityEnum.json")
		},
		onSubmit,
		apiClient,
		lang,
		onError: log("errors"),
		rootElem: document.getElementById("app"),
		staticImgPath: "/build",
		renderSubmit: true,
		onSettingsChange: console.info,
		googleApiKey: properties.googleApiKey,
		notifier
	});
	if (process.env.NODE_ENV !== "production") window.lajiForm = lajiForm;
});

function onSubmit({formData}) {
	console.info(formData);
}
