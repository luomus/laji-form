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
	// formData: {gatheringEvent: {leg: ["MA.308"]}, editors: ["MA.308"]},
	onSubmit,
	apiClient,
	lang,
	onError: log("errors"),
	rootElem: document.getElementById("app"),
	staticImgPath: "/build"
});

if (!USE_LOCAL_SCHEMAS) {
	apiClient.fetch("/forms/JX.519", {lang})
	         .then(lajiForm.setState);
}

function onSubmit({formData}) {
	console.log(formData);
}
