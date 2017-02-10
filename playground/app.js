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
	...(USE_LOCAL_SCHEMAS ? schemas : {
		uiSchemaContext: schemas.uiSchemaContext,
		formData: schemas.formData
	}),
	// formData: {gatheringEvent: {leg: ["MA.308"]}},
	onSubmit,
	apiClient,
	lang,
	onError: log("errors"),
	rootElem: document.getElementById("app"),
	staticImgPath: "/build",
	renderSubmit: true
});

if (process.env.NODE_ENV !== "production") window.lajiForm = lajiForm;

if (!USE_LOCAL_SCHEMAS) {
	apiClient.fetch("/forms/JX.652", {lang, format: "schema"})
						.then(response => {
							return response.json();
						})
	         .then(props => {
							const {schema, uiSchema, validators} = props;
							const propsToPass = {schema, uiSchema};
							if (!Array.isArray(validators)) propsToPass.validators = validators;
							lajiForm.setState(propsToPass)
					 });
}

function onSubmit({formData}) {
	console.log(formData);
}
