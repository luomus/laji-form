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

let formData = schemas.formData;
formData = {gatheringEvent: {leg: [properties.userToken]}, editors: [properties.userToken]};

const lajiForm = new LajiForm({
	formData,
	onChange,
	onSubmit,
	apiClient,
	lang,
	onError: log("errors"),
	rootElem: document.getElementById("app")
});

//setTimeout(() => lajiForm.pushBlockingLoader(), 3000)

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
	//lajiForm.setState({formData: formData});
}
