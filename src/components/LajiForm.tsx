import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import validate from "../validation";
import { transformErrors, initializeValidation } from "../validation";
import { Button, TooltipComponent, FailedBackgroundJobsPanel, Label } from "./components";
import { focusNextInput, focusById, handleKeysWith, capitalizeFirstLetter, findNearestParentSchemaElemId, getKeyHandlerTargetId, stringifyKeyCombo, getSchemaElementById, scrollIntoViewIfNeeded, getScrollPositionForScrollIntoViewIfNeeded, getWindowScrolled, addLajiFormIds, highlightElem, constructTranslations, removeLajiFormIds, createTmpIdTree } from "../utils";
const equals = require("deep-equal");
const validateFormData = require("@rjsf/core/dist/cjs/validate").default;
const { getDefaultFormState } = require("@rjsf/core/dist/cjs/utils");
import * as merge from "deepmerge";
import { JSONSchema7 } from "json-schema";
import { Theme } from "../themes/theme";
import Context from "../ReactContext";

import Form, { FieldProps as RJSFFieldProps, Field, Widget } from "@rjsf/core";
import ArrayFieldTemplate from "./ArrayFieldTemplate";
import FieldTemplate from "./FieldTemplate";
import ErrorListTemplate from "./ErrorListTemplate";

import ApiClient, { ApiClientImplementation } from "../ApiClient";
import InstanceContext from "../Context";
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
	"DefaultValueArrayField",
	"UiFieldApplierField",
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
	"UpperCaseWidget",
	"NumberWidget"
]);

function importLocalComponents(dir: string, fieldNames: (string | {[alias: string]: string})[]): {[name: string]: React.Component} {
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
	}, {} as any);
}

// Each form should have a unique id to keep Context private.
let id = 0;
function getNewId() {
	const _id = id;
	id++;
	return _id;
}

export interface LajiFormProps {
	apiClient?: ApiClientImplementation;
	lang?: Lang;
	formData?: any;
	schema?: any
	uiSchema?: any;
	topOffset?: number;
	bottomOffset?: number;
	staticImgPath?: string;
	formContext?: any;
	uiSchemaContext?: any;
	settings?: any;
	id?: string;
	googleApiKey?: string;
	notifier?: Notifier;
	fields?: {[name: string]: Field};
	widgets?: {[name: string]: Widget};
	autoFocus?: boolean
	componentDidMount?: () => void;
	onError?: (e: Error, i: React.ErrorInfo) => void;
	onChange?: (formData: any) => void;
	optimizeOnChange?: boolean;
	showShortcutButton?: boolean;
	renderSubmit?: boolean;
	submitText?: string;
	onSubmit?: (data: {formData: any}) => void;
	onValidationError?: (extraErrors: any) => void;
	validators?: any;
	warnings?: any;
	onSettingsChange?: (settings: any, global: boolean) => void;
	mediaMetadata: MediaMetadata,
	theme: Theme
}

export interface LajiFormState {
	submitHooks?: SubmitHook[];
	translations: ByLang;
	formContext: FormContext;
	formData?: any;
	extraErrors?: any;
	error?: boolean;
	runningSubmitHooks?: boolean;
}

export interface MediaMetadata {
	capturerVerbatim: string;
	intellectualOwner: string;
	intellectualRights: string;
}

export interface FormContext {
	translations: ByLang;
	lang: Lang;
	uiSchemaContext: any;
	settings: any;
	contextId: number;
	getFormRef: () => Form<any>
	topOffset: number;
	bottomOffset: number;
	formID: string;
	googleApiKey: string;
	reserveId: (id: string, sendId: (id: string) => void) => string | void;
	releaseId: (id: string, sendId: (id: string) => void) => void;
	notifier: Notifier;
	apiClient: ApiClient;
	Label: React.Component;
	formDataTransformers?: any[];
	_parentLajiFormId?: number;
	mediaMetadata?: MediaMetadata;
}

export type Lang = "fi" | "en" | "sv";

type FocusHandler = () => Promise<void> | void;
type CustomEventListener = (data?: any, callback?: () => void) => boolean | void;

interface SubmitHook {
	hook: () => void;
	promise: Promise<any>;
	lajiFormId: string;
	relativePointer: string;
	running: boolean;
	description?: string;
	failed?: boolean;
}

interface ShortcutKey {
	fn: string;
	target?: string;
	[param: string]: any;
}

export interface FieldProps extends RJSFFieldProps {
	formContext: FormContext;
	registry: {
            fields: { [name: string]: Field }; 
            widgets: { [name: string]: Widget };
            definitions: { [name: string]: any };
            formContext: FormContext;
	}
}

type ShortcutKeys = Record<string, ShortcutKey>;

export interface InternalKeyHandler extends ShortcutKey {
	conditions: ((e: KeyboardEvent) => boolean)[];
}
type InternalKeyHandlers = InternalKeyHandler[];
type InternalKeyHandlerTargets = {id: string, handler: InternalKeyHandler}[];

export type KeyFunctions = {[fnName: string]: (e: KeyboardEvent, options: any) => boolean | void}

type KeyHandleListener = (e: KeyboardEvent) => boolean | undefined;

type NotifyMessager = (msg: string) => void;
interface Notifier {
	success: NotifyMessager;
	info: NotifyMessager;
	warning: NotifyMessager;
	error: NotifyMessager;
}

export type TranslateFn = (...args: any[]) => string;
export type ByLang = {[key: string]: string | TranslateFn};
export type Translations = Record<Lang, ByLang>;

export interface RootContext {
	formInstance: LajiForm;
	formData: any;
	blockingLoaderCounter: number;
	pushBlockingLoader: () => void; 
	popBlockingLoader: () => void;
	keyHandleListeners: {[id: string]: KeyHandleListener[]};
	keyHandleIdFunctions: {id: string, keyFunctions:  KeyFunctions, handleKey: KeyHandleListener}[];
	addKeyHandler: (id: string, keyFunctions: KeyFunctions, additionalParams?: any) => void;
	removeKeyHandler: (id: string, keyFunctions: KeyFunctions) => void;
	addSettingSaver: (key: string, fn: () => void, global?: boolean) => void;
	removeSettingSaver: (key: string, global?: boolean) => void;
	onSettingsChange: (global?: boolean) => void;
	addFocusHandler: (id: string, fn: FocusHandler) => void;
	removeFocusHandler: (id: string, fn: FocusHandler) => void;
	setImmediate: (fn: () => void) => void;
	setTimeout: (fn: () => void, timer: number) => void;
	addEventListener: (target: typeof document | typeof window, name: string, fn: (e: Event) => void) => void;
	addCustomEventListener: (id: string, eventName: string, fn: CustomEventListener) => void;
	removeCustomEventListener: (id: string, eventName: string, fn: CustomEventListener) => void;
	sendCustomEvent: (id: string, eventName: string, data?: any, callback?: () => void, options?: {bubble?: boolean}) => void;
	addGlobalEventHandler: (name: string, fn: React.EventHandler<any>) => void;
	removeGlobalEventHandler: (name: string, fn: React.EventHandler<any>) => void;
	addSubmitHook: (lajiFormId: string, relativePointer: string, hook: () => void, description?: string) => void;
	removeSubmitHook: (lajiFormId: string, hook: SubmitHook["hook"]) => void;
	removeAllSubmitHook: () => void;
	singletonMap: any;
	keyHandlers: InternalKeyHandlers;
	shortcuts: ShortcutKeys;
	errorList: ErrorListTemplate
	keyTimeouts: number[];
	[prop: string]: any;
}

interface GlobalContext {
	staticImgPath: string;
}

export default class LajiForm extends React.Component<LajiFormProps, LajiFormState> {
	static contextType = Context;

	translations = this.constructTranslations();
	bgJobRef = React.createRef<FailedBackgroundJobsPanel>();
	shortcutHelpRef = React.createRef<any>();
	apiClient: ApiClient;
	_id: number;
	_context: RootContext;
	propagateSubmit = true;
	blockingLoaderCounter = 0;
	settingSavers: {[key: string]: () => void} = {};
	globalSettingSavers: {[key: string]: () => void} = {} as any;
	errorClickHandler = (id: string) => {
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
			const input = document.querySelector(`#${id}`) as HTMLInputElement;

			if (elem) scrollIntoViewIfNeeded(elem, this.props.topOffset, this.props.bottomOffset);
			if (input && input.focus) input.focus();

			if (!elem) return;

			highlightElem(elem);
		});
	};
	focusHandlers: {[id: string]: FocusHandler[]} = {};
	customEventListeners: {[eventName: string]: {[id: string]: CustomEventListener[]}} = {};
	_globalEventsRootHandler: {[eventName: string]: React.EventHandler<any>} = {};
	_globalEventHandlers: {[name: string]: React.EventHandler<any>[]} = {};
	ids: {[id: string]: ((id: string) => void)[]} = {};
	// First call returns id, next call (and only the very next) reserves the id until it is released.
	reserveId = (id: string, sendId: (id: string) => void): string | void => {
		if (this.ids[id] && this.ids[id].length) {
			this.ids[id].push(sendId);
		} else {
			this.ids[id] = [sendId]; // Just mark that the id is now used. It isn't reserved yet.
			return id;
		}
	};
	releaseId = (id: string, sendId: (id: string) => void) => {
		if (this.ids[id]) {
			const idx = this.ids[id].indexOf(sendId);
			this.ids[id].splice(idx, 1);
			if (this.ids[id].length > 0) {
				this.ids[id][0](id);
			}
		}
	};
	tmpIdTree: any;
	formRef: Form<any>;
	mounted: boolean;
	blockingLoaderRef: HTMLDivElement;
	keyHandlers: InternalKeyHandlers;
	keyHandlerTargets: InternalKeyHandlerTargets;
	keyCombo: string;
	defaultNotifier: Notifier;
	validating = false;
	cachedNonliveValidations: any;
	helpVisible: boolean;
	helpTimeout: number;
	helpStarted: boolean;
	eventListeners: [typeof document | typeof window, string, (e: Event) => void][] = [];
	timeouts: number[] = [];
	immediates: number[] = [];


	static propTypes = {
		uiSchemaContext: PropTypes.object,
		settings: PropTypes.object,
		validators: PropTypes.object,
		warnings: PropTypes.object,
	}

	static defaultProps = {
		lang: "en" as Lang,
		schema: {},
		uiSchema: {}
	}

	constructor(props: LajiFormProps) {
		super(props);
		if ( props.apiClient) {
			this.apiClient = new ApiClient(props.apiClient, props.lang, this.translations);
		}
		initializeValidation(this.apiClient);
		this._id = getNewId();

		this._context = new InstanceContext(this._id) as RootContext;
		this._context.formInstance = this;
		this._context.formData = props.formData;

		this._context.blockingLoaderCounter = this.blockingLoaderCounter;
		this._context.pushBlockingLoader = this.pushBlockingLoader;
		this._context.popBlockingLoader = this.popBlockingLoader;

		this._context.keyHandleListeners = {};
		this._context.keyHandleIdFunctions = [];
		this._context.addKeyHandler = (id: string, keyFunctions: KeyFunctions, additionalParams?: any) => {
			if (!this._context.keyHandleListeners[id]) this._context.keyHandleListeners[id] = [];
			const handleKey: KeyHandleListener = (e) => handleKeysWith(this._context, id, keyFunctions, e, additionalParams);
			this._context.keyHandleIdFunctions.push({id, keyFunctions, handleKey});
			this._context.keyHandleListeners[id].push(handleKey);
		};

		this._context.removeKeyHandler = (_id: string, _keyFunctions: {[fnName: string]: () => boolean | void}) => {
			this._context.keyHandleIdFunctions.forEach((idFunction, i) => {
				const {id, keyFunctions, handleKey} = idFunction;
				if (id === _id && _keyFunctions === keyFunctions) {
					this._context.keyHandleIdFunctions.splice(i, 1);
					this._context.keyHandleListeners[id] = this._context.keyHandleListeners[id].filter((_handleKey: any) =>
						_handleKey !== handleKey
					);
				}
			});
		};

		this.resetShortcuts((props.uiSchema || {})["ui:shortcuts"]);

		this._context.addSettingSaver = (key: string, fn: () => void, global = false) => {
			const settingSavers = global ? this.globalSettingSavers : this.settingSavers;
			settingSavers[key] = fn;
		};
		this._context.removeSettingSaver = (key: string, global = false) => {
			const settingSavers = global ? this.globalSettingSavers : this.settingSavers;
			delete settingSavers[key];
		};
		this._context.onSettingsChange = this.onSettingsChange;

		this._context.addFocusHandler = (id: string, fn: FocusHandler) => {
			if (!this.focusHandlers[id]) this.focusHandlers[id] = [];
			this.focusHandlers[id].push(fn);
		};
		this._context.removeFocusHandler = (id: string, fn: FocusHandler) => {
			if (!this.focusHandlers[id]) {
				console.warn(`laji-form warning: removing focus handler that isn't registered for id ${id}.`);
				return;
			}
			this.focusHandlers[id] = this.focusHandlers[id].filter(_fn => fn !== _fn);
		};

		this._context.setImmediate = this.setImmediate;
		this._context.setTimeout = this.setTimeout;
		this._context.addEventListener = this.addEventListener;

		this._context.addCustomEventListener = (id: string, eventName: string, fn: CustomEventListener) => {
			if (!this.customEventListeners[eventName]) this.customEventListeners[eventName] = {};
			if (!this.customEventListeners[eventName][id]) this.customEventListeners[eventName][id] = [];
			this.customEventListeners[eventName][id].push(fn);
			//this.customEventListeners[eventName][id] = [fn, ...this.customEventListeners[eventName][id]];
		};
		this._context.removeCustomEventListener = (id: string, eventName: string, fn: CustomEventListener) => {
			this.customEventListeners[eventName][id] = this.customEventListeners[eventName][id].filter(_fn => _fn !== fn);
		};
		this._context.sendCustomEvent = (id: string, eventName: string, data?: any, callback?: () => void, {bubble = true} = {}) => {
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

		this._context.addGlobalEventHandler = (name: string, fn: React.EventHandler<any>) => {
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
						return false;
					});
				};
				document.addEventListener(name, this._globalEventsRootHandler[name]);
				this._globalEventHandlers[name] = [];
			}
			this._globalEventHandlers[name].push(fn);
		};
		this._context.removeGlobalEventHandler = (name: string, fn: React.EventHandler<any>) => {
			this._globalEventHandlers[name] = this._globalEventHandlers[name].filter(_fn => _fn !== fn);
			if (this._globalEventHandlers[name].length === 0) {
				delete this._globalEventHandlers[name];
				document.removeEventListener(name, this._globalEventsRootHandler[name]);
			}
		};

		this._context.addSubmitHook = (lajiFormId: string, relativePointer: string, hook: () => void, description?: string) => {
			lajiFormId = `${lajiFormId}`;
			let promise: Promise<any>;
			const _hook = (): Promise<any> => {
				return new Promise((resolve) => {
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
					this.setState({submitHooks: this.state.submitHooks?.map(hookItem => hookItem.hook === _hook ? {...hookItem, e, running: false, failed: true} : hookItem)});
				});
			};

			promise = _hook();

			this.setState({submitHooks: [
				...(this.state.submitHooks || []),
				{hook: _hook, promise, lajiFormId, description, relativePointer, running: true}
			]});
			return _hook;
		};
		this._context.removeSubmitHook = (lajiFormId: string, hook: SubmitHook["hook"]) => {
			return new Promise<void>(resolve => {
				lajiFormId = `${lajiFormId}`;
				const newHooks = (this.state.submitHooks || []).filter(({hook: _hook, lajiFormId: _lajiFormId}) => (hook ? _hook !== hook : lajiFormId !== _lajiFormId));
				newHooks.length !== (this.state.submitHooks || []).length ? this.setState({submitHooks: newHooks}, resolve) : resolve();
			});
		};
		this._context.removeAllSubmitHook = () => {
			this.setState({submitHooks: []});
		};

		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props: LajiFormProps) {
		if ( props.apiClient && props.apiClient !== this.apiClient) {
			this.apiClient = new ApiClient(props.apiClient, props.lang, this.translations);
		}
		if (this.apiClient && "lang" in props && this.props.lang !== props.lang) {
			this.apiClient.setLang(props.lang as Lang);
		}
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props: LajiFormProps) {
		if (props.staticImgPath) (new InstanceContext() as GlobalContext).staticImgPath = props.staticImgPath;
		const translations = this.translations[props.lang as Lang];
		if (!this.tmpIdTree || props.schema !== this.props.schema) {
			this.setTmpIdTree(props.schema);
		}
		const state: LajiFormState = {
			translations,
			formContext: {
				...this.props.formContext,
				translations,
				lang: props.lang,
				uiSchemaContext: props.uiSchemaContext,
				settings: JSON.parse(JSON.stringify((
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
				Label: (props.fields || {}).Label || Label,
				mediaMetadata: props.mediaMetadata,
			}
		};
		if (((!this.state && props.schema && Object.keys(props.schema).length) || (this.state && !("formData" in this.state))) || ("formData" in props && props.formData !== this.props.formData)) {
			state.formData = this.addLajiFormIds(getDefaultFormState(props.schema, props.formData, undefined));
			this._context.formData = state.formData;
		} else if (this.state) {
			state.formData = (this.formRef as any)?.state.formData;
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

	componentDidCatch(e: Error, i: React.ErrorInfo) {
		this.setState({error: true});
		if (this.props.onError) {
			this.props.onError(e, i);
		}
	}

	componentDidUpdate(prevProps: LajiFormProps) {
		if ((prevProps.uiSchema || {})["ui:shortcuts"] !== (this.props.uiSchema || {})["ui:shortcuts"]) {
			this.resetShortcuts((this.props.uiSchema || {})["ui:shortcuts"]);
		}
	}

	resetShortcuts(shortcuts: ShortcutKeys = {}) {
		this._context.keyHandleListeners = {};
		this._context.keyHandleIdFunctions = [];

		this.keyHandlers = this.getKeyHandlers(shortcuts);
		this._context.keyHandlers = this.keyHandlers;
		this._context.addKeyHandler("root", this.keyFunctions);
		this.keyHandlerTargets = this.keyHandlers.reduce((targets, handler) => {
			if (typeof handler.target === "string") targets.push({id: handler.target, handler});
			return targets;
		}, [] as InternalKeyHandlerTargets);

		Object.keys(shortcuts).some(keyCombo => {
			if (shortcuts[keyCombo].fn == "help") {
				this.keyCombo = keyCombo;
				return true;
			}
			return false;
		});

		this._context.shortcuts = shortcuts;
	}


	constructTranslations(): Translations {
		return constructTranslations(translations) as Translations;
	}

	getDefaultNotifier = () => {
		if (this.defaultNotifier) return this.defaultNotifier;
		this.defaultNotifier = (["success", "info", "warning", "error"] as Array<keyof Notifier>).reduce((notifier, method) => {
			notifier[method] = msg => console.warn(`Notification component not specified for LajiForm! Got '${method}'notification: '${msg}'`);
			return notifier;
		}, {} as Notifier);
		return this.defaultNotifier;
	}

	setTmpIdTree = (schema: JSONSchema7) => {
		this.tmpIdTree = createTmpIdTree(schema);
	}

	addLajiFormIds = (formData: any) => {
		return addLajiFormIds(formData, this.tmpIdTree)[0];
	}

	removeLajiFormIds = (formData: any) => {
		return removeLajiFormIds(formData, this.tmpIdTree);
	}

	onChange = ({formData}: {formData: any}) => {
		this.setState({formData}, () => {
			if (this.props.onChange) {
				const _formData = this.props.optimizeOnChange ? formData : this.removeLajiFormIds(formData);
				this.props.onChange(_formData);
			}
			this._context.formData = formData;
			!this.validating && this.validate(!!"warnings", !"nonlive");
		});
	}

	getRef = (form: Form<any>) => {
		this.formRef = form;
	}

	getFormRef = () => this.formRef

	getFields = (_fields?: {[name: string]: Field}) => ({...fields, ...(_fields || {})})
	getWidgets = (_widgets?: {[name: string]: Widget}) => ({...widgets, ...(_widgets || {})})

	render() {
		if (this.state.error) return null;
		const {translations} = this.state;
		const {
			"ui:shortcuts": shortcuts,
			"ui:showShortcutsButton": showShortcutsButton = true,
			"ui:readonly": readonly,
			"ui:disabled": disabled
		} = this.props.uiSchema;

		const {Panel: _Panel, Table} = this.props.theme || this.context.theme;
		const Panel = _Panel as any;

		const panelHeader = (
			<h3>{translations.Shortcuts}<button type="button" className="close pull-right" onClick={this.dismissHelp}>×</button></h3>
		);
		return (
			<Context.Provider value={this.props.theme ? {theme: this.props.theme} : this.context}>
				<div className="laji-form">
					{showShortcutsButton && this.props.showShortcutButton !== false && shortcuts && (
						<TooltipComponent tooltip={this.getShorcutButtonTooltip()}>
							<Button variant={undefined} onClick={this.toggleHelp}>{translations.Shortcuts}</Button>
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
						{...this.props as any}
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
							{(!this.props.children && this.props.renderSubmit !== false) ? (
								<Button id="submit" onClick={this.submit} disabled={readonly || disabled}>
									{this.props.submitText || translations.Submit}
								</Button>
							) : null}
						</div>
					</Form>
					{shortcuts &&
						<Panel ref={this.shortcutHelpRef}
						       className="shortcut-help laji-form-popped z-depth-3 hidden"
						       style={{top: (this.props.topOffset || 0) + 5, bottom: (this.props.bottomOffset || 0) + 5}}
						       variant="info">
							<Panel.Heading>{panelHeader}</Panel.Heading>
							<Table>
								<tbody className="well">{
									Object.keys(shortcuts).map((keyCombo, idx) => {
										const {fn, targetLabel, label, ...rest} = shortcuts[keyCombo];
										if (["help", "textareaRowInsert", "autosuggestToggle"].includes(fn) || fn === "navigateSection" && rest.goOverRow) return;
										let translation = "";
										if (translation) translation = label;
										else translation = translations[[fn, ...Object.keys(rest)].map(capitalizeFirstLetter).join("")] as string;
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
			</Context.Provider>
		);
	}

	renderSubmitHooks = () => {
		if (!this.state || !this.state.submitHooks) return;
		const jobsAmount = this.state.submitHooks.filter(({failed}) => !failed).length;
		const  runningAmount = this.state.submitHooks.reduce((count, {running}) => running ? count + 1 : count, 0);
		if (!this.state.runningSubmitHooks) return null;

		const { ProgressBar } = this.props.theme || this.context.theme;
		return (
			<div className="running-jobs">
				{this.state.translations.PendingRunningJobs}... ({jobsAmount - runningAmount + 1} / {jobsAmount})
				<ProgressBar now={100 / jobsAmount * (jobsAmount - runningAmount)} />
			</div>
		);
	}

	validateAndSubmit = (warnings = true, onlySchema = false) => {
		const {formData} = this.state;
		const {onValidationError, onSubmit} = this.props;
		return this.validate(warnings, true, onlySchema).then((valid) => {
			if (formData !== this.state.formData) {
				this.validateAndSubmit(warnings, onlySchema);
			} else if (valid) {
				onSubmit && onSubmit({formData: this.removeLajiFormIds(formData)});
			} else {
				onValidationError && onValidationError(this.state.extraErrors);
			}
		});

	}

	validate = (warnings = true, nonlive = true, onlySchema = false) => {
		this.validating = true;

		let live = true;
		if (onlySchema) {
			warnings = false;
			nonlive = false;
			live = false;
		}

		const block = nonlive || onlySchema;
		
		const {formData} = this.state;
		const {live: liveErrorValidators, rest: errorValidators} = splitLive(this.props.validators, this.props.schema.properties);
		const {live: liveWarningValidators, rest: warningValidators} = splitLive(this.props.warnings, this.props.schema.properties);
		let liveValidations = {errors: liveErrorValidators} as {errors: any, warnings: any};
		const validations = {} as {errors: any, warnings: any};
		if (!onlySchema && nonlive) {
			validations.errors = errorValidators;
		}
		if (!onlySchema && warnings) {
			liveValidations.warnings = liveWarningValidators;
			if (nonlive) {
				validations.warnings = warningValidators;
			}
		}
		if (!live) {
			liveValidations = {} as {errors: any, warnings: any};
		}
		const schemaErrors = nonlive || onlySchema
			? validateFormData(formData, this.props.schema, undefined, ((e: any) => transformErrors(this.state.translations, e))).errorSchema
			: {};
		block && this.pushBlockingLoader();
		return new Promise(resolve =>
			Promise.all([validate(validations, formData), validate(liveValidations, formData)]).then(([_validations, _liveValidations]) => {
				if (nonlive || onlySchema) {
					this.cachedNonliveValidations = merge(schemaErrors, _validations);
					block && this.popBlockingLoader();
				}
				const merged = merge(_liveValidations, !nonlive
					? (this.cachedNonliveValidations || {})
					: merge(_validations, schemaErrors)
				) as any;
				this.validating = false;
				resolve(!Object.keys(merged).length);
				!equals(this.state.extraErrors, merged) && this.setState({extraErrors: merged}, this.popErrorListIfNeeded);
			}).catch((e) => {
				block && this.popBlockingLoader();

				throw e;
			})
		);

		function splitLive(validators: any = {}, schema: any, live: any = {}, rest: any = {}) {
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

	onSubmit = (onlySchemaValidations?: "onlySchemaValidations"): false | undefined => {
		const _onlySchemaValidations = onlySchemaValidations === "onlySchemaValidations";

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
			this.validateAndSubmit(!_onlySchemaValidations, _onlySchemaValidations);
		}).catch(() => {
			this.setState({runningSubmitHooks: false});
			this.popBlockingLoader();
			highlightElem(findDOMNode(this.bgJobRef?.current) as Element);
		});
		return undefined;
	}

	popErrorListIfNeeded = () => {
		let errorListElem;
		try {
			errorListElem = findDOMNode(this._context.errorList) as Element;
		} catch (e) {
			// Empty
		}
		if (!errorListElem) return;
		const wouldScrollTo = getScrollPositionForScrollIntoViewIfNeeded(errorListElem, this.props.topOffset, this.props.bottomOffset) || 0;
		const scrollAmount = wouldScrollTo - getWindowScrolled();

		if (!this._context.errorList.state.poppedTouched && scrollAmount !== 0) {
			this._context.errorList.expand();
		}
		highlightElem(errorListElem);
	}

	_onDefaultSubmit = (e: React.SyntheticEvent) => {
		e.preventDefault();
		this.submit();
	}

	submit = () => {
		this.onSubmit();
	}

	submitOnlySchemaValidations = () => {
		this.onSubmit("onlySchemaValidations");
	}

	getShorcutButtonTooltip = () => {
		const {translations} = this.state.formContext;
		if (this.keyCombo) {
			return (translations.ShortcutHelp as TranslateFn)(stringifyKeyCombo(this.keyCombo));
		}
		return undefined;
	}

	toggleHelp = (e: React.MouseEvent) => {
		this.helpVisible ? this.dismissHelp(e) : this.showHelp();
	}

	showHelp = () => {
		const node = findDOMNode(this.shortcutHelpRef.current) as Element;
		if (!this.helpVisible) {
			if (node) node.className = node.className.replace(" hidden", "");
			this.helpVisible = true;
		}
	}

	dismissHelp = (e: Event | React.SyntheticEvent) => {
		const node = findDOMNode(this.shortcutHelpRef.current) as Element;
		e.preventDefault();
		e.stopPropagation();
		if (this.helpVisible && node) {
			node.className += " hidden";
		}
		this.helpVisible = false;
		this.helpStarted = false;
		document.removeEventListener("keyup", this.dismissHelp);
		window.removeEventListener("blur", this.dismissHelp);
		clearTimeout(this.helpTimeout);
	}

	keyFunctions = {
		navigate: (e: KeyboardEvent, {reverse}: any) => {
			return focusNextInput(this.formRef, e.target as HTMLElement, reverse);
		},
		help: (e: KeyboardEvent, {delay}: any) => {
			if (this.helpStarted) return false;

			this.helpStarted = true;

			this.helpTimeout = window.setTimeout(() => {
				this.showHelp();
			}, delay * 1000);
			this.addEventListener(document, "keyup", this.dismissHelp);
			this.addEventListener(window, "blur", this.dismissHelp);
			return false;
		},

		revalidate: () => {
			this.submit();
		}
	}

	getKeyHandlers = (shortcuts: ShortcutKeys = {}): InternalKeyHandlers => {
		return Object.keys(shortcuts).reduce((list, keyCombo) => {
			const shortcut = shortcuts[keyCombo];
			const specials: any = {
				alt: false,
				ctrl: false,
				shift: false,
			};

			list.push(keyCombo.split("+").reduce((keyHandler, key) => {
				if (key in specials) {
					(specials as any)[key] = true;
				}

				keyHandler.conditions.push(e =>
					e.key === key || (key in specials && ((specials[key] && (e as any)[`${key}Key`]) || (!specials[key] && !(e as any)[`${key}Key`])))
				);

				return keyHandler;
			}, {...shortcut, conditions: []} as InternalKeyHandler));

			for (let special in specials) {
				if (!(specials as any)[special]) list[list.length - 1].conditions.push(e => {
					return !(e as any)[`${special}Key`];
				});
			}

			return list;
		}, [] as InternalKeyHandlers);
	}

	onKeyDown = (e: KeyboardEvent) => {
		if (this._context.keyTimeouts) {
			this._context.keyTimeouts.forEach(timeout => clearTimeout(timeout));
		}
		this._context.keyTimeouts = [];

		const currentId = findNearestParentSchemaElemId(this._id, e.target as HTMLElement) || "";

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

		order.some(id => this._context.keyHandleListeners[id]?.some((keyHandleListener: KeyHandleListener) => keyHandleListener(e)));
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
			setTimeout(() => {
				this.setState({formContext: {...this.state.formContext, settings: JSON.parse(JSON.stringify(settings))}});
			});
			if (this.props.onSettingsChange) this.props.onSettingsChange(settings, global);
		}
	}

	addEventListener = (target: typeof document | typeof window, name: string, fn: (e: Event) => void) => {
		target.addEventListener(name, fn);
		this.eventListeners.push([target, name ,fn]);
	}

	setTimeout = (fn: () => void, time: number) => {
		const timeout = window.setTimeout(fn, time);
		this.timeouts.push(timeout);
		return timeout;
	}

	setImmediate = (fn: () => void) => {
		this.immediates.push(setTimeout(fn));
	}

	destroy = () => {
		if (this.eventListeners) this.eventListeners.forEach(([target, name, fn]) => {
			target.removeEventListener(name, fn);
		});
		if (this.timeouts) this.timeouts.forEach((timeout) => {
			clearTimeout(timeout);
		});
		if (this.immediates) this.immediates.forEach((immediate) => {
			clearTimeout(immediate);
		});
		this.eventListeners = [];
	}
}
