import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import validate from "../validation";
import { Button, Label, Help, GlyphButton } from "./components";
import { Panel, Table, ListGroup, ListGroupItem, Glyphicon } from "react-bootstrap";
import { isMultiSelect, focusNextInput, focusById, handleKeysWith, capitalizeFirstLetter, decapitalizeFirstLetter, findNearestParentSchemaElemId, getKeyHandlerTargetId, stringifyKeyCombo, parseJSONPointer, getSchemaElementById } from "../utils";
import { deepEquals } from  "react-jsonschema-form/lib/utils";
import scrollIntoViewIfNeeded from "scroll-into-view-if-needed";

import Form from "react-jsonschema-form";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import ArrayFieldTemplate from "./ArrayFieldTemplate";

import ApiClient from "../ApiClient";
import Context from "../Context";
import translations from "../translations.js";

class _SchemaField extends Component {
	constructor(props) {
		super(props);
		this.updateVirtualInstance(props);
	}

	componentDidMount() {
		const contextId = this.props.registry.formContext.contextId;
		const _context = new Context(contextId);
		const {idToFocus} = _context;
		if (idToFocus !== undefined && this.props.idSchema.$id === idToFocus) {
			focusById(contextId, _context.idToFocus);
			_context.idToFocus = undefined;
		}
	}

	componentWillReceiveProps(props) {
		this.updateVirtualInstance(props);
	}

	updateVirtualInstance = (props) => {
		if ([props, this.props].forEach(_props => _props.uiSchema && (_props.uiSchema["ui:functions"] || _props.uiSchema["ui:childFunctions"])) || !deepEquals([this.props, props])) {
			this.functionOutputProps = this.applyFunction(props);
		}
	}

	applyFunction = (props) => {
		let {"ui:functions": functions, "ui:childFunctions": childFunctions} = (props.uiSchema || {});

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

		const computedProps = ((Array.isArray(functions)) ? functions : [functions]).reduce((_props, {"ui:field": uiField, "ui:options": uiOptions}) => {
			_props = {..._props, uiSchema: {..._props.uiSchema, "ui:field": uiField, "ui:options": uiOptions, uiSchema: undefined}};
			const {state = {}} = new props.registry.fields[uiField](_props);
			return {..._props, ...state};
		}, {...props, formContext: props.registry.formContext});

		return {
			...computedProps,
			uiSchema: {
				...computedProps.uiSchema,
				"ui:functions": undefined,
				"ui:childFunctions": undefined,
				"ui:field": props.uiSchema["ui:field"],
				"ui:options": props.uiSchema["ui:options"],
				uiSchema: props.uiSchema.uiSchema
			}
		};
	}

	render() {
		const props = this.functionOutputProps || this.props;

		let {schema, uiSchema, registry} = props;

		if (schema.uniqueItems && schema.items.enum && !isMultiSelect(schema, uiSchema) && schema.uniqueItems) {
			schema = {...schema, uniqueItems: false};
		}

		if (uiSchema && uiSchema["ui:field"] && uiSchema.uiSchema && new Context("VIRTUAL_SCHEMA_NAMES")[uiSchema["ui:field"]] && uiSchema["ui:buttons"]) {
			uiSchema = {
				...uiSchema,
				"ui:buttons": undefined,
				uiSchema: {
					...uiSchema.uiSchema,
					"ui:buttons": uiSchema["ui:buttons"]
				}
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

const fields = importLocalComponents("fields", [
	{SchemaField: _SchemaField},
	// Disabled until we have time to make it work properly. StringField wrapper was used to optimization:
	// it caused the onChange-events to trigger events only on blur, not on every key stroke.
	// "StringField",
	"ArrayField",
	"NestField",
	"ArrayBulkField",
	"ArrayBulkField",
	"ScopeField",
	"SelectTreeField",
	"GridLayoutField",
	"TableField",
	"InjectField",
	"InjectDefaultValueField",
	"AdditionalsExpanderField",
	"ArrayCombinerField",
	"DependentBooleanField",
	"DependentDisableField",
	"DependentUiSchemaInjectionField",
	"MapArrayField",
	"AutoArrayField",
	"CopyValuesArrayField",
	"AutosuggestField",
	"HiddenField",
	"InitiallyHiddenField",
	"InputTransformerField",
	"ContextInjectionField",
	"ImageArrayField",
	"SplitField",
	"FlatField",
	"SingleActiveArrayField",
	"SingleItemArrayField",
	"UnitShorthandField",
	"CombinedStringField",
	"UiFieldMapperArrayField",
	"SplitArrayField",
	"InlineLabelField",
	{"UnitRapidField": "UnitShorthandField"}, // Alias for backward compatibility.
	{"AccordionArrayField": "SingleActiveArrayField"} // Alias for backward compatibility.
]);

const widgets = importLocalComponents("widgets", [
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
	"ImageSelectWidget",
	"AnyToBooleanWidget"
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
	errors,
	rawHelp,
	description,
	hidden,
	displayLabel,
	schema,
	uiSchema,
	formContext
	}) {

	if (hidden) {
		return children;
	}
	const inlineHelp = uiSchema["ui:inlineHelp"];
	const ids = new Context(`${formContext.contextId}_IDS`);
	const htmlId = `_laji-form_${formContext.contextId}_${id}`;
	let elemId = undefined;
	if (!ids[htmlId]  || ids[htmlId] === this) {
		ids[htmlId] = this;
		elemId = htmlId;
	}

	const _displayLabel = (schema.items && schema.items.enum && !isMultiSelect(schema, uiSchema)) ? false : displayLabel;

	const buttons = (uiSchema["ui:buttons"] && schema.type !== "array") ? uiSchema["ui:buttons"] : undefined;
	const vertical = uiSchema["ui:buttonsVertical"];
	return (
		<div className={classNames} id={elemId}>
			{label && _displayLabel ? <Label label={label} help={rawHelp} id={id} /> : null}
			{_displayLabel && description ? description : null}
			<div className={"laji-form-field-template-item" + (vertical ? " keep-vertical" : "")}>
				<div className={"laji-form-field-template-schema"}>
					{inlineHelp ? <div className="pull-left">{children}</div> : children}
					{inlineHelp ? (
						<div className="pull-left"><Help help={inlineHelp} id={`${elemId}-inline-help`} /></div>
						) : null
					}
				</div>
				{buttons ?
					<div className="laji-form-field-template-buttons">{buttons}</div> :
					null
				}
			</div>
			<div id={`laji-form-error-container-${id}`}>
				{errors}
			</div>
		</div>
	);
}

class ErrorListTemplate extends Component {
	constructor(props) {
		super(props);
		this.state = {expanded: true, popped: true};
	}

	render() {
		const	{errorSchema, schema, formContext: {translations, contextId}} = this.props;
		const that = new Context(contextId).formInstance;
		const clickHandler = that.errorClickHandler;

		function walkErrors(path, id, errorSchema) {
			const {__errors, ...properties} = errorSchema;
			let errors = (__errors || []).map(_error => {
				const _schema = parseJSONPointer(schema, path);
				return {
					label: _schema.title,
					error: _error,
					id: id
				};
			});
			Object.keys(properties).forEach(prop => {
				let _path = path;
				if (prop.match(/^\d+$/)) _path = `${_path}/items`;
				else _path = `${_path}/properties/${prop}`;
				errors = [...errors, ...walkErrors(_path, `${id}_${prop}`, errorSchema[prop])];
			});
			return errors;
		}

		const _errors = walkErrors("", "root", errorSchema);

		const collapseToggle = () => this.setState({expanded: !this.state.expanded});
		const poppedToggle = (e) => {
			e.stopPropagation();
			this.setState({popped: !this.state.popped});
		};
		const refresh = () => {
			that.submit(!"don`t propagate");
		};

		return (
			<Panel collapsible expanded={this.state.expanded} 
				className={`laji-form-clickable-panel laji-form-error-list${this.state.popped ? " laji-form-popped" : ""}`}
				bsStyle="danger" 
				header={
				<div className="laji-form-clickable-panel-header" onClick={collapseToggle}>
					<div className="panel-title">
						{translations.Errors}
						<span className="pull-right">
							<GlyphButton glyph={this.state.expanded ? "minus" : "plus"} bsStyle="link" />
							<GlyphButton glyph="new-window" bsStyle="link" onClick={poppedToggle} />
						</span>
					</div>
				</div>
				}
				footer={
					<Button onClick={refresh}><Glyphicon glyph="refresh" /> {translations.RefreshErrors}</Button>
				}
			>
				<ListGroup fill>
					{_errors.map(({label, error, id}, i) =>  {
						const _clickHandler = () => clickHandler(id);
						return (
							<ListGroupItem key={i} onClick={_clickHandler}>
								<b>{label}:</b> {error}
							</ListGroupItem>
						);
					}
					)}
				</ListGroup>
			</Panel>
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
		validators: PropTypes.object
	}

	static defaultProps = {
		lang: "en"
	}

	constructor(props) {
		super(props);
		this.apiClient = new ApiClient(props.apiClient);
		this.translations = this.constructTranslations();
		this._id = getNewId();
		this._context = new Context(this._id);
		this._context.formInstance = this;
		this.propagateSubmit = true;

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
			//delete this._context.keyHandleListeners[id];
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
		this._context.addSettingSaver = (key, fn) => this.settingSavers[key] = fn;
		this._context.removeSettingSaver = (key) => {
			delete this.settingSavers[key];
		};
		this._context.onSettingsChange = this.onSettingsChange;

		this.errorClickHandler = (id) => {
			const idParts = id.split("_");

			// Some components focus asynchronously (due to state changes etc), so we go reduce
			// the focus handlers to a promise chain.
			let _id = "";
			idParts.reduce((promise, idPart) => {
				return promise.then(() => {
					_id = _id ? `${_id}_${idPart}` : idPart;
					return (this.FocusHandlers[_id] || []).reduce((_promise, fn) => {
						const status = fn(); // Either undefined or a Promise.
						return status && status.then ? status : Promise.resolve();
					}, Promise.resolve());
				});
			}, Promise.resolve()).then(() => {
				const container = getSchemaElementById(this._id, id);
				const elem = document.querySelector(`#laji-form-error-container-${id}`) || container;
				const input = document.querySelector(`#${id}`);

				if (input) input.focus();

				if (!elem) return;

				scrollIntoViewIfNeeded(elem);

				let timeout = undefined;
				const flash = (count = 1) => {
					if (count <= 0) return;
					elem.className = `${elem.className} highlight-error-start`;
					this._context.setTimeout(() => {
						if (!elem)  return;
						elem.className = elem.className.replace("highlight-error-start", "highlight-error");
						if (timeout) this._context.clearTimeout(timeout);
						timeout = this._context.setTimeout(() => {
							if (elem) elem.className = elem.className.replace(" highlight-error", "");
							count = count - 1;
							flash(count);
						}, 300);
					}, 50);
				};
				flash(2);
			});
		};

		this.FocusHandlers = {};
		this._context.addFocusHandler = (id, fn) => {
			if (!this.FocusHandlers[id]) this.FocusHandlers[id] = [];
			this.FocusHandlers[id].push(fn);
		};
		this._context.removeFocusHandler = (id, fn) => {
			this.FocusHandlers[id] = this.FocusHandlers[id].filter(_fn => fn !== _fn);
		};

		this._context.setImmediate = this.setImmediate;
		this._context.setTimeout = this.setTimeout;
		this._context.addEventListener = this.addEventListener;

		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		if (props.hasOwnProperty("lang") && this.props.lang !== props.lang) this.apiClient.flushCache();
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props) {
		this._context.staticImgPath = props.staticImgPath;
		this._context.formData = props.formData;
		return {translations: this.translations[props.lang]};
	}

	componentDidMount() {
		this.mounted = true;
		focusById(this._id, "root");
	}

	componentWillUnmount() {
		this.mounted = false;
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

	render() {
		const {translations} = this.state;
		const shortcuts = this.props.uiSchema["ui:shortcuts"];
		return (
			<div onKeyDown={this.onKeyDown} className="laji-form" tabIndex={0}>
				<Form
					{...this.props}
					ref={this.getRef}
					onChange={this.onChange}
					onSubmit={this.onSubmit}
					fields={fields}
					widgets={widgets}
					FieldTemplate={FieldTemplate}
					ArrayFieldTemplate={ArrayFieldTemplate}
					ErrorList={ErrorListTemplate}
					formContext={{
						translations,
						lang: this.props.lang,
						uiSchemaContext: this.props.uiSchemaContext,
						settings: this.props.settings,
						contextId: this._id,
						getFormRef: () => this.formRef
					}}
				  validate={validate(this.props.validators)}
				>
				<div>
					{this.props.children}
					{(!this.props.hasOwnProperty("renderSubmit") || this.props.renderSubmit) ?
						(<Button id="submit" type="submit">{translations.Submit}</Button>) :
						null}
					</div>
			</Form>
			<div ref={this.getBlockerRef} className="blocking-loader" />
			{shortcuts ? 
					<Panel ref={this.getPanelRef} className="shortcut-help laji-form-popped z-depth-3 hidden" bsStyle="info" header={
						<h3>{translations.Shortcuts}<button type="button" className="close pull-right" onClick={this.dismissHelp}>×</button></h3>
					}>
					<Table fill>
						<tbody className="well">{
							Object.keys(shortcuts).map((keyCombo, idx) => {
								const {fn, targetLabel, label, ...rest} = shortcuts[keyCombo];
								if (["help", "textareaRowInsert"].includes(fn)) return;
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
	}

	submit = (propagate = true) => {
		this.propagateSubmit = propagate;
		this.formRef.onSubmit({preventDefault: () => {}});
		this.propagateSubmit = true;
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
		help: (_, {delay}) => {

			if (this.helpStarted) return true;

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
				this.blockingLoaderRef.className = "blocking-loader enter-start";
				setImmediate(() => {
					this.blockingLoaderRef.className = "blocking-loader entering";
				});
			}
		}
	}

	popBlockingLoader = () => {
		this.blockingLoaderCounter--;
		this._context.blockingLoaderCounter = this.blockingLoaderCounter;
		if (this.blockingLoaderCounter < 0) {
			console.warn("laji-form: Blocking loader was popped before pushing!");
		} else if (this.blockingLoaderCounter === 0) {
			this.blockingLoaderRef.className = "blocking-loader leave-start";
			this.setImmediate(() => {
				if (this.blockingLoaderRef) this.blockingLoaderRef.className = "blocking-loader leaving";
			});
			this.setTimeout(() => {
				if (this.blockingLoaderRef) this.blockingLoaderRef.className = "blocking-loader";
			}, 200); // should match css transition time.
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

		this.timeouts.push(setTimeout(fn, time));
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
