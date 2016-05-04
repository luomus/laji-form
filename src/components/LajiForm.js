import React, { Component } from "react";
import Form from "react-jsonschema-form";
import Api from "../api";
import NestField from "./fields/NestField";
import UnitsField from "./fields/UnitsField";
import ScopeField from "./fields/ScopeField";
import HorizontalSchemaField from "./fields/HorizontalSchemaField";
import AdditionalsExpanderField from "./fields/AdditionalsExpanderField";
import TableField from "./fields/TableField";
import LockedField from "./fields/LockedField";
import InjectField from "./fields/InjectField";

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
					nested: NestField,
					unitTripreport: UnitsField,
					scoped: ScopeField,
					horizontal: TableField,
					table: TableField,
					locked: LockedField,
					inject: InjectField,
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
				"ui:field": "inject",
				"ui:options": {
					"injections": {
						"fields": ["editors"],
						"target": "gatherings"
					}
				},
				"gatherings": {
					"items": {
						"ui:field": "nested",
						"ui:options": {
							"eventTime": {
								"fields": ["dateBegin", "dateEnd"],
								"uiSchema": {
									"ui:field": "expandable",
									"ui:options": {
										"additionalFields": ["dateEnd"],
										"uiSchema": {
											"ui:field": "table"
										},
										"expanderButtonText": "Ilmoita aikaväli",
										"contractorButtonText": "Piilota aikavälin loppu"
									}
								}
							},
							"imagesWrapper": {
								"fields": ["image", "rights"],
								uiSchema: {
									"ui:field": "table"
								}
							},
							"localityWrapper": {
								title: "Havaintopaikan tiedot",
								fields: ["locality", "localityDescription", "habitatDescription", "biotype", "biotypeForest", "biotypeSuo", "biotypeForestKuusi", "biotypeForestMänty", "biotypeForestMänty2", "biotypeForestLehto", "biotypeSuoKorpi", "biotypeSuoRäme", "biotypeSuoNeva"],
								uiSchema: {
									"ui:field": "scoped",
									"ui:options": {
										"uiSchema": {
												"ui:field": "expandable",
												"ui:options": {
													"expanderButtonText": "Näytä lisää",
													"contractorButtonText": "Näytä vähemmän",
													"additionalFields": ["habitatDescription"],
													"uiSchema": {
														"ui:field": "table"
													}
											}
										},
										"fieldScopes": {
											"biotype": {
												"forest": {
													"fields": ["locality", "localityDescription", "biotypeForest", "habitatDescription"],
													"fieldScopes": {
														"biotypeForest": {
															"kuusi": {
																"fields": ["biotypeForestKuusi"]
															},
															"mänty": {
																"fields": ["biotypeForestMänty", "biotypeForestMänty2"],
																"uiSchema": {
																	"ui:options": {
																		"additionalFields": ["biotypeForestMänty2"]
																	}
																}
															},
															"lehto": {
																"fields": ["biotypeForestLehto"]
															}
														}
													},
												},
												"suo": {
													"fields": ["locality", "localityDescription", "biotypeSuo"],
													"fieldScopes": {
														"biotypeSuo": {
															"korpi": {
																"fields": ["biotypeSuoKorpi"]
															},
															"räme": {
																"fields": ["biotypeSuoRäme"]
															},
															"neva": {
																"fields": ["biotypeSuoNeva"]
															}
														}
													}
												}
											},
										}
									}
								}
							},
						},
						//"leg": {
						//	"ui:field": "table"
						//},
						"units": {
							"ui:field": "unitTripreport",
							"items": {
								"ui:field": "scoped",
								"ui:options": {
									"uiSchema": {
										"ui:field": "expandable",
										"ui:options": {
											"expanderButtonText": "Näytä lisää muuttujia",
											"contractorButtonText": "Näytä vähemmän muuttujia",
											"uiSchema": {
												"ui:field": "table"
											}
										}
									},
									"fieldScopes": {
										"taxonName": {
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
					}
				}
			},
			"schema": {
				"type": "object",
				"properties": {
					"editors": {
						"type": "array",
						"items": {
							"type": "string"
						}
					},
					"gatherings": {
						"type": "array",
						"title": "Perustiedot",
						"items": {
							"type": "object",
							"properties": {
								"dateBegin": {
									"type": "string",
									"title": "Havaintoaika"
								},
								"dateEnd": {
									"type": "string",
									"title": "Havaintoajan loppu"
								},
								"leg": {
									"type": "array",
									"title": "Havainnoitsijat",
									"items": {
										"type": "string"
									}
								},
								"legPublic": {
									"type": "boolean"
								},
									//"items": [{
									//	"type": "object",
									//	"properties": {
									//		"name": {
									//			"type": "string",
									//			"title": "Havainnon tekijät"
									//		},
									//		"isPublic": {
									//			"type": "boolean",
									//			"title": "Näytetäänkö nimi julkisesti?"
									//		},
									//		"canEdit": {
									//			"type": "boolean",
									//			"title": "Anna käyttäjälle muokkausoikeus"
									//		}
									//	},
									//	"required": ["name"]
									//}],
									//"additionalItems": {
									//	"type": "object",
									//	"properties": {
									//		"name": {
									//			"type": "string",
									//			"title": "Havainnon tekijät"
									//		},
									//		"isPublic": {
									//			"type": "boolean",
									//			"title": "Näytetäänkö nimi julkisesti?"
									//		},
									//		"canEdit": {
									//			"type": "boolean",
									//			"title": "Anna käyttäjälle muokkausoikeus"
									//		}
									//	},
									//	"required": ["name"]
									//},
								//},
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
													"",
													"MY.kantarelli",
													"MY.korvasieni",
													"MY.kalalokki"
												],
												"enumNames": [
													"",
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
													"",
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
													"",
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
										"",
										"forest",
										"suo"
									],
									"enumNames": [
										"",
										"metsä",
										"suo"
									]
								},
								"biotypeSuo": {
									"type": "string",
									"enum": [
										"",
										"korpi",
										"räme",
										"neva"
									],
									"enumNames": [
										"",
										"korpi",
										"räme",
										"neva"
									]
								},
								"biotypeForest": {
									"type": "string",
									"enum": [
										"",
										"kuusi",
										"mänty",
										"lehto"
									],
									"enumNames": [
										"",
										"kuusi",
										"mänty",
										"lehto"
									]
								},
								"biotypeForestKuusi": {
									"type": "boolean",
									"title": "oliko pelottava kuusimetsä?"
								},
								"biotypeForestMänty": {
									"type": "boolean",
									"title": "Lisämäntymetsäkenttä"
								},
								"biotypeForestMänty2": {
									"type": "boolean",
									"title": "Lisämäntymetsäkenttä2"
								},
								"biotypeForestLehto": {
									"type": "boolean",
									"title": "Oliko uhrilehto?"
								},
								"biotypeSuoKorpi": {
									"type": "string",
									"title": "Kerro lisää korvesta"
								},
								"biotypeSuoRäme": {
									"type": "number",
									"title": "Märkyys 1-10"
								},
								"biotypeSuoNeva": {
									"type": "boolean",
									"title": "Oliko haiseva neva?"
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
								"leg",
								"image",
								"dateBegin"
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
				"legPublic": false,
				"kartta": "",
				"units": [],
				"locality": "",
				"localityDescription": "",
				"habitatDescription": "",
				"biotype": "",
				"biotypeSuo": "",
				"biotypeForest": "",
				"biotypeForestKuusi": false,
				"biotypeForestMänty": false,
				"biotypeForestMänty2": false,
				"biotypeForestLehto": false,
				"biotypeSuoKorpi": "",
				"biotypeSuoRäme": 0,
				"biotypeSuoNeva": false,
				"image": "",
				"rights": "",
			}
		],
			"temp": false,
			"ready": false,
			"editors": ["aaa", "beeee"]
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
