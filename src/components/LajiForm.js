import React, { Component } from "react";
import Form from "react-jsonschema-form";
import Api from "../api";
import NestField from "./fields/NestField";
import UnitsField from "./fields/UnitsField";
import UnitField from "./fields/UnitField";
import HorizontalSchemaField from "./fields/HorizontalSchemaField";
import AdditionalsExpanderField from "./fields/AdditionalsExpanderField";
import TableField from "./fields/TableField";
import LockedField from "./fields/LockedField";

const log = (type) => console.log.bind(console, type);

export default class LajiForm extends Component {
	constructor(props) {
		super(props);
		this.state = {
			schema: undefined,
			uiSchema: undefined,
			formData: this.props.data,
			lastApiCallFailed: false,
			errorMsg: undefined
		};
		this.api = new Api(props.apiKey);
	}

	render() {
		const {schema, uiSchema, formData, errorMsg, lastApiCallFailed} = this.state;
		if (lastApiCallFailed) return (<ErrorBox errorMsg={errorMsg} />);
		return (schema == null) ? null :
			<Form
				schema={schema}
				uiSchema={uiSchema}
				formData={formData}
				onChange={this.onFormDataChange}
				fields={{
					nest: NestField,
					unitTripreport: UnitsField,
					unit: UnitField,
					horizontal: HorizontalSchemaField,
					table: TableField,
					locked: LockedField,
					expandable: AdditionalsExpanderField}}
				onError={log("errors")} />
	}

	componentDidMount() {
		//let formId = this.props.formId;
		//if (formId !== undefined && formId !== null) this.changeForm(formId);
		const response = {
			"id": "JX.519",
			"title": "Tripreport",
			"description": "With this form you can log spceimens that you've seen.",
			"uiSchema": {
				"gatherings": {
					"items": {
						"ui:field": "nest",
						"ui:options": {
							"localityWrapper": {
								title: "Havaintopaikan tiedot",
								fields: ["locality", "localityDescription", "biotype", "biotypeForest", "biotypeSuo"],
								uiSchema: {
									"ui:field": "table"
								}
							},
							"imagesWrapper": {
								"fields": ["image", "rights"],
								uiSchema: {
									"ui:field": "table"
								}
							}
						},
						"eventTime": {
							"ui:field": "expandable",
							"ui:options": {
								"additionalFields": ["dateEnd"],
								"innerUiField": "table",
								"expanderButtonText": "Ilmoita aikaväli",
								"contractorButtonText": "Piilota aikavälin loppu"
							}
						},
						"leg": {
							"ui:field": "table",
							"items": {
								"name": {
									"ui:field": "locked"
								}
							}
						},
						"units": {
							"ui:field": "unitTripreport",
							"items": {
								"ui:field": "unit",
								"ui:options": {
									"innerUiField": "table",
									"MY.kantarelli": {
										"fields": [
											"age",
											"count",
											"alive"
										],
										"additionalFields": [
											"notes"
										]
									},
									"MY.korvasieni": {
										"fields": [
											"age",
											"count",
											"alive"
										],
										"additionalFields": [
											"notes"
										]
									},
									"MY.kalalokki": {
										"fields": [
											"age",
											"count",
											"ring",
											"sex",
											"alive"
										],
										"additionalFields": [
											"notes"
										]
									}
								}
							}
						}
					}
				}
			},
			"schema": {
				"type": "object",
				"properties": {
					"gatherings": {
						"type": "array",
						"title": "Perustiedot",
						"items": {
							"type": "object",
							"properties": {
								"eventTime": {
									"type": "object",
									"title": "Aika",
									"properties": {
										"dateBegin": {
											"type": "string",
											"title": "Havaintoaika"
										},
										"dateTime": {
											"type": "string",
											"title": "Kellonaika"
										},
										"dateEnd": {
											"type": "string",
											"title": "Havaintoajan loppu"
										}
									},
									"required": ["dateBegin"]
								},
								"leg": {
									"type": "array",
									"title": "Havainnoitsijat",
									"items": [{
										"type": "object",
										"properties": {
											"name": {
												"type": "string",
												"title": "Havainnon tekijät"
											},
											"isPublic": {
												"type": "boolean",
												"title": "Näytetäänkö nimi julkisesti?"
											},
											"canEdit": {
												"type": "boolean",
												"title": "Anna käyttäjälle muokkausoikeus"
											}
										},
										"required": ["name"]
									}],
									"additionalItems": {
										"type": "object",
										"properties": {
											"name": {
												"type": "string",
												"title": "Havainnon tekijät"
											},
											"isPublic": {
												"type": "boolean",
												"title": "Näytetäänkö nimi julkisesti?"
											},
											"canEdit": {
												"type": "boolean",
												"title": "Anna käyttäjälle muokkausoikeus"
											}
										},
										"required": ["name"]
									},
								},
								"kartta": {
									"type": "string",
									"title": "[KARTTA] [ < edellinen ] [ seuraava >]"
								},
								"units": {
									"type": "array",
									"title": "Havainnot",
									"items": {
										"type": "object",
										"properties": {
											"taxonName": {
												"type": "string",
												"title": "Taksoni",
												"enum": [
													"MY.kantarelli",
													"MY.korvasieni",
													"MY.kalalokki"
												],
												"enumNames": [
													"kantarelli",
													"korvasieni",
													"kalalokki"
												]
											},
											"age": {
												"type": "string",
												"title": "Ikä"
											},
											"sex": {
												"type": "string",
												"title": "Sukupuoli",
												"enum": [
													"MY.sexM",
													"MY.sexF",
													"MY.sexU",
													"MY.sexN",
													"MY.sexX",
													"MY.sexW",
													"MY.sexE",
													"MY.sexC"
												],
												"enumNames": [
													"M - Male",
													"F - Female",
													"U - Unknown",
													"N - Not applicable",
													"X - miXed",
													"W - Worker",
													"E - multiplE",
													"C - Conflicting"
												]
											},
											"notes": {
												"type": "string",
												"title": "Muistiinpanot"
											},
											"count": {
												"type": "string",
												"title": "Lukumäärä"
											},
											"alive": {
												"type": "boolean",
												"title": "Elossa?"
											},
											"ring": {
												"type": "string",
												"title": "Rengas"
											}
										},
										"required": []
									}
								},
								"locality": {
									"type": "string",
									"title": "Locality names"
								},
								"localityDescription": {
									"type": "string",
									"title": "Locality description"
								},
								"habitatDescription": {
									"type": "string",
									"title": "Habitat description"
								},
								"biotype": {
									"type": "string",
									"enum": [
										"forest",
										"suo"
									],
									"enumNames": [
										"metsä",
										"suo"
									]
								},
								"biotypeSuo": {
									"type": "string",
									"enum": [
										"korpi",
										"räme",
										"neva"
									],
									"enumNames": [
										"korpi",
										"räme",
										"neva"
									]
								},
								"biotypeForest": {
									"type": "string",
									"enum": [
										"kuusi",
										"mänty",
										"lehto"
									],
									"enumNames": [
										"kuusi",
										"mänty",
										"lehto"
									]
								},
								"image": {
									"type": "string",
									"title": "Raahaa tähän kuvat tai valitse tiedosto koneeltasi [Browse]"
								},
								"rights": {
									"type": "string",
									"title": "Kuivien käyttöoikeus [pakollinen]"
								}
							},
							"required": [
								"leg"
							]
						}
					},
					"temp": {
						"type": "boolean"
					},
					"ready": {
						"type": "boolean"
					}
				},
				"required": []
			}
		}


		const formData = {
			"gatherings": [
				{
					"dateBegin": "",
					"dateEnd": "",
					"leg": [],
					"leg": [],
					"kartta": "",
					"units": [
						{
							"fastInput": "",
							"taxonName": "MY.kantarelli",
							"age": "",
							"sex": "MY.sexM",
							"notes": "",
							"count": "",
							"ring": ""
						}
					],
					"locality": "",
					"localityDescription": "",
					"habitatDescription": "",
					"biotype": "forest",
					"biotypeSuo": "korpi",
					"biotypeForest": "kuusi",
					"image": "",
					"rights": ""
				}
			],
			"temp": false,
			"ready": false
		}

		this.setState({schema: response.schema, uiSchema: response.uiSchema, formData: formData});
		//this.setState({schema: response.schema, uiSchema: response.uiSchema});
	}

	componentWillReceiveProps(nextProps) {
		if (nextProps.formId !== this.props.formId) {
			this.changeForm(nextProps.formId);
		}
	}

	changeForm = (id) => {
		this.api.getForm(id, (response) => {
			this.setState({schema: response.schema, uiSchema: response.uiSchema, lastApiCallFailed: false, errorMsg: undefined});
		}, (response) => {
			this.setState({schema: undefined, uiSchema: undefined, lastApiCallFailed: true, errorMsg: response});
		});
	}

	onFormDataChange = ({formData}) => this.setState({formData});
}
