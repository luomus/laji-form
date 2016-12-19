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
	...schemas,
	 //formData: {gatheringEvent: {leg: ["MA.308"]}},
	onSubmit,
	apiClient,
	lang,
	onError: log("errors"),
	rootElem: document.getElementById("app"),
	staticImgPath: "/build",
	renderSubmit: true
});

setTimeout(() => {
	lajiForm.clearState();
	lajiForm.setState({formData: {
		"editors": [
			"MA.308",
			"MA.97"
		],
		"gatheringEvent": {
			"leg": [
				"MA.308",
				"MA.97"
			],
			"legPublic": true
		},
		"gatherings": [
			{
				"units": [
					{
						"recordBasis": "MY.recordBasisHumanObservation",
						"unitType": [
							"MVL.2"
						],
						"taxonConfidence": "MY.taxonConfidenceSure",
						"sex": "",
						"lifeStage": "",
						"taste": "",
						"smell": "",
						"preservation": "",
						"plantStatusCode": "",
						"identifications": [
							{
								"taxon": "susi",
								"taxonID": "MX.46549"
							}
						],
						"unitGathering": {
							"geometry": {
								"type": "Point",
								"coordinates": [
									28.497900896159347,
									60.62158367170537
								]
							}
						}
					}
				],
				"geometry": {
					"geometries": [
						{
							"type": "Point",
							"coordinates": [
								26.497900896159347,
								60.62158367170537
							]
						},
						{
							"type": "Point",
							"coordinates": [
								27.497900896159347,
								60.62158367170537
							]
						}
					]
				}
			}
		]
	}})

}, 2000);

if (process.env.NODE_ENV !== "production") window.lajiForm = lajiForm;

if (!USE_LOCAL_SCHEMAS) {
	apiClient.fetch("/forms/JX.519", {lang, format: "schema"})
	         .then((props) => {
						 const {schema, uiSchema, uiSchemaContext, validators} = props;
						 const propsToPass = {schema, uiSchema, uiSchemaContext};
						 if (!Array.isArray(validators)) propsToPass.validators = validators;
						 lajiForm.setState(propsToPass)
					 });
}

function onSubmit({formData}) {
	console.log(formData);
}
