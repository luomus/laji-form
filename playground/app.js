import LajiForm from "../src/app";
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";

import tripReport from "../forms/JX.519.json";
import fungiAtlas from "../forms/JX.652.json";
import lineTransect from "../forms/MHL.1.json";
import lineTransectFormData from "../forms/MHL.1.formData.json";

import "../src/styles";
import "./styles.css";
import "./styles-dev.css";

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
	promise = new Promise(resolve => {
		resolve(forms[query.id]);
	});
}

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
					return ownerFilledFormData;
				}
			})(),
		uiSchemaContext: {
			...data.uiSchemaContext,
			creator: properties.userId
		},
		onSubmit,
		apiClient,
		lang,
		onError: log("errors"),
		rootElem: document.getElementById("app"),
		staticImgPath: "/build",
		renderSubmit: true,
		onSettingsChange: console.info,
		googleApiKey: properties.googleApiKey
	});
	if (process.env.NODE_ENV !== "production") window.lajiForm = lajiForm;
});

function onSubmit({formData}) {
	console.info(formData);
}
