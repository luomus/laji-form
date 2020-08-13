import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import validate from "../validation";
import { transformErrors, initializeValidation } from "../validation";
import { Button, TooltipComponent, FailedBackgroundJobsPanel, Label } from "./components";
import { Panel, Table, ProgressBar } from "react-bootstrap";
import PanelHeading from "react-bootstrap/lib/PanelHeading";
import { focusNextInput, focusById, handleKeysWith, capitalizeFirstLetter, findNearestParentSchemaElemId, getKeyHandlerTargetId, stringifyKeyCombo, getSchemaElementById, scrollIntoViewIfNeeded, isObject, getScrollPositionForScrollIntoViewIfNeeded, getWindowScrolled, addLajiFormIds, highlightElem, constructTranslations } from "../utils";
import equals from "deep-equal";
import validateFormData from "@rjsf/core/dist/cjs/validate";
import { getDefaultFormState } from "@rjsf/core/dist/cjs/utils";
import merge from "deepmerge";

import Form from "@rjsf/core";
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
	"MapField",
	"GeocoderField",
	"TagArrayField",
	"StringToArrayField",
	"ConditionalOnChangeField",
	"ConditionalUiSchemaField",
	"AnnotationField",
	"PrefillingArrayField",
	"AnyToBooleanField",
	"EnumRangeArrayField",
	"UnitListShorthandArrayField",
	"LocationChooserField",
	"DataLeakerField",
	"LocalityField",
	"ImageDisplayField",
	"DescriptionField",
	"FakePropertyField",
	"SectionArrayField",
	"MultiArrayField",
	"AudioArrayField",
	"FilterArrayField",
	"MultiAnyToBooleanField",
	"UnitCountShorthandField",
	"ToggleAdditionalArrayFieldsField",
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
		schema: {},
		uiSchema: {}
	}

	constructor(props) {
		super(props);
		this.bgJobRef = React.createRef();
		this.translations = this.constructTranslations();
		this.apiClient = new ApiClient(props.apiClient, props.lang, this.translations);
		initializeValidation(this.apiClient);
		this._id = getNewId();

		this._context = new Context(this._id);
		this._context.formInstance = this;
		this._context.formData = props.formData;
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

		this.resetShortcuts((props.uiSchema || {})["ui:shortcuts"]);

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
			if (!this.customEventListeners[eventName][id]) this.customEventListeners[eventName][id] = [];
			this.customEventListeners[eventName][id].push(fn);
			//this.customEventListeners[eventName][id] = [fn, ...this.customEventListeners[eventName][id]];
		};
		this._context.removeCustomEventListener = (id, eventName, fn) => {
			this.customEventListeners[eventName][id] = this.customEventListeners[eventName][id].filter(_fn => _fn !== fn);
		};
		this._context.sendCustomEvent = (id, eventName, data, callback, {bubble = true} = {}) => {
			const ids = Object.keys(this.customEventListeners[eventName] || {}).filter(_id => id.startsWith(_id)).sort().reverse();

			outer: for (let _id of ids) {
				for (let listener of this.customEventListeners[eventName][_id]) {
					const result = listener(data, callback);
					if (!bubble) break outer;
					if (result === true || result === undefined) {
						return;
					}
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
					};
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
			lajiFormId = `${lajiFormId}`;
			let promise;
			const _hook = () => {
				promise = new Promise((resolve) => {
					let isRetry = false;
					const hooks = (this.state.submitHooks || []).map(hookItem => {
						if (hookItem.hook === _hook) {
							isRetry = true;
							return {...hookItem, running: true, promise};
						}
						return hookItem;
					});
					if (isRetry) {
						this.setState({submitHooks: hooks});
					}
					resolve(hook());
				}).then(() => {
					this._context.removeSubmitHook(lajiFormId, _hook);
				}).catch(e => {
					this.setState({submitHooks: this.state.submitHooks.map(hookItem => hookItem.hook === _hook ? {...hookItem, e, running: false, failed: true} : hookItem)});
					throw e;
				});
			};

			_hook();

			this.setState({submitHooks: [
				...(this.state.submitHooks || []),
				{hook: _hook, promise, lajiFormId, description, relativePointer, running: true}
			]});
			return _hook;
		};
		this._context.removeSubmitHook = (lajiFormId, hook) => {
			return new Promise(resolve => {
				lajiFormId = `${lajiFormId}`;
				this.setState({submitHooks: (this.state.submitHooks || []).filter(({hook: _hook, lajiFormId: _lajiFormId}) => (hook ? _hook !== hook : lajiFormId !== _lajiFormId))}, resolve);
			});
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
		if (props.staticImgPath) new Context().staticImgPath = props.staticImgPath;
		const translations = this.translations[props.lang];
		if (!this.tmpIdTree || props.schema !== this.props.schema) {
			this.setTmpIdTree(props.schema);
		}
		const state = {
			translations,
			formContext: {
				...this.props.formContext,
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
				Label: (props.fields || {}).Label || Label
			}
		};
		if (!this.state || props.formData && props.formData !== this.props.formData) {
			state.formData = this.addLajiFormIds(getDefaultFormState(props.schema, props.formData, undefined), this.tmpIdTree);
			this._context.formData = state.formData;
		} else {
			state.formData = this.formRef.state.formData;
		}
		if (this.state && props.schema !== this.props.schema) {
			state.extraErrors = {};
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

	componentDidUpdate(prevProps) {
		if ((prevProps.uiSchema || {})["ui:shortcuts"] !== (this.props.uiSchema || {})["ui:shortcuts"]) {
			this.resetShortcuts((this.props.uiSchema || {})["ui:shortcuts"]);
		}
	}

	resetShortcuts(shortcuts = {}) {
		this._context.keyHandleListeners = {};
		this._context.keyHandleIdFunctions = [];

		this.keyHandlers = this.getKeyHandlers(shortcuts);
		this._context.keyHandlers = this.keyHandlers;
		this._context.addKeyHandler("root", this.keyFunctions);
		this.keyHandlerTargets = Object.keys(this.keyHandlers).reduce((targets, keyCombo) => {
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

		this._context.shortcuts = shortcuts;
	}


	constructTranslations = () => {
		return constructTranslations(translations);
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
				}, {_hasId: true});
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
		this.setState({formData}, () => {
			if (this.props.onChange) {
				const _formData = this.props.optimizeOnChange ? formData : this.removeLajiFormIds(formData);
				this.props.onChange(_formData);
			}
			this._context.formData = formData;
			!this.validating && this.validate(!!"warnings", !"nonlive");
		});
	}

	getRef = form => {
		this.formRef = form;
	}

	getBlockerRef = elem => {this.blockingLoaderRef = elem;}

	getPanelRef = elem => {this.shortcutHelpRef = elem;}

	getFormRef = () => this.formRef

	getFields = (_fields) => ({...fields, ...(_fields || {})})
	getWidgets = (_widgets) => ({...widgets, ...(_widgets || {})})

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
				<FailedBackgroundJobsPanel jobs={this.state.submitHooks}
																	 schema={this.props.schema}
																	 uiSchema={this.props.uiSchema}
																	 context={this._context}
																	 formContext={this.state.formContext}
																	 errorClickHandler={this.errorClickHandler}
																	 tmpIdTree={this.tmpIdTree}
																	 ref={this.bgJobRef}
				/>
				<Form
					{...this.props}
					formData={this.state.formData}
					ref={this.getRef}
					onChange={this.onChange}
					onSubmit={this.onSubmit}
					fields={this.getFields(this.props.fields)}
					widgets={this.getWidgets(this.props.widgets)}
					FieldTemplate={FieldTemplate}
					ArrayFieldTemplate={ArrayFieldTemplate}
					ErrorList={ErrorListTemplate}
					formContext={this.state.formContext}
					noValidate={true}
					extraErrors={this.state.extraErrors}
					noHtml5Validate={true}
					liveValidate={true}
					autoComplete="off"
				>
				<div>
					{this.props.children}
					{(!this.props.children && this.props.renderSubmit !== false) ?
							(<Button id="submit" type="submit" disabled={readonly || disabled}>
								{this.props.submitText || translations.Submit}
							</Button>) :
						null}
					</div>
			</Form>
			{shortcuts &&
				<Panel 
					ref={this.getPanelRef} 
					className="shortcut-help laji-form-popped z-depth-3 hidden" 
					style={{top: (this.props.topOffset || 0) + 5, bottom: (this.props.bottomOffset || 0) + 5}}
					bsStyle="info" 
				>
					<PanelHeading>
						<h3>{translations.Shortcuts}<button type="button" className="close pull-right" onClick={this.dismissHelp}>×</button></h3>
					</PanelHeading>
						<Table>
							<tbody className="well">{
								Object.keys(shortcuts).map((keyCombo, idx) => {
									const {fn, targetLabel, label, ...rest} = shortcuts[keyCombo];
									if (["help", "textareaRowInsert", "autosuggestToggle"].includes(fn) || fn === "navigateSection" && rest.goOverRow) return;
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
			{this.renderSubmitHooks()}
		</div>
		);
	}

	renderSubmitHooks = () => {
		if (!this.state || !this.state.submitHooks) return;
		const jobsAmount = this.state.submitHooks.filter(({failed}) => !failed).length;
		const  runningAmount = this.state.submitHooks.reduce((count, {running}) => running ? count + 1 : count, 0);
		if (!this.state.runningSubmitHooks) return null;

		return (
			<div className="running-jobs">
					{this.state.translations.PendingRunningJobs}... ({jobsAmount - runningAmount + 1} / {jobsAmount})
				<ProgressBar now={100 / jobsAmount * (jobsAmount - runningAmount)} />
			</div>
		);
	}

	validateAndSubmit = (warnings = true) => {
		const {formData} = this.state;
		const {onSubmit, onValidationError} = this.props;
		return this.validate(warnings, true).then((valid) => {
			if (formData !== this.state.formData) {
				this.validateAndSubmit(warnings);
			} else if (valid) {
				onSubmit && onSubmit({formData: this.removeLajiFormIds(formData)});
			} else {
				onValidationError && onValidationError(this.state.extraErrors);
			}
		});

	}

	validate = (warnings = true, nonlive = true) => {
		this.validating = true;
		const {formData} = this.state;
		const {live: liveErrorValidators, rest: errorValidators} = splitLive(this.props.validators, this.props.schema.properties);
		const {live: liveWarningValidators, rest: warningValidators} = splitLive(this.props.warnings, this.props.schema.properties);
		const liveValidations = {errors: liveErrorValidators};
		const validations = {};
		if (nonlive) {
			validations.errors = errorValidators;
		}
		if (warnings) {
			liveValidations.warnings = liveWarningValidators;
			if (nonlive) {
				validations.warnings = warningValidators;
			}
		}
		const schemaErrors = nonlive
			? validateFormData(formData, this.props.schema, undefined, (e => transformErrors(this.state.translations, e))).errorSchema
			: {};
		nonlive && this.pushBlockingLoader();
		return new Promise(resolve =>
			Promise.all([validate(validations, formData), validate(liveValidations, formData)]).then(([_validations, _liveValidations]) => {
				if (nonlive) {
					this.cachedNonliveValidations = merge(schemaErrors, _validations);
					nonlive && this.popBlockingLoader();
				}
				const merged = merge(_liveValidations, !nonlive ? (this.cachedNonliveValidations || {}) : merge(_validations, schemaErrors));
				this.validating = false;
				resolve(!Object.keys(merged).length);
				!equals(this.state.extraErrors, merged) && this.setState({extraErrors: merged}, this.popErrorListIfNeeded);
			}).catch((e) => {
				nonlive && this.popBlockingLoader();
				throw e;
			})
		);

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

	onSubmit = () => {
		const {uiSchema} = this.props;
		if (uiSchema["ui:disabled"] || uiSchema["ui:readonly"]) {
			return false;
		}

		this.pushBlockingLoader();
		this.setState({runningSubmitHooks: true, submitHooks: (this.state.submitHooks || []).map(hookItem => ({...hookItem, running: true}))});
		Promise.all((this.state.submitHooks || []).map(({promise, hook}) => {
			const setNotRunning = () => {
				this.setState({submitHooks: (this.state.submitHooks || []).map(hookItem =>
					({...hookItem, running: hookItem.hook === hook ? false : hookItem.running}))
				});
			};
			return promise.then(setNotRunning).catch(setNotRunning);
		})).then(() => {
			this.popBlockingLoader();
			this.setState({runningSubmitHooks: false});
			this.validateAndSubmit();
		}).catch(() => {
			this.setState({runningSubmitHooks: false});
			this.popBlockingLoader();
			highlightElem(findDOMNode(this.bgJobRef.current));
		});
	}

	popErrorListIfNeeded = () => {
		let errorListElem;
		try {
			errorListElem = findDOMNode(this._context.errorList);
		} catch (e) {
			// Empty
		}
		if (!errorListElem) return;
		const wouldScrollTo = getScrollPositionForScrollIntoViewIfNeeded(errorListElem, this.props.topOffset, this.props.bottomOffset);
		const scrollAmount = wouldScrollTo - getWindowScrolled();

		if (!this._context.errorList.state.poppedTouched && scrollAmount !== 0) {
			this._context.errorList.expand();
		}
		highlightElem(errorListElem);
	}

	_onDefaultSubmit = (e) => {
		e.preventDefault();
		this.submit();
	}

	submit = () => {
		this.onSubmit();
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

		const currentId = findNearestParentSchemaElemId(this._id, e.target) || "";

		let order = Object.keys(this._context.keyHandleListeners).filter(id => {
			if (currentId.startsWith(id)) return true;
			return; 
		}).sort((a, b) => {
			return b.length - a.length;
		});

		const targets = this.keyHandlerTargets
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
