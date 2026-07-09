import { test, expect, Page } from "@playwright/test";
import { createForm, DemoPageForm, updateValue } from "./test-utils";

test.describe.configure({ mode: "serial" });

const response = {
	"results": [
		{
			"secureLevel": "MX.secureLevelNone",
			"gatheringEvent": {
				"leg": [
					"MA.0"
				],
				"legPublic": true,
				"dateBegin": "2026-03-02",
				"timeStart": "10:00",
				"dateEnd": "2026-03-02",
				"timeEnd": "11:00",
				"id": "JX.345039#1",
				"@type": "MZ.gatheringEvent"
			},
			"gatherings": [
				{
					"taxonCensus": [
						{
							"censusTaxonSetID": "MX.taxonSetArchipelagoWaterbirds",
							"taxonCensusType": "MY.taxonCensusTypeCounted"
						}
					],
					"units": [
						{
							"taxonConfidence": "MY.taxonConfidenceSure",
							"recordBasis": "MY.recordBasisHumanObservation",
							"informalTaxonGroups": [
								"MVL.1",
								"MVL.1241"
							],
							"identifications": [
								{
									"@type": "MY.identification",
									"id": "JX.345039#6",
									"taxon": "Cygnus olor",
									"taxonID": "MX.26277",
									"taxonVerbatim": "kyhmyjoutsen"
								}
							],
							"observationStatus": "MY.observationStatusObservedPartialCount",
							"id": "JX.345039#5",
							"@type": "MY.unit",
							"maleIndividualCount": 1,
							"femaleIndividualCount": 1,
							"nestCount": 3,
							"unitFact": {
								"destroyedNestCount": 1,
								"juvenileIndividualCount": 3
							}
						},
						{
							"taxonConfidence": "MY.taxonConfidenceSure",
							"recordBasis": "MY.recordBasisHumanObservation",
							"informalTaxonGroups": [
								"MVL.1",
								"MVL.1241"
							],
							"identifications": [
								{
									"@type": "MY.identification",
									"id": "JX.345039#52",
									"taxon": "Mergellus albellus",
									"taxonID": "MX.26438",
									"taxonVerbatim": "uivelo"
								}
							],
							"observationStatus": "MY.observationStatusObservedPartialCount",
							"id": "JX.345039#51",
							"@type": "MY.unit",
							"femaleIndividualCount": 2,
							"notes": "Havaittu rantakalliolla saaren etelälaidalla.",
							"unitFact": {
								"adultIndividualCount": 1
							}
						},
					],
					"geometry": {
						"type": "GeometryCollection",
						"geometries": [
							{
								"type": "Polygon",
								"coordinates": [
									[
										[
											21.866346,
											59.953556
										],
										[
											21.944423,
											59.953556
										],
										[
											21.944423,
											59.988627
										],
										[
											21.866346,
											59.988627
										],
										[
											21.866346,
											59.953556
										]
									]
								]
							}
						]
					},
					"localityDescription": "Kopparholmin saaristoa",
					"biologicalProvince": "Varsinais-Suomi",
					"country": "Suomi",
					"municipality": "Parainen",
					"id": "JX.345039#2",
					"@type": "MY.gathering",
					"gatheringType": "MY.gatheringTypeNestCount"
				}
			],
			"namedPlaceID": "MNP.56680",
			"formID": "MHL.1166",
			"creator": "MA.0",
			"sourceID": "KE.841",
			"collectionID": "HR.6920",
			"editor": "MA.0",
			"publicityRestrictions": "MZ.publicityRestrictionsPublic",
			"dateEdited": "2026-06-25T11:39:09.712Z",
			"dateCreated": "2026-03-02T11:20:11.915Z",
			"id": "JX.345039",
			"@type": "MY.document"
		},
		{
			"secureLevel": "MX.secureLevelNone",
			"gatheringEvent": {
				"leg": [
					"MA.0"
				],
				"legPublic": true,
				"dateBegin": "2026-06-24",
				"timeStart": "07:00",
				"dateEnd": "2026-06-24",
				"timeEnd": "08:00",
				"id": "JX.350784#1",
				"@type": "MZ.gatheringEvent"
			},
			"gatherings": [
				{
					"taxonCensus": [
						{
							"censusTaxonSetID": "MX.taxonSetArchipelagoWaterbirds",
							"taxonCensusType": "MY.taxonCensusTypeCounted"
						},
						{
							"censusTaxonSetID": "MX.taxonSetArchipelagoEgrets",
							"taxonCensusType": "MY.taxonCensusTypeCounted"
						}
					],
					"units": [
						{
							"taxonConfidence": "MY.taxonConfidenceSure",
							"recordBasis": "MY.recordBasisHumanObservation",
							"informalTaxonGroups": [
								"MVL.1",
								"MVL.1241"
							],
							"identifications": [
								{
									"@type": "MY.identification",
									"id": "JX.350784#4",
									"taxon": "Cygnus olor",
									"taxonID": "MX.26277",
									"taxonVerbatim": "kyhmyjoutsen"
								}
							],
							"observationStatus": "MY.observationStatusObservedPartialCount",
							"id": "JX.350784#3",
							"@type": "MY.unit",
							"maleIndividualCount": 1,
							"unitFact": {
								"adultIndividualCount": 1
							}
						},
						{
							"taxonConfidence": "MY.taxonConfidenceSure",
							"recordBasis": "MY.recordBasisHumanObservation",
							"informalTaxonGroups": [
								"MVL.1",
								"MVL.1241"
							],
							"identifications": [
								{
									"@type": "MY.identification",
									"id": "JX.350784#24",
									"taxon": "Anas crecca",
									"taxonID": "MX.26366",
									"taxonVerbatim": "tavi"
								}
							],
							"observationStatus": "MY.observationStatusObservedPartialCount",
							"id": "JX.350784#23",
							"@type": "MY.unit",
							"unitFact": {
								"adultIndividualCount": 3,
								"broodCount": 1,
								"juvenileIndividualCount": 2,
								"pullusIndividualCount": 3
							}
						},
						{
							"taxonConfidence": "MY.taxonConfidenceSure",
							"recordBasis": "MY.recordBasisHumanObservation",
							"informalTaxonGroups": [
								"MVL.1"
							],
							"identifications": [
								{
									"@type": "MY.identification",
									"id": "JX.350784#46",
									"taxon": "Ardea alba",
									"taxonID": "MX.26105",
									"taxonVerbatim": "jalohaikara"
								}
							],
							"observationStatus": "MY.observationStatusNotObserved",
							"id": "JX.350784#45",
							"@type": "MY.unit"
						},
						{
							"taxonConfidence": "MY.taxonConfidenceSure",
							"recordBasis": "MY.recordBasisHumanObservation",
							"informalTaxonGroups": [
								"MVL.1"
							],
							"identifications": [
								{
									"@type": "MY.identification",
									"id": "JX.350784#48",
									"taxon": "Ardea cinerea",
									"taxonID": "MX.26094",
									"taxonVerbatim": "harmaahaikara"
								}
							],
							"observationStatus": "MY.observationStatusObservedPartialCount",
							"maleIndividualCount": 1,
							"femaleIndividualCount": 1,
							"id": "JX.350784#47",
							"@type": "MY.unit"
						}
					],
					"geometry": {
						"type": "GeometryCollection",
						"geometries": [
							{
								"type": "Polygon",
								"coordinates": [
									[
										[
											21.866346,
											59.953556
										],
										[
											21.944423,
											59.953556
										],
										[
											21.944423,
											59.988627
										],
										[
											21.866346,
											59.988627
										],
										[
											21.866346,
											59.953556
										]
									]
								]
							}
						]
					},
					"localityDescription": "Kopparholmin saaristoa",
					"biologicalProvince": "Varsinais-Suomi",
					"country": "Suomi",
					"municipality": "Parainen",
					"gatheringType": "MY.gatheringTypeBoatCount",
					"id": "JX.350784#2",
					"@type": "MY.gathering"
				}
			],
			"namedPlaceID": "MNP.56680",
			"formID": "MHL.1166",
			"creator": "MA.0",
			"sourceID": "KE.542",
			"collectionID": "HR.6920",
			"editor": "MA.0",
			"publicityRestrictions": "MZ.publicityRestrictionsPublic",
			"dateEdited": "2026-06-25T11:35:58.269Z",
			"dateCreated": "2026-06-24T05:43:34.647Z",
			"id": "JX.350784",
			"@type": "MY.document"
		}
	]
};

test.describe("archipelago bird census summary form (MHL.1167)", () => {
	let page: Page;
	let form: DemoPageForm;

	test.beforeAll(async ({ browser }) => {
		page = await browser.newPage();
		await page.route("**/documents**", route => {
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(response)
			});
		});
		form = await createForm(page, { id: "MHL.1167", localFormData: true });
	});

	test("shows no units before setting dateBegin", async () => {
		await expect(page.getByText("uivelo")).not.toBeVisible();
	});

	test("setting dateBegin shows observed units", async () => {
		const dateWidget = form.getDateWidget("gatheringEvent.dateBegin");
		await updateValue(dateWidget.$input, "7.7.2026");
		await expect(page.getByText("uivelo")).toBeVisible();
	});

	test("setting dateBegin does not show non-observed units", async () => {
		const dateWidget = form.getDateWidget("gatheringEvent.dateBegin");
		await updateValue(dateWidget.$input, "7.7.2026");
		await expect(page.getByText("jalohaikara")).not.toBeVisible();
	});
});