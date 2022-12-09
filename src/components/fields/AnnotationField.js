import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions, getInnerUiSchema, filter, injectButtons, getDefaultFormState } from "../../utils";
import LajiForm from "../LajiForm";
import BaseComponent from "../BaseComponent";
import getContext from "../../Context";
import ReactContext from "../../ReactContext";
import { Button } from "../components";
import * as Spinner from "react-spinner";
import { isObject } from "laji-map/lib/utils";

@BaseComponent
export default class AnnotationField extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				adminOnly: PropTypes.bool,
				container: PropTypes.oneOf(["modal"]),
				add: PropTypes.object,
				filter: PropTypes.object,
				uiSchema: PropTypes.object,
				buttonsPath: PropTypes.string,
				formId: PropTypes.string
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {show: false};
	}

	getButton = () => {
		const annotations = this.getAnnotations();
		return {
			glyph: "comment",
			tooltip: this.props.formContext.translations.ShowAnnotations,
			tooltipPlacement: "left",
			fn: this.onClick,
			variant: annotations && annotations.length ? "primary": "default"
		};
	}

	onClick = () => () => {
		this.setState({show: !this.state.show});
	}

	onHide = () => {
		this.setState({show: false});
	}

	getAnnotations = () => {
		const {annotations = {}} = this.props.formContext.uiSchemaContext;
		const {id} = this.props.formData;
		return getContext(`${this.props.formContext.contextId}_ANNOTATIONS`)[id] || annotations[id];
	}

	render() {
		const {adminOnly, container, add, filter, uiSchema: annotationUiSchema, buttonsPath = "/", formId} = getUiOptions(this.props.uiSchema);
		const innerUiSchema = getInnerUiSchema(this.props.uiSchema);
		let uiSchema = adminOnly && !this.props.formContext.uiSchemaContext.isAdmin
			|| !this.props.formContext.uiSchemaContext.isEdit
			|| !this.props.formData.id
			? innerUiSchema
			: injectButtons(innerUiSchema, [this.getButton()], buttonsPath);

		let Container = undefined;
		const {Modal} = this.context.theme;

		switch (container) {
		case "modal":
			Container = ({children}) => {
				return (
					<Modal show={true} dialogClassName="laji-form" onHide={this.onHide}>
						<Modal.Header closeButton={true} />
						<Modal.Body>
							{children}
						</Modal.Body>
					</Modal>
				);
			};
			break;
		default:
			Container = ({children}) => <div>{children}</div>;
		}

		const {SchemaField} = this.props.registry.fields;
		return (
			<div>
				<SchemaField {...this.props} uiSchema={uiSchema} />
				{(this.props.formData.id && (container !== "modal" || this.state.show)) && 
					<Container>
						<AnnotationBox
							id={this.props.formData.id}
							annotations={this.getAnnotations()}
							lang={this.props.formContext.lang}
							formContext={this.props.formContext} 
							add={add}
							uiSchema={annotationUiSchema}
							filter={filter}
							formId={formId}
						/>
					</Container>
				}
			</div>
		);
	}
}

getContext("SCHEMA_FIELD_WRAPPERS").AnnotationField = true;

class AnnotationBox extends React.Component {
	static contextType = ReactContext;
	constructor(props) {
		super(props);
		this.state = {annotations: props.annotations || []};
	}

	static defaultProps = {
		formId: "MHL.15"
	}

	componentDidMount() {
		this.mounted = true;
		this.props.formContext.apiClient.fetchCached(`/forms/${this.props.formId}`, {lang: this.props.lang, format: "schema"})
			.then(metadataForm => {
				if (!this.mounted) return;
				const {filter: _filter} = this.props;
				let propArray = Object.keys(metadataForm.schema.properties);
				if (_filter) propArray = filter(propArray, _filter.filter, _filter.filterType);

				const schemaProperties = propArray.reduce((properties, prop) => {
					properties[prop] = metadataForm.schema.properties[prop];
					return properties;
				}, {});
				const schema = {...metadataForm.schema, properties: schemaProperties};
				this.setState({metadataForm: {...metadataForm, schema}});
			});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onAnnotationSubmit = ({formData}) => {
		const {type} = this.getAddOptions();
		const context = getContext(this.props.formContext.contextId);
		this.props.formContext.services.blocker.push();
		this.props.formContext.apiClient.fetchRaw("/annotations", undefined, {
			method: "POST",
			body: JSON.stringify({...formData, targetID: this.props.id, rootID: context.formData.id, type, byRole: "MMAN.formAdmin"})
		}).then(response => {
			if (response.status >= 400) {
				throw new Error("Request failed");
			}
			return response.json();
		}).then(annotation => {
			this.props.formContext.services.blocker.pop();
			const annotationContext = getContext(`${this.props.formContext.contextId}_ANNOTATIONS`);
			const annotations = [annotation];
			annotationContext[this.props.id] = annotations;
			this.setState({annotations: annotations, fail: false});
		}).catch(() => {
			this.props.formContext.services.blocker.pop();
			this.setState({fail: true});
		});
	}

	onAnnotationChange = (formData) => {
		let state = {};
		if (this.state.fail !== undefined) {
			state.fail = undefined;
		}
		const {submitOnChange} = this.getAddOptions();
		if (submitOnChange) {
			this.onAnnotationSubmit({formData});
		}
		state.addFormData = formData;
		this.setState(state);
	}

	getAddOptions = () => {
		const {add, formContext: {uiSchemaContext: {isAdmin}}} = this.props;
		let addOptions = isObject(add) ? add : {};
		const submitOnChange = "submitOnChange" in addOptions ? addOptions.submitOnChange : false;
		const type = isAdmin ? "MAN.typeAdmin" : addOptions.type;
		return {...addOptions, submitOnChange, type};
	}

	renderAdd = () => {
		const {formContext, add} = this.props;
		const {lang, translations} = formContext;
		const {metadataForm} = this.state;
		const {Alert} = this.context.theme;

		if (!metadataForm) {
			return null;
		}

		const _uiSchema = this.getUiSchema();
		let addSchema = undefined;
		let addUiSchema = undefined;
		let submitOnChange = undefined;
		let addFormData = undefined;
		if (add && metadataForm && metadataForm.schema) {
			const {adminOnly, filter: _filter, uiSchema: _addUiSchema, _submitOnChange, formData} =  this.getAddOptions();

			if (adminOnly && !formContext.uiSchemaContext.isAdmin) {
				return null;
			}

			let propArray = Object.keys(metadataForm.schema.properties);
			propArray = filter(propArray, ["created", "annotationByPerson"], "blacklist");
			if (_filter) propArray = filter(propArray, _filter.filter, _filter.filterType);

			const addSchemaProperties = propArray.reduce((properties, prop) => {
				properties[prop] = metadataForm.schema.properties[prop];
				return properties;
			}, {});
			addSchema = {...metadataForm.schema, properties: addSchemaProperties};
			addUiSchema = _addUiSchema || {..._uiSchema, "ui:readonly": false};
			submitOnChange = _submitOnChange;
			addFormData = this.state.addFormData || (
				formData
					? getDefaultFormState(addSchema, formData)
					: undefined
			);
		}

		const renderSubmit = !submitOnChange;

		return add && addSchema ? (
			<LajiForm 
				{...metadataForm}
				schema={addSchema}
				uiSchema={addUiSchema || _uiSchema}
				onSubmit={this.onAnnotationSubmit}
				onChange={this.onAnnotationChange}
				renderSubmit={renderSubmit}
				formData={addFormData}
				lang={lang}
				apiClient={this.props.formContext.apiClient.apiClient}
				uiSchemaContext={this.props.formContext.uiSchemaContext}
			>
				{<div>
					{this.state.fail !== undefined && 
							<Alert variant={this.state.fail ? "danger" : "success"}>
								{translations[this.state.fail ? "SaveFail" : "SaveSuccess"]}
							</Alert>
					}
					{renderSubmit && <Button id="submit" type="submit">{translations.Submit}</Button>}
				</div>}
			</LajiForm>
		) : null;
	}

	getUiSchema = () => {
		const {uiSchema} = this.props;
		const {metadataForm = {}} = this.state;
		return uiSchema || {
			...metadataForm.uiSchema, 
			"ui:shortcuts": {
				...((metadataForm.uiSchema || {})["ui:shorcuts"] || {}),
				...(this.props.formContext.services.keyHandler.shortcuts)
			},
			"ui:showShortcutsButton": false
		};
	}

	onDelete = (id) => () => {
		this.props.formContext.apiClient.fetchRaw(`/annotations/${id}`, undefined, {
			method: "DELETE"
		}).then(() => {
			const annotationContext = getContext(`${this.props.formContext.contextId}_ANNOTATIONS`);
			const annotations = this.state.annotations.filter(({id: _id}) => _id !== id);
			annotationContext[this.props.id] = annotations;
			this.setState({deleteFail: false, annotations});
		}).catch(() => {
			this.setState({deleteFail: true});
		});
	}

	render() {
		const {formContext: {translations, lang, apiClient}} = this.props;
		const {metadataForm = {}, annotations = []} = this.state;
		const _uiSchema = {...this.getUiSchema(), "ui:readonly": true};

		const {Panel, ListGroup, ListGroupItem, Alert} = this.context.theme;
		return (
			<Panel>
				<Panel.Heading><strong>{translations.Comments}</strong></Panel.Heading>
				<Panel.Body>
					{this.renderAdd()}
					<ListGroup>
						{this.state.metadataForm ? annotations.slice(0).reverse().map((annotation, idx) => 
							<ListGroupItem key={idx} className={`annotation-list${idx % 2 === 0 ? "" : "-odd"}`}>
								<div>
									<LajiForm
										{...metadataForm}
										uiSchema={_uiSchema}
										lang={lang}
										formData={annotation}
										renderSubmit={false}
										apiClient={apiClient.apiClient}
										uiSchemaContext={this.props.formContext.uiSchemaContext}
									/>
								</div>
							</ListGroupItem>
						) : <Spinner />}
					</ListGroup>
					{this.state.deleteFail &&
						<Alert variant={"danger"}>
							{translations["DeleteFail"]}
						</Alert>
					}
				</Panel.Body>
			</Panel>
		);
	}
}
