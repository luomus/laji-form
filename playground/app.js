import React, { Component } from "react";
import { render } from "react-dom"
import LajiForm from "../src/components/LajiForm";

class LajiFormApp extends Component {
	constructor(props) {
		super(props);
		const response = {
			"id": "JX.519",
			"title": "Tripreport",
			"description": "With this form you can log spceimens that you've seen.",
			"uiSchema": {
				"ui:field": "inject",
				"ui:options": {
					"injections": {
						"fields": ["editors", "test"],
						"target": "gatherings"
					}
				},
				"gatherings": {
					"items": {
						"ui:field": "nested",
						"ui:options": {
							"eventTime": {
								"title": "Aika",
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
							"legWrapper": {
								"title": "Havainnoitsijat",
								"fields": ["leg", "legPublic", "editors"],
								"uiSchema": {
									"ui:field": "nested",
									"ui:options": {
										"legInnerWrapper": {
											"fields": ["leg", "editors"],
											"uiSchema": {
												"ui:field": "dependentBoolean",
												"ui:options": {
													"booleanField": "editors",
													"booleanDefiner": "leg",
													"uiSchema": {
														"ui:field": "arrayCombiner",
														"ui:options": {
															"uiSchema": {
																"ui:field": "table"
															}
														}
													}
												}
											}
										}
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
								fields: [
									"locality",
									"localityDescription",
									"habitatDescription",
									"biotype",
									"biotypeForest",
									"biotypeSuo",
									"biotypeForestKuusi",
									"biotypeForestMänty",
									"biotypeForestMänty2",
									"biotypeForestLehto",
									"biotypeSuoKorpi",
									"biotypeSuoRäme",
									"biotypeSuoNeva",
									"biotypeTest"
								],
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
													"fields": [
														"locality",
														"localityDescription",
														"biotypeForest",
														"habitatDescription"
													],
													"fieldScopes": {
														"biotypeForest": {
															"kuusi": {
																"fields": ["biotypeForestKuusi"]
															},
															"mänty": {
																"fields": [
																	"biotypeForestMänty",
																	"biotypeForestMänty2"
																],
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
													"fields": [
														"locality",
														"localityDescription",
														"biotypeSuo"
													],
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
													"alive",
													"notes"
												],
												"uiSchema": {
													"ui:options": {
														"additionalFields": ["alive", "notes"]
													}
												}
											},
											"MY.korvasieni": {
												"fields": [
													"age",
													"count",
													"alive",
													"notes"
												],
												"uiSchema": {
													"ui:options": {
														"additionalFields": ["notes"]
													}
												}
											},
											"MY.kalalokki": {
												"fields": [
													"age",
													"count",
													"ring",
													"sex",
													"alive",
													"notes"
												],
												"uiSchema": {
													"ui:options": {
														"additionalFields": ["notes"]
													}
												}
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
						"title": "Anna käyttäjälle muokkausoikeus?",
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
									"type": "boolean",
									"title": "Näytetäänkö nimi julkisesti?"
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
								"biotypeTest": {
									"type": "string",
									"title": "Testibiotyyppikenttä"
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
							//"required": [
							//	"leg",
							//	"image",
							//	"dateBegin"
							//]
						}
					},
					"test": {
						"type": "string"
					},
					"test2": {
						"type": "string"
					},
					"temp": {
						"type": "boolean"
					},
					"ready": {
						"type": "boolean"
					}
				},
				//"required": ["test", "test2"]
			}
		}


		const formData = {
			"gatherings": [
				{
					"dateBegin": "",
					"dateEnd": "",
					"leg": ["a", "b", "c"],
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
			"editors": ["a", "c", "d"]
		}

		this.state = {schema: response.schema, uiSchema: response.uiSchema, formData};
	}

	render () {
		return (
			<div className="container">
				<LajiForm {...this.state} />
			</div>
		);
	}
}

render((<LajiFormApp />), document.getElementById("app"));
