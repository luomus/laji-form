import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import validate from "../validation";
import { transformErrors, initializeValidation } from "../validation";
import { Button, TooltipComponent, FailedBackgroundJobsPanel } from "./components";
import { Panel, Table, ProgressBar } from "react-bootstrap";
import PanelHeading from "react-bootstrap/lib/PanelHeading";
import { focusNextInput, focusById, handleKeysWith, capitalizeFirstLetter, decapitalizeFirstLetter, findNearestParentSchemaElemId, getKeyHandlerTargetId, stringifyKeyCombo, getSchemaElementById, scrollIntoViewIfNeeded, isObject, getScrollPositionForScrollIntoViewIfNeeded, getWindowScrolled, addLajiFormIds, highlightElem } from "../utils";
import equals from "deep-equal";
import { toErrorList } from "react-jsonschema-form/lib/validate";
import { getDefaultFormState } from "react-jsonschema-form/lib/utils";
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
	"DataLeakerField",
	"LocalityField",
	"ImageDisplayField",
	"DescriptionField",
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
	"TaxonImageWidget",
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
		this.bgJobRef = React.createRef();
		this.apiClient = new ApiClient(props.apiClient, props.lang);
		initializeValidation(this.apiClient);
		this.translations = this.constructTranslations();
		this._id = getNewId();

		this._context = new Context(this._id);
		this._context.formInstance = this;
		this._context.formData = props.formData;
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

				highlightElem(elem);
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
		this._context.sendCustomEvent = (id, eventName, data, callback, {bubble = true} = {}) => {
			const ids = Object.keys(this.customEventListeners[eventName] || {}).filter(_id => id.startsWith(_id)).sort().reverse();

			for (let _id of ids) {
				const result = this.customEventListeners[eventName][_id](data, callback);
				if (!bubble) break;
				if (result === true || result === undefined) {
					return;
				}
			}
			callback && callback();
		};

		this._globalEventsRootHandler = {};
		this._globalEventHandlers = {};
		this._context.addGlobalEventHandler = (name, fn) => {
			if (!this._globalEventHandlers[name]) {
				this._globalEventsRootHandler[name] = e => {
					if (!e.persist) e.persist = () => {};
					const origStopPropagation = e.stopPropagation;
					e.stopPropagation = () => {
						e._lajiFormStoppedFlag = true;
						origStopPropagation.call(e);
					}
					this._globalEventHandlers[name].some(h => {
						if (e._lajiFormStoppedFlag) {
							return true;
						}
						h(e);
					});
				};
				document.addEventListener(name, this._globalEventsRootHandler[name]);
				this._globalEventHandlers[name] = [];
			}
			this._globalEventHandlers[name].push(fn);
		};
		this._context.removeGlobalEventHandler = (name, fn) => {
			this._globalEventHandlers[name] = this._globalEventHandlers[name].filter(_fn => _fn !== fn);
			if (this._globalEventHandlers[name].length === 0) {
				delete this._globalEventHandlers[name];
				document.removeEventListener(name, this._globalEventsRootHandler[name]);
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

		this._context.addSubmitHook = (lajiFormId, relativePointer, hook, description) => {
			const _hook = hook.then(() => {
				this._context.removeSubmitHook(lajiFormId, _hook);
			}).catch(e => {
				this.setState({submitHooks: this.state.submitHooks.map(hookItem => hookItem.hook === _hook ? {...hookItem, e, running: false} : hookItem)});
				throw e;
			});

			this.setState({submitHooks: [
				...(this.state.submitHooks || []),
				{hook: _hook, lajiFormId, description, relativePointer, running: true}
			]});
			return _hook;
		};
		this._context.removeSubmitHook = (lajiFormId, hook) => {
			lajiFormId = +lajiFormId;
			this.setState({submitHooks: (this.state.submitHooks || []).filter(({hook: _hook, lajiFormId: _lajiFormId}) => (hook ? _hook !== hook : lajiFormId !== _lajiFormId))});
		};
		this._context.removeAllSubmitHook = () => {
			this.setState({submitHooks: []});
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
		new Context().staticImgPath = props.staticImgPath;
		const translations = this.translations[props.lang];
		if (!this.tmpIdTree || props.schema !== this.props.schema) {
			this.setTmpIdTree(props.schema);
		}
		const state = {
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
				notifier: props.notifier || this.getDefaultNotifier(),
				apiClient: this.apiClient,
				tmpIdTree: this.tmpIdTree
			}
		};
		if (!this.state || props.formData && props.formData !== this.props.formData) {
			state.formData = this.addLajiFormIds(getDefaultFormState(props.schema, props.formData, undefined), this.tmpIdTree);
			this._context.formData = state.formData;
		} else {
			state.formData = this.formRef.state.formData;
		}
		return state;
	}

	componentDidMount() {
		this.mounted = true;
		this.props.autoFocus && focusById(this.state.formContext, "root");

		this.blockingLoaderRef = document.createElement("div");
		this.blockingLoaderRef.className = "laji-form blocking-loader";
		if (this.blockingLoaderCounter > 0) this.blockingLoaderRef.className = "laji-form blocking-loader entering";
		document.body.appendChild(this.blockingLoaderRef);

		this._context.addGlobalEventHandler("keydown", this.onKeyDown);


		if (this.props.componentDidMount) this.props.componentDidMount();
	}

	componentWillUnmount() {
		this.mounted = false;
		if (this._context.singletonMap) this._context.singletonMap.destroy();
		document.body.removeChild(this.blockingLoaderRef);
		this._context.removeGlobalEventHandler("keydown", this.onKeyDown);
	}

	componentDidCatch(e, i) {
		this.setState({error: true});
		if (this.props.onError) {
			this.props.onError(e, i);
		}
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

	setTmpIdTree = (schema) => {
		function walk(_schema) {
			if (_schema.properties) {
				const _walked = Object.keys(_schema.properties).reduce((paths, key) => {
					const walked = walk(_schema.properties[key]);
					if (walked) {
						paths[key] = walked;
					}
					return paths;
				}, {});
				if (Object.keys(_walked).length) return _walked;
			} else if (_schema.type === "array" && _schema.items.type === "object") {
				return Object.keys(_schema.items.properties).reduce((paths, key) => {
					const walked = walk(_schema.items.properties[key]);
					if (walked) {
						paths[key] = walked;
					}
					return paths;
				}, {});
			}
		}
		this.tmpIdTree = walk(schema);
	}

	addLajiFormIds = (formData) => {
		return addLajiFormIds(formData, this.tmpIdTree)[0];
	}

	removeLajiFormIds = (formData) => {
		function walk(_formData, tree) {
			if (tree && isObject(_formData)) {
				return Object.keys(_formData).reduce((f, k) => {
					if (k === "_lajiFormId") return f;
					if (tree[k]) {
						f[k] = walk(_formData[k], tree[k]);
					} else {
						f[k] = _formData[k];
					}
					return f;
				}, {});
			} else if (tree && Array.isArray(_formData)) {
				return _formData.map(item => walk(item, tree));
			}
			return _formData;
		}

		return walk(formData, this.tmpIdTree);
	}

	onChange = ({formData}) => {
		this.onChangeTimestamp = Date.now();
		if (this.props.onChange) {
			const _formData = this.props.optimizeOnChange ? formData : this.removeLajiFormIds(formData);
			this.props.onChange(_formData);
		}
		this.setState({formData});
		this._context.formData = formData;
	}

	getRef = form => {
		this.formRef = form;
	}

	getBlockerRef = elem => {this.blockingLoaderRef = elem;}

	getPanelRef = elem => {this.shortcutHelpRef = elem;}

	getFormRef = () => this.formRef

	render() {
		if (this.state.error) return null;
		const {translations} = this.state;
		const {
			"ui:shortcuts": shortcuts,
			"ui:showShortcutsButton": showShortcutsButton = true,
			"ui:readonly": readonly,
			"ui:disabled": disabled
		} = this.props.uiSchema;

		return (
			<div className="laji-form">
				{showShortcutsButton && this.props.showShortcutButton !== false && shortcuts && (
					<TooltipComponent tooltip={this.getShorcutButtonTooltip()}>
						<Button bsStyle={undefined} onClick={this.toggleHelp}>{translations.Shortcuts}</Button>
					</TooltipComponent>
				)}
				<Form
					{...this.props}
					formData={this.state.formData}
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
					safeRenderCompletion={true}
				>
				<div>
					{this.props.children}
					{(!this.props.children && this.props.renderSubmit !== false) ?
							(<Button id="submit" type="submit" onClick={this._onDefaultSubmit} disabled={readonly || disabled}>
								{this.props.submitText || translations.Submit}
							</Button>) :
						null}
					</div>
			</Form>
			{shortcuts && 
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
			}
			<FailedBackgroundJobsPanel jobs={this.state.submitHooks}
			                           schema={this.props.schema}
			                           uiSchema={this.props.uiSchema}
			                           context={this._context}
			                           translations={translations}
			                           errorClickHandler={this.errorClickHandler}
			                           tmpIdTree={this.tmpIdTree}
			                           ref={this.bgJobRef}
			/>
			{this.renderSubmitHooks()}
		</div>
		);
	}

	renderSubmitHooks = () => {
		if (!this.state || !this.state.submitHooks) return;
		const jobsAmount = this.state.submitHooks.length;
		const  runningAmount = this.state.submitHooks.reduce((count, {running}) => running ? count + 1 : count, 0);
		if (!this.state.submitting) return null;

		return (
			<div className="running-jobs">
					{this.state.translations.PendingRunningJobs}... ({jobsAmount - runningAmount + 1} / {jobsAmount})
				<ProgressBar now={100 / jobsAmount * (jobsAmount - runningAmount)} />
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

		function splitLive(validators = {}, schema, live = {}, rest = {}) {
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

	onSubmit = (props) => {
		this.popBlockingLoader();
		if (this.propagateSubmit && this.props.onSubmit) {
			this.propagateSubmit && this.props.onSubmit && this.props.onSubmit({...props, formData: this.removeLajiFormIds(props.formData)});
		}
		this.propagateSubmit = true;
		this.validationSettings.ignoreWarnings = false;
	}

	onError = () => {
		this.popBlockingLoader();
		const errorListElem = findDOMNode(this._context.errorList);
		const wouldScrollTo = getScrollPositionForScrollIntoViewIfNeeded(errorListElem, this.props.topOffset, this.props.bottomOffset);
		const scrollAmount = wouldScrollTo - getWindowScrolled();

		if (!this._context.errorList.state.poppedTouched && scrollAmount !== 0) {
			this._context.errorList.expand();
		}
		this.propagateSubmit = true;
		this.validationSettings.ignoreWarnings = false;
		highlightElem(errorListElem);
	}

	_onDefaultSubmit = (e) => {
		e.preventDefault();
		this.submit();
	}

	submit = (propagate = true, ignoreWarnings = false) => {
		const {uiSchema} = this.props;
		if (uiSchema["ui:disabled"] || uiSchema["ui:readonly"]) {
			return false;
		}
		this.pushBlockingLoader();
		const {onChangeTimestamp} = this;
		this.setState({submitting: true, submitHooks: (this.state.submitHooks || []).map(hookItem => ({...hookItem, running: true}))});
		Promise.all((this.state.submitHooks || []).map(({hook}) => hook)).then(() => {
			this.setState({submitting: false});
			// RJSF onChange call happens after setState call, so we must wait for the onChange call. Not necessarily very robust?
			setTimeout(() => {
				if (onChangeTimestamp !== this.onChangeTimestamp) {
					if (this.submit(propagate, ignoreWarnings) !== false) {
						this.popBlockingLoader();
					}
					return;
				}
				this.validateAll = true;
				this.propagateSubmit = propagate;
				this.validationSettings.ignoreWarnings = ignoreWarnings;
				this.formRef.onSubmit({preventDefault: () => {}, persist: () => {}});
			}, 0);
		}).catch(() => {
			this.setState({submitting: false});
			this.popBlockingLoader();
			highlightElem(findDOMNode(this.bgJobRef.current));
		});
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
			return b.length - a.length;
		});

		const targets = this._context.keyHandlerTargets
			.filter(({handler}) => handler.conditions.every(condition => condition(e)))
			.map(({id}) => getKeyHandlerTargetId(id, this._context));
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
		if (this.mounted && this.blockingLoaderCounter === 1) {
			this.blockingLoaderRef.className = "laji-form blocking-loader entering";
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
				if (this.blockingLoaderCounter > 0) {
					this.blockingLoaderRef.className = "laji-form blocking-loader entering";
					return;
				}
				if (this.blockingLoaderRef) this.blockingLoaderRef.className = "laji-form blocking-loader leaving";
				this.setTimeout(() => {
					if (!this.blockingLoaderRef) {
						return;
					}
					if (this.blockingLoaderCounter > 0) {
						this.blockingLoaderRef.className = "laji-form blocking-loader entering";
					} else {
						this.blockingLoaderRef.className = "laji-form blocking-loader";
					}
				}, 200); // should match css transition time.
			});
		}
	}

	getSettings = (global = false) => {
		const settingSavers = global ? this.globalSettingSavers : this.settingSavers;
		return Object.keys(settingSavers).reduce((settings, key) => {
			try {
				return {...settings, [key]: settingSavers[key]()};
			} catch (e) {
				// Swallow failing settings parsing.
			} 
			return settings;
		}, this.props.settings || {});
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
