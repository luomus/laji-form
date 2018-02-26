import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import validate from "../validation";
import { transformErrors, initializeValidation } from "../validation";
import { Button } from "./components";
import { Panel, Table } from "react-bootstrap";
import { focusNextInput, focusById, handleKeysWith, capitalizeFirstLetter, decapitalizeFirstLetter, findNearestParentSchemaElemId, getKeyHandlerTargetId, stringifyKeyCombo, getSchemaElementById, scrollIntoViewIfNeeded } from "../utils";
import equals from "deep-equal";

import Form from "react-jsonschema-form";
import ArrayFieldTemplate from "./ArrayFieldTemplate";
import FieldTemplate from "./FieldTemplate";
import ErrorListTemplate from "./ErrorListTemplate";

import ApiClient from "../ApiClient";
import Context from "../Context";
import translations from "../translations.js";

const fields = importLocalComponents("fields", [
	"SchemaField",
	"TitleField",
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
	"ConditionalOnChangeField",
	"ConditionalUiSchemaField",
	"AnnotationField",
	"PrefillingArrayField",
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
		warnings: PropTypes.object,
		liveErrors: PropTypes.object
	}

	static defaultProps = {
		lang: "en",
		uiSchema: {}
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

		this.ids = {};

		// First call returns id, next call (and only the very next) reserves the id until it is released.
		this.reserveId = (id, sendId) => {
			if (this.ids[id] && this.ids[id].length) {
				this.ids[id].push(sendId);
			} else {
				this.ids[id] = [sendId]; // Just mark that the id is now used. It isn't reserved yet.
				return id;
			}
		}

		this.releaseId = (id, sendId) => {
			if (this.ids[id]) {
				const idx = this.ids[id].indexOf(sendId);
				this.ids[id].splice(idx, 1);
				if (this.ids[id].length > 0) {
					this.ids[id][0](id);
				}
			}
		}

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
				lang: props.lang,
				uiSchemaContext: props.uiSchemaContext,
				settings: this.state && this.state.formContext
					? this.state.formContext.settings
					: props.settings,
				contextId: this._id,
				getFormRef: this.getFormRef,
				topOffset: props.topOffset,
				bottomOffset: props.bottomOffset,
				formID: props.id,
				googleApiKey: props.googleApiKey,
				reserveId: this.reserveId,
				releaseId: this.releaseId,
				invalidData: () => {
					return this._context.errorList;
				},
				revalidate: () => {
					if (this.props.validators || this.props.warnings || this.props.liveErrors) {
						this.submit(!"don't propagate");
						return true;
					}
				}
			}
		};
	}

	componentDidMount() {
		this.mounted = true;
		this.props.autoFocus && focusById(this.state.formContext, "root");

		this.blockingLoaderRef = document.createElement("div");
		this.blockingLoaderRef.className = "laji-form blocking-loader";
		if (this.blockingLoaderCounter > 0) this.blockingLoaderRef.className = "laji-form blocking-loader entering";
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
					validate={this.validate}
					transformErrors={transformErrors(translations)}
					noHtml5Validate={true}
					liveValidate={true}
				>
				<div>
					{this.props.children}
					{(!this.props.children && this.props.renderSubmit !== false) ?
						(<Button id="submit" type="submit" onClick={this._onDefaultSubmit}>{translations.Submit}</Button>) :
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

	validate = (...params) => {
		const validations = {warnings: this.props.warnings, liveErrors: this.props.liveErrors};
		if (this._validateAll || this.formRef && this.formRef.state && this.formRef.state.errors.length && !this.formRef.state.errors.every(({stack}) => stack.includes("[warning]") || stack.includes("[liveError]"))) {
			validations.errors = this.props.validators;
			validations.warnings = this.props.warnings;
		}
		return validate(validations, this.validationSettings)(...params);
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

	_onDefaultSubmit = (e) => {
		e.preventDefault();
		this.submit();
	}

	submit = (propagate = true, ignoreWarnings = false) => {
		this._validateAll = true;
		this.propagateSubmit = propagate;
		this.validationSettings.ignoreWarnings = ignoreWarnings;
		this.formRef.onSubmit({preventDefault: () => {}});
		this._validateAll = false;
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
		const settings = this.getSettings();
		if (!equals(this.state.formContext.settings, settings)) {
			this.setState({formContext: {...this.state.formContext, settings}});
			if (this.props.onSettingsChange) this.props.onSettingsChange(settings);
		}
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
