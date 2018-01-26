import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import validate from "../validation";
import { getWarnings, getWarningValidatorsById, transformErrors, initializeValidation } from "../validation";
import { Button, Label, Help, ErrorPanel } from "./components";
import { Panel, Table, Glyphicon, OverlayTrigger, Tooltip } from "react-bootstrap";
import { isMultiSelect, focusNextInput, focusById, handleKeysWith, capitalizeFirstLetter, decapitalizeFirstLetter, findNearestParentSchemaElemId, getKeyHandlerTargetId, stringifyKeyCombo, parseJSONPointer, getSchemaElementById, isEmptyString, scrollIntoViewIfNeeded, getUiOptions } from "../utils";
import { getInjectedUiSchema } from "./fields/ContextInjectionField";
import { deepEquals } from  "react-jsonschema-form/lib/utils";

import Form from "react-jsonschema-form";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import ArrayFieldTemplate from "./ArrayFieldTemplate";

import ApiClient from "../ApiClient";
import Context from "../Context";
import translations from "../translations.js";

class _SchemaField extends Component {
	constructor(props) {
		super(props);
		this.updateVirtualInstance(props, !!"initial");
	}

	componentDidMount() {
		const {formContext} = this.props.registry;
		const contextId = formContext.contextId;
		const _context = new Context(contextId);
		const {idToFocus} = _context;
		if (idToFocus !== undefined && this.props.idSchema.$id === idToFocus) {
			focusById(formContext, _context.idToFocus);
			_context.idToFocus = undefined;
		}
	}

	componentWillReceiveProps(props) {
		this.updateVirtualInstance(props);
	}

	updateVirtualInstance = (props, initial) => {
		if ([props, this.props].some(_props => _props.uiSchema && (_props.uiSchema["ui:functions"] || _props.uiSchema["ui:childFunctions"])) &&
		    (initial || !deepEquals([this.props, props]))) {
			this.functionOutputProps = this.applyFunction(props);
		}
	}

	applyFunction = (props) => {
		let {"ui:functions": functions, "ui:childFunctions": childFunctions, ..._uiSchema} = (props.uiSchema || {});

		const objectOrArrayAsArray = item => (
			item ? 
				(Array.isArray(item) ?
					item : 
					[item]) :
				[]
		);

		if (childFunctions) {
			functions = [
				{"ui:field": "UiFieldMapperArrayField", "ui:options": {functions: objectOrArrayAsArray(childFunctions)}},
				...objectOrArrayAsArray(functions)
			];
		}

		if (!functions) return props;

		let nonVirtualFound = false;

		const _functions = ((Array.isArray(functions)) ? functions : [functions]);

		const computedProps = _functions.reduce((_props, uiFn, idx) => {
			if (nonVirtualFound) {
				return _props;
			}
			_props = {..._props, uiSchema: {...uiFn, uiSchema: _props.uiSchema}};

			if (!new Context("VIRTUAL_SCHEMA_NAMES")[uiFn["ui:field"]]) {
				nonVirtualFound = true;
				return {
					..._props,
					uiSchema: {
						..._props.uiSchema,
						"ui:functions": _functions.slice(idx + 1)
					}
				};
			}

			const {state = {}} = new props.registry.fields[uiFn["ui:field"]](_props);
			return {
				..._props, 
				...state, 
				registry: {
					..._props.registry, 
					...state.registry,
					formContext: state.formContext || props.registry.formContext
				}
			};
		}, {...props, uiSchema: _uiSchema, formContext: props.registry.formContext});

		return computedProps;
	}

	render() {
		const props = this.functionOutputProps || this.props;
		let {schema, uiSchema = {}, registry} = props;

		if (schema.uniqueItems && schema.items.enum && !isMultiSelect(schema, uiSchema) && schema.uniqueItems) {
			schema = {...schema, uniqueItems: false};
		}

		const options = getUiOptions(uiSchema);
		if (typeof options.label === "string")  {
			schema = {...schema, title: options.label};
		}

		if (
			uiSchema["ui:field"] &&
			uiSchema["ui:field"] !== "ContextInjectionField" &&
			uiSchema["ui:field"] !== "InjectField" &&
			uiSchema["ui:options"] &&
			uiSchema["ui:options"].injections
		) {
			const {injections} = uiSchema["ui:options"];
			const injectedUiSchema = getInjectedUiSchema(uiSchema, injections, props.formContext.uiSchemaContext);
			uiSchema = {
				...injectedUiSchema,
				"ui:options": {...injectedUiSchema["ui:options"], injections: undefined}
			};
		}

		// Reset ArrayFieldTemplate
		if (registry.ArrayFieldTemplate !== ArrayFieldTemplate) {
			registry = {...registry, ArrayFieldTemplate};
		}

		return <SchemaField
			{...props}
			registry={registry}
			schema={schema}
			uiSchema={uiSchema}
		/>;
	}
}

const _TitleField = ({title, className, buttons, help, id}) => {
	if (isEmptyString(title)) return null;

	if (!help) return <legend className={className}>{title} {buttons}</legend>;

	const tooltipElem = <Tooltip id={id + "-tooltip"}>
							<span>
								<strong>{title}</strong><br />
								{help}
							</span>
						</Tooltip>;

	return (
		<legend>
			<OverlayTrigger placement="right" overlay={tooltipElem}>
				<span>{title} <Help /> {buttons}</span>
			</OverlayTrigger>
		</legend>
	);
};

const fields = importLocalComponents("fields", [
	{SchemaField: _SchemaField},
	{TitleField: _TitleField},
	"ArrayField",
	"ObjectField",
	"NestField",
	"ArrayBulkField",
	"ArrayBulkField",
	"ScopeField",
	"SelectTreeField",
	"GridLayoutField",
	"TableField",
	"InjectField",
	"InjectDefaultValueField",
	"ArrayCombinerField",
	"DependentBooleanField",
	"DependentDisableField",
	"MapArrayField",
	"AutoArrayField",
	"AutosuggestField",
	"HiddenField",
	"InitiallyHiddenField",
	"ContextInjectionField",
	"ImageArrayField",
	"SplitField",
	"FlatField",
	"SingleActiveArrayField",
	"SingleItemArrayField",
	"UnitShorthandField",
	"CombinedValueDisplayField",
	"UiFieldMapperArrayField",
	"ExtraLabelRowField",
	"SumField",
	"NamedPlaceChooserField",
	"NamedPlaceSaverField",
	"TemplateArrayField",
	"MapField",
	"GeocoderField",
	"TagArrayField",
	"StringToArrayField",
	{"InputTransformerField": "ConditionalOnChangeField"}, // Alias for backward compatibility.
	{"ConditionalField": "ConditionalUiSchemaField"}, // Alias for backward compatibility.
	{"UnitRapidField": "UnitShorthandField"}, // Alias for backward compatibility.
	{"AccordionArrayField": "SingleActiveArrayField"} // Alias for backward compatibility.
]);

const widgets = importLocalComponents("widgets", [
	"BaseInput",
	"CheckboxWidget",
	"SelectWidget",
	"TextareaWidget",
	"DateTimeWidget",
	"DateWidget",
	"TimeWidget",
	"SeparatedDateTimeWidget",
	"AutosuggestWidget",
	"HiddenWidget",
	"PlainTextWidget",
	"TextSelectWidget",
	"ImageSelectWidget",
	"AnyToBooleanWidget",
	"URLWidget",
	"InformalTaxonGroupChooserWidget"
]);

function importLocalComponents(dir, fieldNames) {
	return fieldNames.reduce((fields, field) => {
		if (typeof field === "string") {
			fields[field] = require(`./${dir}/${field}`).default;
		} else {
			const fieldName = Object.keys(field)[0];
			if (typeof field[fieldName] === "string") {
				fields[fieldName] = require(`./${dir}/${field[fieldName]}`).default;
			} else {
				fields[fieldName] = field[fieldName];
			}
		}
		return fields;
	}, {});
}

function FieldTemplate({
	id,
	classNames,
	label,
	children,
	rawErrors,
	rawHelp,
	description,
	hidden,
	required,
	displayLabel,
	schema,
	uiSchema,
	formContext
	}) {

	if (hidden || uiSchema["ui:field"] === "HiddenField") {
		return children;
	}
	const inlineHelp = uiSchema["ui:inlineHelp"];
	const belowHelp = uiSchema["ui:belowHelp"];
	const ids = new Context(`${formContext.contextId}_IDS`);
	const htmlId = `_laji-form_${formContext.contextId}_${id}`;
	let elemId = undefined;
	if (!ids[htmlId]  || ids[htmlId] === this) {
		ids[htmlId] = this;
		elemId = htmlId;
	}

	const _displayLabel = (schema.items && schema.items.enum && !isMultiSelect(schema, uiSchema)) ? false : displayLabel;

	let warnings = [];
	const errors = (rawErrors || []).reduce((arr, err) => {
		if (err.indexOf("[warning]") > -1) {
			warnings.push(err.substring("[warning]".length));
		} else {
			arr.push(err);
		}
		return arr;
	}, []);
	if (warnings.length === 0) warnings = formContext.getWarnings(children.props.formData, id);
	const warningClassName = (warnings.length > 0 && errors.length === 0) ? " laji-form-warning-container" : "";

	return (
		<div className={classNames + warningClassName} id={elemId}>
			{label && _displayLabel ? <Label label={label} help={rawHelp} id={id} required={required} /> : null}
			{_displayLabel && description ? description : null}
			<div>
				{inlineHelp ? <div className="pull-left">{children}</div> : children}
				{inlineHelp ? (
					<div className="pull-left"><Help help={inlineHelp} id={`${elemId}-inline-help`} /></div>
					) : null
				}
			</div>
			{belowHelp ? 
				<div className="small text-muted" dangerouslySetInnerHTML={{__html: belowHelp}} /> :
				null
			}
			{errors.length > 0 ?
				<div id={`laji-form-error-container-${id}`}>
					<p></p>
					<ul>
						{errors.map((error, i) => (
							<li key={i} className="text-danger">{error}</li>
						))}
					</ul>
				</div> : null}
			{warnings.length > 0 ?
				<div id={`laji-form-warning-container-${id}`}>
					<p></p>
					<ul>
						{warnings.map((warning, i) => (
							<li key={i} className="text-warning">{warning}</li>
						))}
					</ul>
				</div> : null}
		</div>
	);
}

class ErrorListTemplate extends Component {
	constructor(props) {
		super(props);
		this.state = {popped: true};
		new Context(this.props.formContext.contextId).errorList = this;
	}

	expand = () => {
		if (!this.state.popped) this.setState({popped: true});
		this.refs.errorPanel.expand();
		this.refs.warningPanel.expand();
	};

	render() {
		const {errorSchema, schema, formContext} = this.props;
		const {contextId, translations} = formContext;
		const that = new Context(contextId).formInstance;
		const clickHandler = that.errorClickHandler;

		function walkErrors(path, id, errorSchema) {
			const {__errors, ...properties} = errorSchema;
			let {errors, warnings} = (__errors || []).reduce(({errors, warnings}, _error) => {
				const _schema = parseJSONPointer(schema, path);
				if (_error.indexOf("[warning]") > -1) {
					warnings.push({
						label: _schema.title,
						error: _error.substring("[warning]".length),
						id: id
					});
				} else {
					errors.push({
						label: _schema.title,
						error: _error,
						id: id
					});
				}
				return {errors, warnings};
			}, {errors: [], warnings: []});
			Object.keys(properties).forEach(prop => {
				let _path = path;
				if (prop.match(/^\d+$/)) _path = `${_path}/items`;
				else _path = `${_path}/properties/${prop}`;
				const childErrors = walkErrors(_path, `${id}_${prop}`, errorSchema[prop]);
				errors = [...errors, ...childErrors.errors];
				warnings = [...warnings, ...childErrors.warnings];
			});
			return {errors, warnings};
		}

		const {errors, warnings} = walkErrors("", "root", errorSchema);

		const poppedToggle = (e) => {
			e.stopPropagation();
			this.setState({popped: !this.state.popped});
		};
		const revalidate = () => {
			const that = new Context(this.props.formContext.contextId).formInstance;
			that.submit(!"don`t propagate");
			this.refs.errorPanel.expand();
			this.refs.warningPanel.expand();
		};
		const submitWithWarnings = () => {
			const that = new Context(this.props.formContext.contextId).formInstance;
			that.submit("propagate", "ignore warnings");
		};

		return (
			<div className={`laji-form-clickable-panel laji-form-error-list${this.state.popped ? " laji-form-popped" : ""} ${errors.length === 0 ? " laji-form-warning-list" : ""}`}
				 style={this.state.popped ? {top: (this.props.formContext.topOffset || 0) + 5} : null}>
				<ErrorPanel classNames="error-panel"
							ref="errorPanel"
							errors={errors}
							title={translations.Errors}
							clickHandler={clickHandler}
							showToggle={true}
							poppedToggle={poppedToggle}/>
				<ErrorPanel classNames="warning-panel"
							ref="warningPanel"
							errors={warnings}
							title={translations.Warnings}
							clickHandler={clickHandler}
							showToggle={errors.length === 0}
							poppedToggle={poppedToggle}/>
				<div className="panel-footer">
					<div>
                        {errors.length > 0 ?
							<Button onClick={revalidate}><Glyphicon glyph="refresh"/> {translations.Revalidate}
							</Button> :
							<Button onClick={submitWithWarnings}>{translations.SubmitWithWarnings}</Button>
                        }
					</div>
				</div>
			</div>
		);
	}
}


// Each form should have a unique id to keep Context private.
let id = 0;
function getNewId() {
	const _id = id;
	id++;
	return _id;
}


export default class LajiForm extends Component {
	static propTypes = {
		lang: PropTypes.oneOf(["fi", "en", "sv"]),
		uiSchemaContext: PropTypes.object,
		settings: PropTypes.object,
		validators: PropTypes.object,
		warnings: PropTypes.object
	}

	static defaultProps = {
		lang: "en"
	}

	constructor(props) {
		super(props);
		this.apiClient = new ApiClient(props.apiClient);
		initializeValidation(this.apiClient);
		this.translations = this.constructTranslations();
		this._id = getNewId();
		this._context = new Context(this._id);
		this._context.formInstance = this;
		this.propagateSubmit = true;
		this.validationSettings = {ignoreWarnings: false};

		this.blockingLoaderCounter = 0;
		this._context.blockingLoaderCounter = this.blockingLoaderCounter;
		this._context.pushBlockingLoader = this.pushBlockingLoader;
		this._context.popBlockingLoader = this.popBlockingLoader;

		this._context.keyHandleListeners = {};
		this._context.keyHandleIdFunctions = [];
		this._context.addKeyHandler = (id, keyFunctions, additionalParams) => {
			if (!this._context.keyHandleListeners[id]) this._context.keyHandleListeners[id] = [];
			const handleKey = e => handleKeysWith(this._context, id, keyFunctions, e, additionalParams);
			this._context.keyHandleIdFunctions.push({id, keyFunctions, handleKey});
			this._context.keyHandleListeners[id].push(handleKey);
		};

		this._context.removeKeyHandler = (_id, _keyFunctions) => {
			for (let i in this._context.keyHandleIdFunctions) {
				const idFunction = this._context.keyHandleIdFunctions[i];
				const {id, keyFunctions, handleKey} = idFunction;
				if (id ===  _id && _keyFunctions === keyFunctions) {
					this._context.keyHandleIdFunctions.splice(i, 1);
					this._context.keyHandleListeners[id] = this._context.keyHandleListeners[id].filter(_handleKey =>
						_handleKey !== handleKey
					);
				}
			}

		};

		this.keyHandlers = this.getKeyHandlers(this.props.uiSchema["ui:shortcuts"]);
		this._context.keyHandlers = this.keyHandlers;
		this._context.addKeyHandler("root", this.keyFunctions);
		this._context.keyHandlerTargets = Object.keys(this.keyHandlers).reduce((targets, keyCombo) => {
			const handler = this.keyHandlers[keyCombo];
			if ("target" in handler) targets.push({id: handler.target, handler});
			return targets;
		}, []);

		this._context.shortcuts = props.uiSchema["ui:shortcuts"];

		this.settingSavers = {};
		this._context.addSettingSaver = (key, fn) => {
			this.settingSavers[key] = fn;
		};
		this._context.removeSettingSaver = (key) => {
			delete this.settingSavers[key];
		};
		this._context.onSettingsChange = this.onSettingsChange;

		this.errorClickHandler = (id) => {
			const idParts = id.split("_");

			// Some components focus asynchronously (due to state changes etc), so we reduce
			// the focus handlers to a promise chain.
			let _id = "";
			idParts.reduce((promise, idPart) => {
				return promise.then(() => {
					_id = _id ? `${_id}_${idPart}` : idPart;
					return (this.focusHandlers[_id] || []).reduce((_promise, fn) => {
						const status = fn(); // Either undefined or a Promise.
						return status && status.then ? status : Promise.resolve();
					}, Promise.resolve());
				});
			}, Promise.resolve()).then(() => {
				const container = getSchemaElementById(this._id, id);
				const elem = container || document.querySelector(`#laji-form-error-container-${id}`);
				const input = document.querySelector(`#${id}`);

				if (elem) scrollIntoViewIfNeeded(elem, this.props.topOffset, this.props.bottomOffset);
				if (input) input.focus();

				if (!elem) return;

				if (elem.className.includes(" highlight-error-fire")) elem.className = elem.className.replace(" highlight-error-fire", "");
				this.setImmediate(() => elem.className = `${elem.className} highlight-error-fire`);
			});
		};

		this.focusHandlers = {};
		this._context.addFocusHandler = (id, fn) => {
			if (!this.focusHandlers[id]) this.focusHandlers[id] = [];
			this.focusHandlers[id].push(fn);
		};
		this._context.removeFocusHandler = (id, fn) => {
			this.focusHandlers[id] = this.focusHandlers[id].filter(_fn => fn !== _fn);
		};

		this._context.setImmediate = this.setImmediate;
		this._context.setTimeout = this.setTimeout;
		this._context.addEventListener = this.addEventListener;

		this.customEventListeners = {};
		this._context.addCustomEventListener = (id, eventName, fn) => {
			if (!this.customEventListeners[eventName]) this.customEventListeners[eventName] = {};
			if (!this.customEventListeners[eventName][id]) this.customEventListeners[eventName][id] = fn;
		};
		this._context.removeCustomEventListener = (id, eventName) => {
			delete this.customEventListeners[eventName][id];
		};
		this._context.sendCustomEvent = (id, eventName, data) => {
			const ids = Object.keys(this.customEventListeners[eventName] || {}).filter(_id => id.startsWith(_id)).sort().reverse();

			for (let _id of ids) {
				const result = this.customEventListeners[eventName][_id](data);
				if (result === true || result === undefined) {
					break;
				}
			}
		};

		this.warningValidatorsById = getWarningValidatorsById(props.warnings, props.schema);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		if (props.hasOwnProperty("lang") && this.props.lang !== props.lang) this.apiClient.flushCache();
		this.setState(this.getStateFromProps(props));

	}

	getStateFromProps(props) {
		this._context.staticImgPath = props.staticImgPath;
		this._context.formData = props.formData;
		const translations = this.translations[props.lang];
		return {
			translations,
			formContext: {
				translations,
				lang: this.props.lang,
				uiSchemaContext: this.props.uiSchemaContext,
				settings: this.props.settings,
				contextId: this._id,
				getFormRef: this.getFormRef,
				topOffset: this.props.topOffset,
				bottomOffset: this.props.bottomOffset,
				formID: this.props.id,
				getWarnings: (data, id) => {
					return getWarnings(data, id, this.warningValidatorsById, this._context.formData);
				},
				googleApiKey: props.googleApiKey
			}
		};
	}

	componentDidMount() {
		this.mounted = true;
		this.props.autoFocus && focusById(this.state.formContext, "root");

		this.blockingLoaderRef = document.createElement("div");
		this.blockingLoaderRef.className = "laji-form blocking-loader";
		document.body.appendChild(this.blockingLoaderRef);
	}

	componentWillUnmount() {
		this.mounted = false;
		if (this._context.singletonMap) this._context.singletonMap.destroy();
		document.body.removeChild(this.blockingLoaderRef);
	}

	constructTranslations = () => {
		let dictionaries = {};
		for (let word in translations) {
			for (let lang in translations[word]) {
				const translation = translations[word][lang];
				if (!dictionaries.hasOwnProperty(lang)) dictionaries[lang] = {};
				dictionaries[lang][word] = decapitalizeFirstLetter(translation);
				dictionaries[lang][capitalizeFirstLetter(word)] = capitalizeFirstLetter(translation);
			}
		}
		return dictionaries;
	}

	onChange = ({formData}) => {
		if (this.props.onChange) this.props.onChange(formData);
		this._context.formData = formData;
	}

	getRef = form => {this.formRef = form;}

	getBlockerRef = elem => {this.blockingLoaderRef = elem;}

	getPanelRef = elem => {this.shortcutHelpRef = elem;}

	getFormRef = () => this.formRef

	render() {
		const {translations} = this.state;
		const shortcuts = this.props.uiSchema["ui:shortcuts"];

		return (
			<div onKeyDown={this.onKeyDown} className="laji-form" tabIndex={0}>
				<Form
					{...this.props}
					ref={this.getRef}
					onChange={this.onChange}
					onError={this.onError}
					onSubmit={this.onSubmit}
					fields={fields}
					widgets={widgets}
					FieldTemplate={FieldTemplate}
					ArrayFieldTemplate={ArrayFieldTemplate}
					ErrorList={ErrorListTemplate}
					formContext={this.state.formContext}
					validate={validate(this.props.validators, this.props.warnings, this.validationSettings)}
					transformErrors={transformErrors(translations)}
					noHtml5Validate={true}
				>
				<div>
					{this.props.children}
					{(!this.props.hasOwnProperty("renderSubmit") || this.props.renderSubmit) ?
						(<Button id="submit" type="submit">{translations.Submit}</Button>) :
						null}
					</div>
			</Form>
			{shortcuts ? 
					<Panel 
						ref={this.getPanelRef} 
						className="shortcut-help laji-form-popped z-depth-3 hidden" 
						style={{bottom: (this.props.bottomOffset || 0) + 5}}
						bsStyle="info" 
						header={
							<h3>{translations.Shortcuts}<button type="button" className="close pull-right" onClick={this.dismissHelp}>×</button></h3>
						}
					>
					<Table fill>
						<tbody className="well">{
							Object.keys(shortcuts).map((keyCombo, idx) => {
								const {fn, targetLabel, label, ...rest} = shortcuts[keyCombo];
								if (["help", "textareaRowInsert", "autosuggestToggle"].includes(fn)) return;
								let translation = "";
								if (translation) translation = label;
								else translation = translations[[fn, ...Object.keys(rest)].map(capitalizeFirstLetter).join("")];
								if  (targetLabel) translation = `${translation} ${targetLabel}`;
								return (
									<tr key={idx}>
										<td>{stringifyKeyCombo(keyCombo)}</td><td>{translation}</td>
									</tr>
								);
							})
						}</tbody>
					</Table>
				</Panel> 
			: null}
		</div>
		);
	}

	onSubmit = (...props) => {
		this.propagateSubmit && this.props.onSubmit && this.props.onSubmit(...props);
		this.propagateSubmit = true;
		this.validationSettings.ignoreWarnings = false;
	}

	onError = () => {
		if (this.propagateSubmit) this._context.errorList.expand();
		this.propagateSubmit = true;
		this.validationSettings.ignoreWarnings = false;
	}

	submit = (propagate = true, ignoreWarnings = false) => {
		this.propagateSubmit = propagate;
		this.validationSettings.ignoreWarnings = ignoreWarnings;
		this.formRef.onSubmit({preventDefault: () => {}});
	}

	dismissHelp = (e) => {
		const node = findDOMNode(this.shortcutHelpRef);
		e.preventDefault();
		e.stopPropagation();
		if (this.helpVisible) {
			node.className += " hidden";
		}
		this.helpVisible = false;
		this.helpStarted = false;
		document.removeEventListener("keyup", this.dismissHelp);
		window.removeEventListener("blur", this.dismissHelp);
		clearTimeout(this.helpTimeout);
	}

	keyFunctions = {
		navigate: (e, {reverse}) => {
			return focusNextInput(this.formRef, e.target, reverse);
		},
		help: (e, {delay}) => {
			if (this.helpStarted) return false;

			this.helpStarted = true;

			const node = findDOMNode(this.shortcutHelpRef);
			
			this.helpTimeout = setTimeout(() => {
				if (!this.helpVisible) {
					if (node) node.className = node.className.replace(" hidden", "");
					this.helpVisible = true;
				}
			}, delay * 1000);
			this.addEventListener(document, "keyup", this.dismissHelp);
			this.addEventListener(window, "blur", this.dismissHelp);
			return false;
		},

		revalidate: () => {
			this.submit(!"don't propagate");
		}
	}

	getKeyHandlers = (shortcuts = {}) => {
		return Object.keys(shortcuts).reduce((list, keyCombo) => {
			const shortcut = shortcuts[keyCombo];
			const specials = {
				alt: false,
				ctrl: false,
				shift: false,
			};

			list.push(keyCombo.split("+").reduce((keyHandler, key) => {
				if (specials.hasOwnProperty(key)) {
					specials[key] = true;
				}

				keyHandler.conditions.push(e =>  
					e.key === key || (specials.hasOwnProperty(key) && ((specials[key] && e[`${key}Key`]) || (!specials[key] && !e[`${key}Key`])))
				);

				return keyHandler;
			}, {...shortcut, conditions: []}));

			for (let special in specials) {
				if (!specials[special]) list[list.length - 1].conditions.push(e => {
					return !e[`${special}Key`];
				});
			}

			return list;
		}, []);
	}

	onKeyDown = (e) => {
		if ("keyTimeouts" in this._context && this._context.keyTimeouts) {
			this._context.keyTimeouts.forEach(timeout => clearTimeout(timeout));
		}
		this._context.keyTimeouts = [];

		const currentId = findNearestParentSchemaElemId(this._id, e.target);

		let order = Object.keys(this._context.keyHandleListeners).filter(id => {
			if (currentId.startsWith(id)) return true;
			return; 
		}).sort((a, b) => {
			return a.length < b.length;
		});

		const targets = this._context.keyHandlerTargets.filter(({handler}) => {
			return handler.conditions.every(condition => condition(e));
		}).map(({id}) => getKeyHandlerTargetId(this._context, id));
		order = [...targets, ...order];

		const handled = order.some(id => this._context.keyHandleListeners[id] && this._context.keyHandleListeners[id].some(keyHandleListener => keyHandleListener(e)));

		const activeElement = document.activeElement;
		if (!handled && e.key === "Enter" && (!activeElement || (activeElement.tagName.toLowerCase() !== "textarea" && !activeElement.className.includes("laji-map-input")))) {
			e.preventDefault();
		}
	}

	pushBlockingLoader = () => {
		this.blockingLoaderCounter++;
		this._context.blockingLoaderCounter = this.blockingLoaderCounter;
		if (this.mounted) {
			if (this.blockingLoaderCounter === 1) {
				this.blockingLoaderRef.className = "laji-form blocking-loader entering";
			}
		}
	}

	popBlockingLoader = () => {
		this.blockingLoaderCounter--;
		this._context.blockingLoaderCounter = this.blockingLoaderCounter;
		if (this.blockingLoaderCounter < 0) {
			console.warn("laji-form: Blocking loader was popped before pushing!");
		} else if (this.blockingLoaderCounter === 0) {
			this.blockingLoaderRef.className = "laji-form blocking-loader leave-start";
			this.setImmediate(() => {
				if (this.blockingLoaderRef) this.blockingLoaderRef.className = "laji-form blocking-loader leaving";
				this.setTimeout(() => {
					if (this.blockingLoaderRef) this.blockingLoaderRef.className = "laji-form blocking-loader";
				}, 200); // should match css transition time.
			});
		}
	}

	getSettings = () => {
		return Object.keys(this.settingSavers).reduce((settings, key) => {
			try {
				settings[key] = this.settingSavers[key]();
			} catch (e) {
				// Swallow failing settings parsing.
			} 
			return settings;
		}, {});
	}
	
	onSettingsChange = () => {
		if (this.props.onSettingsChange) this.props.onSettingsChange(this.getSettings());
	}

	addEventListener = (target, name, fn ) => {
		if (!this.eventListeners) this.eventListeners = [];
		target.addEventListener(name, fn);
		this.eventListeners.push([target, name ,fn]);
	}

	setTimeout = (fn, time) => {
		if (!this.timeouts) this.timeouts = [];

		const timeout = setTimeout(fn, time);
		this.timeouts.push(timeout);
		return timeout;
	}

	setImmediate = (fn) => {
		if (!this.immediates) this.immediates = [];

		this.immediates.push(setImmediate(fn));
	}

	destroy = () => {
		if (this.eventListeners) this.eventListeners.forEach(([target, name, fn]) => {
			target.removeEventListener(name, fn);
		});
		if (this.timeouts) this.timeouts.forEach((timeout) => {
			clearTimeout(timeout);
		});
		if (this.immediates) this.immediates.forEach((immediate) => {
			clearImmediate(immediate);
		});
		this.eventListeners = undefined;
	}
}
