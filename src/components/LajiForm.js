import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import validate from "../validation";
import { Button, Label, Help } from "./components";
import { Panel, Table } from "react-bootstrap";
import { isMultiSelect, focusNextInput, focusById, handleKeysWith, capitalizeFirstLetter, decapitalizeFirstLetter, findNearestParentSchemaElemId, getKeyHandlerTargetId, stringifyKeyCombo } from "../utils";

import Form from "react-jsonschema-form";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import ArrayFieldTemplate from "./ArrayFieldTemplate";

import ApiClient from "../ApiClient";
import Context from "../Context";
import translations from "../translations.js";

class _SchemaField extends Component {
	componentDidMount() {
		const contextId = this.props.registry.formContext.contextId;
		const _context = new Context(contextId);
		const {idToFocus} = _context;
		if (idToFocus !== undefined && this.props.idSchema.$id === idToFocus) {
			focusById(contextId, _context.idToFocus);
			_context.idToFocus = undefined;
		}
	}

	render() {
		const {props} = this;
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
	"GridLayoutField",
	"TableField",
	"InjectField",
	"InjectDefaultValueField",
	"AdditionalsExpanderField",
	"ArrayCombinerField",
	"DependentBooleanField",
	"DependentDisableField",
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

	const buttons = uiSchema["ui:buttons"] || undefined;
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
			{errors}
		</div>
	);
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
		this._context.removeSettingSaver = (key) => this.settingSavers[key] = undefined;
		this._context.onSettingsChange = this.onSettingsChange;

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
					fields={fields}
					widgets={widgets}
					FieldTemplate={FieldTemplate}
					ArrayFieldTemplate={ArrayFieldTemplate}
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
				<Panel ref={this.getPanelRef} className="shortcut-help z-depth-3 hidden" bsStyle="info" header={<h3>{translations.Shortcuts}</h3>}>
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

	submit = () => {
		this.formRef.onSubmit({preventDefault: () => {}});
	}

	keyFunctions = {
		navigate: (e, {reverse}) => {
			return focusNextInput(this.formRef, e.target, reverse);
		},
		help: (_, {delay}) => {

			if (this.helpStarted) return true;

			this.helpStarted = true;

			const node = findDOMNode(this.shortcutHelpRef);
			
			const that = this;
			function dismiss(e) {
				e.preventDefault();
				e.stopPropagation();
				if (that.helpVisible) {
					node.className += " hidden";
				}
				that.helpVisible = false;
				that.helpStarted = false;
				document.removeEventListener("keyup", dismiss);
				window.removeEventListener("blur", dismiss);
				clearTimeout(that.helpTimeout);
			}

			this.helpTimeout = setTimeout(() => {
				if (!that.helpVisible) {
					node.className = node.className.replace(" hidden", "");
					that.helpVisible = true;
				}
			}, delay * 1000);
			document.addEventListener("keyup", dismiss);
			window.addEventListener("blur", dismiss);
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
			setImmediate(() => {
				this.blockingLoaderRef.className = "blocking-loader leaving";
			});
			setTimeout(() => {
				this.blockingLoaderRef.className = "blocking-loader";
			}, 200); // should match css transition time.
		}
	}

	getSettings = () => {
		return Object.keys(this.settingSavers).reduce((settings, key) => {
			settings[key] = this.settingSavers[key]();
			return settings;
		}, {});
	}
	
	onSettingsChange = () => {
		if (this.props.onSettingsChange) this.props.onSettingsChange(this.getSettings());
	}
}
