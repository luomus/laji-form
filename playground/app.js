import LajiForm from "../src/app"
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";

import "../src/styles";
import "./styles.css";

const USE_LOCAL_SCHEMAS = true;

const log = (type) => console.log.bind(console, type);

let lang = "fi";

const apiClient = new ApiClientImplementation(
	"https://apitest.laji.fi/v0",
	properties.accessToken,
	properties.userToken,
	lang
);


const lajiForm = new LajiForm({
	...schemas,
	//schema: {
	//	type: "object",
	//	properties: {
	//		a: {
	//			type: "array",
	//			items: {
	//			type: "string"
	//			}
	//		},
	//		b: {
	//			type: "array",
	//			items: {
	//				type: "integer"
	//			}
	//		}
	//	}
	//},
	//uiSchema: {
	//	"ui:field": "arrayCombiner",
	//	"ui:options": {
	//		uiSchema: {
	//			"ui:field": "table"
	//		}
	//	}
	//},
	//formData: [],
	// formData: {gatheringEvent: {leg: ["MA.308"]}, editors: ["MA.308"]},
	onSubmit,
	apiClient,
	lang,
	onError: log("errors"),
	rootElem: document.getElementById("app"),
	staticImgPath: "/build",
	renderSubmit: true
});

if (!USE_LOCAL_SCHEMAS) {
	apiClient.fetch("/forms/JX.519", {lang, format: "schema"})
	         .then(({schema, uiSchema, uiSchemaContext}) => lajiForm.setState);
}

function onSubmit({formData}) {
	console.log(formData);
}
