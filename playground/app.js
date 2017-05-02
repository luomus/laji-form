import LajiForm from "../src/app";
import schemas from "./schemas.json";
import properties from "../properties.json";
import ApiClientImplementation from "./ApiClientImplementation";

import { geoJSONLineToLatLngSegmentArrays } from "laji-map/lib/utils";

import "../src/styles";
import "./styles.css";

// set to undefined to use the local schemas
const SCHEMA_ID = "JX.519";

const log = (type) => console.log.bind(console, type); // eslint-disable-line

let lang = "fi";

const apiClient = new ApiClientImplementation(
	"https://apitest.laji.fi/v0",
	properties.accessToken,
	properties.userToken,
	lang
);

const lineTransect =
	{
		"type": "Feature",
		"properties": {
			"Nro": 10,
			"Status": 3,
			"Muuta": "kahdella saarella",
			"Kunta": "Parainen, Nåtö",
			"Alue": 2.0,
			"Kkj_p": 6707806.0,
			"Kkj_i": 3177746.0,
			"Euref_n": 6704989.7,
			"Euref_e": 177707.4,
			"Kkj_lehti": "104102C4",
			"Utm_lehti": "L3142E1"
		},
		"geometry": {
			"type": "MultiLineString",
			"coordinates": [
				[
					[
						21.157287504315256,
						60.346554215036718
					],
					[
						21.15678433144307,
						60.34614401991599
					],
					[
						21.156386814730599,
						60.345528805076214
					],
					[
						21.156566806174656,
						60.344702992071177
					],
					[
						21.156482091085234,
						60.344290352202826
					],
					[
						21.15613798335356,
						60.343378687922453
					],
					[
						21.156313087412702,
						60.342757202965046
					],
					[
						21.156765676899003,
						60.34217954900388
					],
					[
						21.156905700792887,
						60.34139914916323
					],
					[
						21.141900757371932,
						60.342073835770478
					],
					[
						21.147220824957241,
						60.352202505932951
					],
					[
						21.15428199814939,
						60.35265561890472
					],
					[
						21.155180058496128,
						60.351720027552247
					],
					[
						21.156060714497833,
						60.350704980304393
					],
					[
						21.155598254361283,
						60.349567801687066
					],
					[
						21.155713110306412,
						60.348927995578975
					],
					[
						21.156081954122108,
						60.348818484876894
					],
					[
						21.156418335113436,
						60.348183311070898
					],
					[
						21.156397879018641,
						60.347589757027123
					],
					[
						21.156119235688795,
						60.347372932272563
					],
					[
						21.156426499450255,
						60.346898885454181
					],
					[
						21.157287504315256,
						60.346554215036718
					]
				],
				[
					[
						21.166008792225821,
						60.350812760742066
					],
					[
						21.164326272295323,
						60.356479834915092
					],
					[
						21.154235194954964,
						60.356098202787258
					],
					[
						21.154710382444886,
						60.353099165889567
					],
					[
						21.155520789498848,
						60.353182063610149
					],
					[
						21.157097007968765,
						60.352889798573223
					],
					[
						21.157724083073891,
						60.352933184391048
					],
					[
						21.159632767429812,
						60.352734132459105
					],
					[
						21.161532523190917,
						60.350993213287765
					],
					[
						21.166008792225821,
						60.350812760742066
					]
				]
			]
		}
	};

const lineTransectGeometries = geoJSONLineToLatLngSegmentArrays(lineTransect.geometry)
	.reduce((flattened, array) => [...flattened, ...array], [])
	.reduce((gatherings, coordPair) =>
		[...gatherings, {geometry: {type: "LineString", coordinates: coordPair.map(coordinate => coordinate.reverse())}}],
	[]);

const lajiForm = new LajiForm({
	...(SCHEMA_ID === undefined ? schemas : {
		uiSchemaContext: schemas.uiSchemaContext,
		formData: schemas.formData
	}),
	//formData: {gatheringEvent: {leg: ["MA.308"]}},
	//formData: {gatheringEvent: {leg: ["MA.308"]}, gatherings: lineTransectGeometries},
	onSubmit,
	apiClient,
	lang,
	onError: log("errors"),
	rootElem: document.getElementById("app"),
	staticImgPath: "/build",
	renderSubmit: true
});

if (process.env.NODE_ENV !== "production") window.lajiForm = lajiForm;

if (SCHEMA_ID !== undefined) {
	apiClient.fetch(`/forms/${SCHEMA_ID}`, {lang, format: "schema"})
						.then(response => {
							return response.json();
						})
	         .then(props => {
		const {schema, uiSchema, validators, uiSchemaContext} = props;
		const propsToPass = {schema, uiSchema, uiSchemaContext: {...uiSchemaContext, creator: schemas.uiSchemaContext.creator}};
		if (!Array.isArray(validators)) propsToPass.validators = validators;
		lajiForm.setState(propsToPass);
					 });
}

function onSubmit({formData}) {
	console.log(formData); // eslint-disable-line
}
