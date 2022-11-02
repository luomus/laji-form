import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import validate from "../validation";
import { transformErrors, initializeValidation } from "../validation";
import { Button, TooltipComponent, FailedBackgroundJobsPanel, Label } from "./components";
import { focusNextInput, capitalizeFirstLetter, stringifyKeyCombo, getScrollPositionForScrollIntoViewIfNeeded, getWindowScrolled, addLajiFormIds, highlightElem, constructTranslations, removeLajiFormIds, createTmpIdTree, translate, getDefaultFormState, ReactUtils, ReactUtilsType } from "../utils";
const equals = require("deep-equal");
import rjsfValidator from "@rjsf/validator-ajv6";
import * as merge from "deepmerge";
import { HasMaybeChildren, Theme } from "../themes/theme";
import Context, { ContextProps } from "../ReactContext";
import StubTheme from "../themes/stub";
import Form from "@rjsf/core";
import { FieldProps as RJSFFieldProps, WidgetProps as RJSFWidgetProps, Field, Widget, RJSFSchema, TemplatesType } from "@rjsf/utils";
import ErrorListTemplate from "./templates/ErrorListTemplate";
import ApiClient, { ApiClientImplementation } from "../ApiClient";
import InstanceContext from "../Context";
import * as translations from "../translations.json";
import KeyHandlerService, { ShortcutKeys } from "../services/key-handler-service";
import SettingsService, { Settings } from "../services/settings-service";
import FocusService from "../services/focus-service";

const fields = importLocalComponents<Field>("fields", [
	"SchemaField",
	{"ArraySchemaField": "SchemaField"},
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

const widgets = importLocalComponents<Widget>("widgets", [
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

const templates = importLocalComponents<TemplatesType>("templates", [
	"BaseInputTemplate",
	"DescriptionField",
	{"TitleFieldTemplate": "TitleField"},
	{"DescriptionFieldTemplate": "DescriptionField"},
	"FieldTemplate",
	"ArrayFieldTemplate",
	"ErrorListTemplate",
	"ObjectFieldTemplate"
]);

function importLocalComponents<T>(dir: string, fieldNames: (string | {[alias: string]: string})[]): {[name: string]: T} {
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

export interface LajiFormProps extends HasMaybeChildren {
	apiClient?: ApiClientImplementation;
	lang?: Lang;
	formData?: any;
	schema?: any
	uiSchema?: any;
	topOffset?: number;
	bottomOffset?: number;
	formContext?: any;
	uiSchemaContext?: any;
	settings?: any;
	id?: string;
	googleApiKey?: string;
	notifier?: Notifier;
	fields?: {[name: string]: Field};
	widgets?: {[name: string]: Widget};
	templates?: {[name: string]: TemplatesType};
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
	mediaMetadata?: MediaMetadata;
	theme?: Theme;
	lajiGeoServerAddress?: string;
}

export interface LajiFormState {
	submitHooks?: SubmitHook[];
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
	contextId: number;
	theme: Theme;
	setTimeout: (fn: () => void, time: number) => void;
	utils: ReactUtilsType;
	services: {
		keyHandlerService: KeyHandlerService,
		settingsService: SettingsService,
		focusService: FocusService
	}
}

export type Lang = "fi" | "en" | "sv";

type CustomEventListener = (data?: any, callback?: () => void) => boolean | void;

export interface SubmitHook {
	hook: () => void;
	promise: Promise<any>;
	lajiFormId: string;
	relativePointer: string | undefined;
	running: boolean;
	description?: string;
	failed?: boolean;
}

export interface FieldProps extends RJSFFieldProps<any, FormContext> {
	uiSchema: any;
	errorSchema: any;
	formContext: FormContext;
}

export interface WidgetProps extends RJSFWidgetProps<any, FormContext> {
	uiSchema: any;
	errorSchema: any;
	formContext: FormContext;
}

export type NotifyMessager = (msg: string) => void;
export interface Notifier {
	success: NotifyMessager;
	info: NotifyMessager;
	warning: NotifyMessager;
	error: NotifyMessager;
}

export type ByLang = {[key: string]: string};
export type Translations = Record<Lang, ByLang>;

export interface RootContext {
	formInstance: LajiForm;
	formData: any;
	blockingLoaderCounter: number;
	pushBlockingLoader: () => void; 
	popBlockingLoader: () => void;
	setTimeout: (fn: () => void, timer: number) => void;
	addEventListener: (target: typeof document | typeof window, name: string, fn: (e: Event) => void) => void;
	addCustomEventListener: (id: string, eventName: string, fn: CustomEventListener) => void;
	removeCustomEventListener: (id: string, eventName: string, fn: CustomEventListener) => void;
	sendCustomEvent: (id: string, eventName: string, data?: any, callback?: () => void, options?: {bubble?: boolean}) => void;
	removeGlobalEventHandler: (name: string, fn: React.EventHandler<any>) => void;
	addSubmitHook: (lajiFormId: string, relativePointer: string | undefined, hook: () => void, description?: string) => void;
	removeSubmitHook: (lajiFormId: string, hook: SubmitHook["hook"]) => void;
	removeAllSubmitHook: () => void;
	singletonMap: any;
	errorList: ErrorListTemplate
	[prop: string]: any;
}

export default class LajiForm extends React.Component<LajiFormProps, LajiFormState> {
	static contextType = Context;
	contextMemoizeKey: Record<keyof LajiFormProps, any>;
	contextFormMemoizeKey: Record<keyof LajiFormProps, any>;
	memoizedContext: ContextProps;
	memoizedFormContext: FormContext;

	translations = this.constructTranslations();
	bgJobRef = React.createRef<FailedBackgroundJobsPanel>();
	shortcutHelpRef = React.createRef<any>();
	apiClient: ApiClient;
	_id: number;
	_context: RootContext;
	propagateSubmit = true;
	blockingLoaderCounter = 0;
	customEventListeners: {[eventName: string]: {[id: string]: CustomEventListener[]}} = {};
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
	keyCombo: string;
	defaultNotifier: Notifier;
	validating = false;
	cachedNonliveValidations: any;
	helpVisible: boolean;
	helpTimeout: number;
	helpStarted: boolean;
	eventListeners: [typeof document | typeof window, string, (e: Event) => void][] = [];
	timeouts: number[] = [];
	keyHandlerService: KeyHandlerService

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
		if (props.lajiGeoServerAddress) {
			this._context.lajiGeoServerAddress = props.lajiGeoServerAddress;
		}

		this._context.blockingLoaderCounter = this.blockingLoaderCounter;
		this._context.pushBlockingLoader = this.pushBlockingLoader;
		this._context.popBlockingLoader = this.popBlockingLoader;

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

		this._context.addSubmitHook = (lajiFormId: string, relativePointer: string | undefined, hook: () => void, description?: string) => {
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

		this.getMemoizedFormContext(props); // Initialize form context.
		this.resetShortcuts((props.uiSchema || {})["ui:shortcuts"]);

		this.state = this.getStateFromProps(props);
	}

	UNSAFE_componentWillReceiveProps(props: LajiFormProps) {
		if ( props.apiClient && props.apiClient !== this.apiClient) {
			this.apiClient = new ApiClient(props.apiClient, props.lang, this.translations);
		}
		if (this.apiClient && "lang" in props && this.props.lang !== props.lang) {
			this.apiClient.setLang(props.lang as Lang);
		}
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps(props: LajiFormProps) {
		if (!this.tmpIdTree || props.schema !== this.props.schema) {
			this.setTmpIdTree(props.schema);
		}
		const state: LajiFormState = {
			formContext: this.getMemoizedFormContext(props)
		};
		if (((!this.state && props.schema && Object.keys(props.schema).length) || (this.state && !("formData" in this.state))) || ("formData" in props && props.formData !== this.props.formData)) {
			state.formData = this.addLajiFormIds(getDefaultFormState(props.schema, props.formData, props.schema));
			this._context.formData = state.formData;
		} else if (this.state) {
			state.formData = (this.formRef as any)?.state.formData;
		}
		if (this.state && props.schema !== this.props.schema) {
			state.extraErrors = {};
		}
		return state;
	}

	getMemoizedFormContext(props: LajiFormProps): FormContext {
		const nextKey = (["lang", "topOffset", "bottomOffset", "formContext", "settings"] as (keyof LajiFormProps)[]).reduce((key, prop) => {
			key[prop] = props[prop];
			return key;
		}, {} as Record<keyof LajiFormProps, any>);
		if (this.contextFormMemoizeKey && (Object.keys(this.contextFormMemoizeKey) as (keyof LajiFormProps)[]).every(k => this.contextFormMemoizeKey[k] === nextKey[k])) {
			return this.memoizedFormContext;
		} else {
			this.contextFormMemoizeKey = nextKey;
			const {services} = this.memoizedFormContext || {};
			this.memoizedFormContext = {
				...props.formContext,
				translations: this.translations[props.lang as Lang],
				lang: props.lang,
				uiSchemaContext: props.uiSchemaContext,
				getFormRef: this.getFormRef,
				topOffset: props.topOffset || 0,
				bottomOffset: props.bottomOffset || 0,
				contextId: this._id,
				formID: props.id,
				googleApiKey: props.googleApiKey,
				reserveId: this.reserveId,
				releaseId: this.releaseId,
				notifier: props.notifier || this.getDefaultNotifier(),
				apiClient: this.apiClient,
				Label: (props.fields || {}).Label || Label,
				mediaMetadata: props.mediaMetadata,
				setTimeout: this.setTimeout,
				services: {}
			};
			this.memoizedFormContext.utils = ReactUtils(this.memoizedFormContext);
			if (services) {
				this.memoizedFormContext.services = services;
				services.keyHandlerService.setFormContext(this.memoizedFormContext);
				services.focusService.setFormContext(this.memoizedFormContext);
				services.settingsService.setSettings(props.settings);
			} else {
				this.memoizedFormContext.services.keyHandlerService = new KeyHandlerService(this.memoizedFormContext);
				this.memoizedFormContext.services.settingsService = new SettingsService(this.onSettingsChange, props.settings);
				this.memoizedFormContext.services.focusService = new FocusService(this.memoizedFormContext);

			}
			return this.memoizedFormContext;
		}
	}

	componentDidMount() {
		this.mounted = true;
		this.props.autoFocus && this.memoizedFormContext.utils.focusById("root");

		this.blockingLoaderRef = document.createElement("div");
		this.blockingLoaderRef.className = "laji-form blocking-loader";
		if (this.blockingLoaderCounter > 0) this.blockingLoaderRef.className = "laji-form blocking-loader entering";
		document.body.appendChild(this.blockingLoaderRef);

		this.memoizedFormContext.services.keyHandlerService.initialize();

		if (this.props.componentDidMount) this.props.componentDidMount();
	}

	componentWillUnmount() {
		this.mounted = false;
		if (this._context.singletonMap) this._context.singletonMap.destroy();
		document.body.removeChild(this.blockingLoaderRef);
		this.memoizedFormContext.services.keyHandlerService.destroy();
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
		this.memoizedFormContext.services.keyHandlerService.setShortcuts(shortcuts, this.keyFunctions);
		Object.keys(shortcuts).some(keyCombo => {
			if (shortcuts[keyCombo].fn == "help") {
				this.keyCombo = keyCombo;
				return true;
			}
			return false;
		});
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

	setTmpIdTree = (schema: RJSFSchema) => {
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
	getTemplates = (_templates?: {[name: string]: TemplatesType}) => ({...templates, ...(_templates || {})})

	getContext = (props: LajiFormProps, context: ContextProps): ContextProps => {
		const nextKey = (["theme"] as (keyof LajiFormProps)[]).reduce((key, prop) => {
			key[prop] = props[prop];
			return key;
		}, {} as Record<keyof LajiFormProps, any>);
		if (this.contextMemoizeKey && (Object.keys(this.contextMemoizeKey) as (keyof LajiFormProps)[]).every(k => this.contextMemoizeKey[k] === nextKey[k])) {
			return this.memoizedContext;
		} else {
			this.contextMemoizeKey = nextKey;
			this.memoizedContext = {
				theme: props.theme || context?.theme || StubTheme,
			} as unknown as ContextProps;
			return this.memoizedContext;
		}
	}

	render() {
		if (this.state.error) return null;
		const {translations} = this.state.formContext;
		const {
			"ui:shortcuts": shortcuts,
			"ui:showShortcutsButton": showShortcutsButton = true,
			"ui:readonly": readonly,
			"ui:disabled": disabled
		} = this.props.uiSchema;

		const {Panel, Table} = this.getContext(this.props, this.context).theme;

		const panelHeader = (
			<h3>{translations.Shortcuts}<button type="button" className="close pull-right" onClick={this.dismissHelp}>×</button></h3>
		);
		return (
			<Context.Provider value={this.getContext(this.props, this.context)}>
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
											   errorClickHandler={this.memoizedFormContext.services.focusService.focus}
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
						templates={this.getTemplates(this.props.templates)}
						formContext={this.state.formContext}
						validator={rjsfValidator}
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
										if (["help", "autosuggestToggle"].includes(fn) || fn === "navigateSection" && rest.goOverRow) return;
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

		const { ProgressBar } = this.getContext(this.props, this.context).theme;
		return (
			<div className="running-jobs">
				{this.state.formContext.translations.PendingRunningJobs}... ({jobsAmount - runningAmount + 1} / {jobsAmount})
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
			? rjsfValidator.validateFormData(formData, this.props.schema, undefined, ((e: any) => transformErrors(this.state.formContext.translations, e))).errorSchema
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
				!equals((this.state.extraErrors || {}), merged) && this.setState({extraErrors: merged}, this.popErrorListIfNeeded);
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
			return translate(translations, "ShortcutHelp", {key: stringifyKeyCombo(this.keyCombo)});
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

	pushBlockingLoader = () => {
		this.blockingLoaderCounter++;
		this._context.blockingLoaderCounter = this.blockingLoaderCounter;
		if (this.mounted && this.blockingLoaderCounter === 1) {
			this.blockingLoaderRef.className = "laji-form blocking-loader entering";
			this.memoizedFormContext.services.keyHandlerService.block();
		}
	}

	popBlockingLoader = () => {
		this.blockingLoaderCounter--;
		this._context.blockingLoaderCounter = this.blockingLoaderCounter;
		if (this.blockingLoaderCounter < 0) {
			console.warn("laji-form: Blocking loader was popped before pushing!");
		} else if (this.blockingLoaderCounter === 0) {
			this.blockingLoaderRef.className = "laji-form blocking-loader leave-start";
			this.setTimeout(() => {
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
			this.memoizedFormContext.services.keyHandlerService.unblock();
		}
	}

	getSettings(global = false) {
		return this.memoizedFormContext.services.settingsService.getSettings(global);
	}

	onSettingsChange = (settings: Settings, global = false) => {
		if (this.props.onSettingsChange) this.props.onSettingsChange(settings, global);
	}

	addEventListener = (target: typeof document | typeof window, name: string, fn: (e: Event) => void) => {
		target.addEventListener(name, fn);
		this.eventListeners.push([target, name ,fn]);
	}

	setTimeout = (fn: () => void, time = 0) => {
		const timeout = window.setTimeout(fn, time);
		this.timeouts.push(timeout);
		return timeout;
	}

	destroy = () => {
		if (this.eventListeners) this.eventListeners.forEach(([target, name, fn]) => {
			target.removeEventListener(name, fn);
		});
		if (this.timeouts) this.timeouts.forEach((timeout) => {
			clearTimeout(timeout);
		});
		this.eventListeners = [];
	}
}
