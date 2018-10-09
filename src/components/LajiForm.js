import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import validate from "../validation";
import { transformErrors, initializeValidation } from "../validation";
import { Button, TooltipComponent } from "./components";
import { Panel, Table } from "react-bootstrap";
import PanelHeading from "react-bootstrap/lib/PanelHeading";
import { focusNextInput, focusById, handleKeysWith, capitalizeFirstLetter, decapitalizeFirstLetter, findNearestParentSchemaElemId, getKeyHandlerTargetId, stringifyKeyCombo, getSchemaElementById, scrollIntoViewIfNeeded, isObject } from "../utils";
import equals from "deep-equal";
import { toErrorList } from "react-jsonschema-form/lib/validate";
import merge from "deepmerge";

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
	"ConditionalAdditionalItemsArrayField",
	"AnyToBooleanField",
	"EnumRangeArrayField",
	"UnitListShorthandArrayField",
	"LocationChooserField",
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
	"InformalTaxonGroupChooserWidget",
	"UpperCaseWidget"
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
	}

	static defaultProps = {
		lang: "en",
		uiSchema: {}
	}

	constructor(props) {
		super(props);
		this.apiClient = new ApiClient(props.apiClient, props.lang);
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

		const shortcuts = props.uiSchema["ui:shortcuts"] || {};
		this.keyHandlers = this.getKeyHandlers(shortcuts);
		this._context.keyHandlers = this.keyHandlers;
		this._context.addKeyHandler("root", this.keyFunctions);
		this._context.keyHandlerTargets = Object.keys(this.keyHandlers).reduce((targets, keyCombo) => {
			const handler = this.keyHandlers[keyCombo];
			if ("target" in handler) targets.push({id: handler.target, handler});
			return targets;
		}, []);

		Object.keys(shortcuts).some(keyCombo => {
			if (shortcuts[keyCombo].fn == "help") {
				this.keyCombo = keyCombo;
				this.keyComboDelay = shortcuts[keyCombo].fn;
				return true;
			}
		});

		this._context.shortcuts = props.uiSchema["ui:shortcuts"];

		this.settingSavers = {};
		this.globalSettingSavers = {};
		this._context.addSettingSaver = (key, fn, global = false) => {
			const settingSavers = global ? this.globalSettingSavers : this.settingSavers;
			settingSavers[key] = fn;
		};
		this._context.removeSettingSaver = (key, global = false) => {
			const settingSavers = global ? this.globalSettingSavers : this.settingSavers;
			delete settingSavers[key];
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
			if (!this.focusHandlers[id]) {
				console.warn(`laji-form warning: removing focus handler that isn't registered for id ${id}.`);
				return;
			}
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
		this._context.sendCustomEvent = (id, eventName, data, callback) => {
			const ids = Object.keys(this.customEventListeners[eventName] || {}).filter(_id => id.startsWith(_id)).sort().reverse();

			for (let _id of ids) {
				const result = this.customEventListeners[eventName][_id](data, callback);
				if (result === true || result === undefined) {
					return;
				}
			}
			callback && callback();
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
		};

		this.releaseId = (id, sendId) => {
			if (this.ids[id]) {
				const idx = this.ids[id].indexOf(sendId);
				this.ids[id].splice(idx, 1);
				if (this.ids[id].length > 0) {
					this.ids[id][0](id);
				}
			}
		};

		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		if (props.hasOwnProperty("lang") && this.props.lang !== props.lang) {
			this.apiClient.setLang(props.lang);
		}
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
				settings: JSON.parse(JSON.stringify(
					(
					this.state && this.state.formContext
						? this.state.formContext.settings
						: props.settings
					) || {}
				)),
				contextId: this._id,
				getFormRef: this.getFormRef,
				topOffset: props.topOffset || 0,
				bottomOffset: props.bottomOffset || 0,
				formID: props.id,
				googleApiKey: props.googleApiKey,
				reserveId: this.reserveId,
				releaseId: this.releaseId,
				notifier: props.notifier || this.getDefaultNotifier()
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
				if (typeof translation === "string") {
					dictionaries[lang][word] = decapitalizeFirstLetter(translation);
					dictionaries[lang][capitalizeFirstLetter(word)] = capitalizeFirstLetter(translation);
				} else { // is a function
					dictionaries[lang][word] = (s) => decapitalizeFirstLetter(translation(s));
					dictionaries[lang][capitalizeFirstLetter(word)] = (s) => capitalizeFirstLetter(translation(s));
				}
			}
		}
		return dictionaries;
	}

	getDefaultNotifier = () => {
		if (this.defaultNotifier) return this.defaultNotifier;
		this.defaultNotifier = ["success", "info", "warning", "error"].reduce((notifier, method) => {
			return notifier[method] = msg => console.warn(`Notification component not specified for LajiForm! Got '${method}'notification: '${msg}'`);
		}, {});
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
				{this.props.showShortcutButton !== false && shortcuts && (
					<TooltipComponent tooltip={this.getShorcutButtonTooltip()}>
						<Button bsStyle={undefined} onClick={this.toggleHelp}>{translations.Shortcuts}</Button>
					</TooltipComponent>
				)}
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
					transformErrors={this.transformErrors}
					noHtml5Validate={true}
					liveValidate={true}
					autocomplete="off"
				>
				<div>
					{this.props.children}
					{(!this.props.children && this.props.renderSubmit !== false) ?
						(<Button id="submit" type="submit" onClick={this._onDefaultSubmit}>{this.props.submitText || translations.Submit}</Button>) :
						null}
					</div>
			</Form>
			{shortcuts ? 
				<Panel 
					ref={this.getPanelRef} 
					className="shortcut-help laji-form-popped z-depth-3 hidden" 
					style={{bottom: (this.props.bottomOffset || 0) + 5}}
					bsStyle="info" 
				>
					<PanelHeading>
						<h3>{translations.Shortcuts}<button type="button" className="close pull-right" onClick={this.dismissHelp}>×</button></h3>
					</PanelHeading>
						<Table>
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

	transformErrors = (...params) => {
		const errors =  transformErrors(this.state.translations, !this.validateAll)(...params);
		if (this.validateAll) {
			this._cachedNativeErrors = errors;
		} else if (this._cachedNativeErrors) {
			return this._cachedNativeErrors;
		}
		return errors;
	}

	validate = (...params) => {
		const {live: liveErrorValidators, rest: errorValidators} = splitLive(this.props.validators, this.props.schema.properties);
		const {live: liveWarningValidators, rest: warningValidators} = splitLive(this.props.warnings, this.props.schema.properties);
		const validations = {liveErrors: liveErrorValidators};
		if (this.validateAll) {
			validations.errors = errorValidators;
			if (!this.validationSettings.ignoreWarnings) {
				validations.warnings = warningValidators;
				validations.liveWarnings = liveWarningValidators;
			}
		} else if (!this.validationSettings.ignoreWarnings) {
			validations.liveWarnings = liveWarningValidators;
		}
		return new Promise(resolve => {
			validate(validations, this.validationSettings)(...params).then(_validations => {
				const errors = toErrorList(_validations);
				if (this.validateAll) {
					this._cachedErrors = cacheValidations(_validations);
				} else if (this._cachedErrors) {
					_validations = merge(_validations, this._cachedErrors);
				}
				// Rerun validations with warnings if errors surfaced.
				if (this.validationSettings.ignoreWarnings && errors.length) {
					validations.liveWarnings = liveWarningValidators;
					validate(validations, {...this.validationSettings, ignoreWarnings: false})(...params).then(__validations => {
						if (!this.validateAll) {
							_validations = resolve(merge(__validations, this._cachedErrors));
						} else {
							resolve(__validations);
							this.validateAll = false;
						}
					});
				} else {
					resolve(_validations);
					this.validateAll = false;
				}
			});
		});

		function cacheValidations(validations, cached = {}) {
			Object.keys(validations).forEach(key => {
				if (isObject(validations[key])) {
					cached[key] = cacheValidations(validations[key]);
				} else if (validations[key].some(err => err.includes("[error]") || err.includes("[warning]"))) {
					cached[key] = validations[key].filter(err => err.includes("[error]") || err.includes("[warning]"));
				}
			});
			return cached;
		}

		function splitLive(validators, schema, live = {}, rest = {}) {
			Object.keys(validators).forEach(key => {
				if (schema[key]) {
					live[key] = {};
					rest[key] = {};
					splitLive(validators[key], schema[key], live[key], rest[key]);
					if (Object.keys(live[key]).length === 0) delete live[key];
					if (Object.keys(rest[key]).length === 0) delete rest[key];
				} else {
					const container = validators[key].options && validators[key].options._live ? live : rest;
					container[key] = validators[key];
				}
			});
			return {live, rest};
		}
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
		this.validateAll = true;
		this.propagateSubmit = propagate;
		this.validationSettings.ignoreWarnings = ignoreWarnings;
		this.formRef.onSubmit({preventDefault: () => {}});
	}

	getShorcutButtonTooltip = () => {
		const {translations} = this.state.formContext;
		if (this.keyCombo && this.keyComboDelay) {
			return translations.ShortcutHelp(stringifyKeyCombo(this.keyCombo));
		}
	}

	toggleHelp = (e) => {
		this.helpVisible ? this.dismissHelp(e) : this.showHelp(e);
	}

	showHelp = () => {
		const node = findDOMNode(this.shortcutHelpRef);
		if (!this.helpVisible) {
			if (node) node.className = node.className.replace(" hidden", "");
			this.helpVisible = true;
		}
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

			this.helpTimeout = setTimeout(() => {
				this.showHelp();
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
		}).map(({id}) => getKeyHandlerTargetId(id, this._context));
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

	getSettings = (global = false) => {
		const settingSavers = global ? this.globalSettingSavers : this.settingSavers;
		return Object.keys(settingSavers).reduce((settings, key) => {
			try {
				settings[key] = settingSavers[key]();
			} catch (e) {
				// Swallow failing settings parsing.
			} 
			return settings;
		}, {});
	}
	
	onSettingsChange = (global = false) => {
		const settings = this.getSettings(global);
		if (!equals(this.state.formContext.settings, settings)) {
			// setImmediate because we wait for a possible formData onChange event to bubble, which would be lost otherwise.
			setImmediate(() => {
				this.setState({formContext: {...this.state.formContext, settings: JSON.parse(JSON.stringify(settings))}});
			});
			if (this.props.onSettingsChange) this.props.onSettingsChange(settings, global);
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
