import LajiForm from "../src/app"
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";

import "../src/styles";
import "./styles.css";

const USE_LOCAL_SCHEMAS = false;

const log = (type) => console.log.bind(console, type);

let lang = "fi";

const apiClient = new ApiClientImplementation(
	"https://apitest.laji.fi/v0",
	properties.accessToken,
	properties.userToken,
	lang
);

const lajiForm = new LajiForm({
	formData: {gatheringEvent: {leg: [properties.userToken]}, editors: [properties.userToken]},
	onChange: onChange,
	onSubmit: onSubmit,
	apiClient: apiClient,
	onError: log("errors"),
	lang: lang,
	rootElem: document.getElementById("app")
});

if (!USE_LOCAL_SCHEMAS) {
	apiClient.fetch("/forms/JX.519", {lang}).then(result => {
		const {schema,
			uiSchema,
			uiSchemaContext,
			validators} = result;
		lajiForm.setState({schema,
			uiSchema,
			uiSchemaContext,
			validators});
	});
};

function onSubmit({formData}) {
	console.log(formData);
}

function onChange(formData) {
	lajiForm.setState({formData: formData});
}
