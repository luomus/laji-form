import React, { Component } from "react";
import Form from "react-jsonschema-form";
import api from "../api";
import UnitsField from "./fields/UnitsField";
import HorizontalSchemaField from "./fields/HorizontalSchemaField";
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
					unitTripreport: UnitsField,
					horizontal: HorizontalSchemaField,
					table: TableField,
					locked: LockedField}}
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
						"eventTime": {
							"ui:field": "eventTime"
						},
						"observers": {
							"ui:field": "table",
							"items": {
								"name": {
									"ui:field": "locked"
								}
							}
						},
						"units": {
							"ui:field": "unitTripreport",
							"ui:options": {
								"MY.kantarelli": {
									"url": "http://mock.api.luomus.fi/species/kantarelli",
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
									"url": "http://mock.api.luomus.fi/species/kantarelli",
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
									"url": "http://mock.api.luomus.fi/species/kantarelli",
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
			},
			"schema": {
				"type": "object",
				"properties": {
					"gatherings": {
						"type": "array",
						"items": {
							"type": "object",
							"properties": {
								"eventTime": {
									"type": "object",
									"properties": {
										"dateBegin": {
											"type": "string",
											"title": "Datebegin"
										},
										"dateEnd": {
											"type": "string",
											"title": "dateEnd"
										}
									},
									"required": ["dateBegin"]
								},
								"observers": {
									"type": "array",
									"items": [
											{
											"type": "object",
											"properties": {
												"name": {
													"type": "string"
												},
												"isPublic": {
													"type": "boolean"
												},
												"canEdit": {
													"type": "boolean"
												}
											},
											"required": ["name"]
										}
									],
									"additionalItems": {
										"type": "object",
											"properties": {
											"name": {
												"type": "string"
											},
											"isPublic": {
												"type": "boolean"
											},
											"canEdit": {
												"type": "boolean"
											}
										},
										"required": ["name"]
									}
								},
								"leg": {
									"type": "array",
									"title": "Leg",
									"items": {
										"type": "string"
									}
								},
								"kartta": {
									"type": "string",
									"title": "[KARTTA] [ < edellinen ] [ seuraava >]"
								},
								"units": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"fastInput": {
												"type": "string"
											},
											"taxonName": {
												"type": "string",
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
												"title": "Age"
											},
											"sex": {
												"type": "string",
												"title": "Sex",
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
												"title": "Notes"
											},
											"count": {
												"type": "string",
												"title": "Number of individuals"
											},
											"alive": {
												"type": "boolean",
												"title": "elossa?"
											},
											"ring": {
												"type": "string",
												"title": "Ring"
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
					"observers": [
						{
							"name": "Testimies",
							"isPublic": false,
							"canEdit": false
						},
						//{
						//	"name": "keke",
						//	"isPublic": true,
						//	"canEdit": false
						//}
					],
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
		let lang = this.props.lang || 'en';
		api.getForm(id, lang, (response) => {
			this.setState({schema: response.schema, uiSchema: response.uiSchema, lastApiCallFailed: false, errorMsg: undefined});
		}, (response) => {
			this.setState({schema: undefined, uiSchema: undefined, lastApiCallFailed: true, errorMsg: response});
		});
	}

	onFormDataChange = ({formData}) => this.setState({formData});
}
