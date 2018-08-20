import LajiForm from "../src/app";
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";
import _notus from "notus";

import tripReport from "../forms/JX.519.json";
import fungiAtlas from "../forms/JX.652.json";
import lineTransect from "../forms/MHL.1.json";
import lineTransectFormData from "../forms/MHL.1.formData.json";

import "../src/styles";
import "./styles.css";
import "./styles-dev.css";

import "notus/src/notus.css";

const notus = _notus();

const forms = {
	"JX.519": tripReport,
	"JX.652": fungiAtlas,
	"MHL.1": lineTransect
};

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

let lang = "fi";

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
	promise = Promise.resolve(query.id ? forms[query.id] : schemas);
}

const notifier = [["warning", "waring"], ["success", "success"], ["info", undefined], ["error", "failure"]].reduce((notifier, [method, notusType]) => {
	notifier[method] = message => notus.send({message, alertType: notusType, title: ""});
	return notifier;
}, {});

promise.then(data => {
	const lajiForm = new LajiForm({
		...data,
		settings: query.settings === "false" ? undefined : schemas.settings,
		formData: query.localFormData
			? schemas.formData
			: (() => {
				switch (query.id) {
				case "MHL.1":
					return {...ownerFilledFormData, gatherings: lineTransectFormData.gatherings};
				default:
					return data.prepopulatedDocument
						? {
							...data.prepopulatedDocument,
							gatheringEvent: {
								...(data.prepopulatedDocument.gatheringEvent || {}),
								...ownerFilledFormData.gatheringEvent
							}
						}
						: ownerFilledFormData;
				}
			})(),
		uiSchemaContext: {
			...(data.uiSchemaContext || {}),
			creator: properties.userId,
			isAdmin: query.admin
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
