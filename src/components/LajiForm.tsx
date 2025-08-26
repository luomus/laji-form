import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import validate, { toErrorSchema } from "../validation";
import { transformErrors, initializeValidation } from "../validation";
import { Button, TooltipComponent, FailedBackgroundJobsPanel, Label } from "./components";
import {
	capitalizeFirstLetter,
	stringifyKeyCombo,
	getScrollPositionForScrollIntoViewIfNeeded,
	getWindowScrolled,
	highlightElem,
	constructTranslations,
	translate,
	getDefaultFormState,
	ReactUtils,
	ReactUtilsType,
	JSONPointerToId,
	isObject
} from "../utils";
const equals = require("deep-equal");
import rjsfValidator from "@rjsf/validator-ajv6";
import merge from "deepmerge";
import { Theme } from "../themes/theme";
import Context, { ContextProps } from "../ReactContext";
import StubTheme from "../themes/stub";
import Form from "@rjsf/core";
import { Field, Widget, TemplatesType } from "@rjsf/utils";
import ApiClient, { ApiClientImplementation } from "../ApiClient";
import instanceContext from "../Context";
import translations from "../translations.json";
import KeyHandlerService, { ShortcutKeys } from "../services/key-handler-service";
import SettingsService, { Settings } from "../services/settings-service";
import FocusService from "../services/focus-service";
import BlockerService from "../services/blocker-service";
import CustomEventService from "../services/custom-event-service";
import SubmitHookService, { SubmitHook } from "../services/submit-hook-service";
import DOMIdService from "../services/dom-id-service";
import IdService from "../services/id-service";
import RootInstanceService from "../services/root-instance-service";
import SingletonMapService from "../services/singleton-map-service";
import { FieldProps, HasMaybeChildren, Lang } from "../types";
import MultiActiveArrayService from "../services/multi-active-array-service";

const fields = importLocalComponents<Field>("fields", [
	"SchemaField",
	{"ArraySchemaField": "SchemaField"},
	"ArrayField",
	"ObjectField",
	"NestField",
	"ArrayBulkField",
	"ArrayBulkField",
	"ArrayPropertySumField",
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
	"HiddenWithTextField",
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
	"MultiLanguageField",
	"SortArrayField",
	"InputWithDefaultValueButtonField",
	"MultiTagArrayField",
	"PdfArrayField",
	"AsArrayField",
	"CondensedObjectField",
	"MultiActiveArrayField",
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
	"NumberWidget",
	"InputGroupWidget",
	"InputWithDefaultValueButtonWidget"
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
	formRef: React.RefObject<Form>;
	topOffset: number;
	bottomOffset: number;
	formID: string;
	googleApiKey: string;
	notifier: Notifier;
	apiClient: ApiClient;
	Label: React.ComponentType<{ label?: string, id: string, uiSchema?: any, required?: boolean }>;
	// formDataTransformers?: any[];
	formDataTransformers?: { props: FieldProps, "ui:field": string, targets: string[] }[];
	_parentLajiFormId?: number;
	mediaMetadata?: MediaMetadata;
	contextId: number;
	theme: Theme;
	setTimeout: (fn: () => void, time?: number) => void;
	utils: ReactUtilsType;
	lajiGeoServerAddress: string;
	globals: Record<string, unknown>; // Used to store data mutably between components so doesn't affect React rendering.
	services: {
		keyHandler: KeyHandlerService,
		settings: SettingsService,
		focus: FocusService,
		blocker: BlockerService,
		customEvents: CustomEventService,
		submitHooks: SubmitHookService,
		DOMIds: DOMIdService,
		ids: IdService,
		rootInstance: RootInstanceService,
		singletonMap: SingletonMapService,
		multiActiveArray: MultiActiveArrayService
	}
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

export default class LajiForm extends React.Component<LajiFormProps, LajiFormState> {
	static contextType = Context;
	private contextMemoizeKey: Record<keyof LajiFormProps, any>;
	private contextFormMemoizeKey: Record<keyof LajiFormProps, any>;
	memoizedContext: ContextProps;
	memoizedFormContext: FormContext;

	translations = this.constructTranslations();
	bgJobRef = React.createRef<FailedBackgroundJobsPanel>();
	shortcutHelpRef = React.createRef<any>();
	apiClient: ApiClient;
	_id: number;
	propagateSubmit = true;
	formRef = React.createRef<Form>();
	mounted: boolean;
	keyCombo: string;
	defaultNotifier: Notifier;
	validating = false;
	cachedNonliveValidations: any;
	helpVisible: boolean;
	helpTimeout: number;
	helpStarted: boolean;
	eventListeners: [typeof document | typeof window, string, (e: Event) => void][] = [];
	timeouts: number[] = [];

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
		const state: LajiFormState = {
			formContext: this.getMemoizedFormContext(props)
		};
		if (((!this.state && props.schema && Object.keys(props.schema).length) || (this.state && !("formData" in this.state))) || ("formData" in props && props.formData !== this.props.formData)) {
			state.formData = state.formContext.services.ids.addLajiFormIds(getDefaultFormState(props.schema, props.formData, props.schema))[0];
		} else if (this.state && this.formRef.current) {
			state.formData = this.formRef.current.state.formData;
		}
		if (this.state && props.schema !== this.props.schema) {
			state.extraErrors = {};
		}
		this.memoizedFormContext.services.ids.setFormData(state.formData);
		this.memoizedFormContext.services.rootInstance.setFormData(state.formData);

		return state;
	}

	getMemoizedFormContext(props: LajiFormProps): FormContext {
		const nextKey = (["lang", "topOffset", "bottomOffset", "formContext", "settings", "schema", "uiSchemaContext", "mediaMetadata", "lajiGeoServerAddress"] as (keyof LajiFormProps)[]).reduce((key, prop) => {
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
				uiSchemaContext: props.uiSchemaContext || {},
				topOffset: props.topOffset || 0,
				bottomOffset: props.bottomOffset || 0,
				contextId: this._id,
				formID: props.id,
				googleApiKey: props.googleApiKey,
				notifier: props.notifier || this.getDefaultNotifier(),
				apiClient: this.apiClient,
				Label: (props.fields || {}).Label || Label,
				mediaMetadata: props.mediaMetadata,
				setTimeout: this.setTimeout,
				services: {},
				formRef: this.formRef,
				lajiGeoServerAddress: props.lajiGeoServerAddress,
				globals: instanceContext(this._id)
			};
			this.memoizedFormContext.utils = ReactUtils(this.memoizedFormContext);
			if (services) {
				this.memoizedFormContext.services = services;
				services.keyHandler.setFormContext(this.memoizedFormContext);
				services.focus.setFormContext(this.memoizedFormContext);
				services.settings.setSettings(props.settings);
				services.ids.setSchema(props.schema);
				services.rootInstance.setSchema(props.schema);
			} else {
				this.memoizedFormContext.services.keyHandler = new KeyHandlerService(this.memoizedFormContext);
				this.memoizedFormContext.services.settings = new SettingsService(this.onSettingsChange, props.settings);
				this.memoizedFormContext.services.focus = new FocusService(this.memoizedFormContext);
				this.memoizedFormContext.services.blocker = new BlockerService(this.memoizedFormContext);
				this.memoizedFormContext.services.customEvents = new CustomEventService();
				this.memoizedFormContext.services.submitHooks = new SubmitHookService(this.onSubmitHooksChange);
				this.memoizedFormContext.services.DOMIds = new DOMIdService();
				this.memoizedFormContext.services.ids = new IdService(props.schema, props.formData);
				this.memoizedFormContext.services.rootInstance = new RootInstanceService(
					props.schema, props.formData, (formData) => this.onChange({formData}), this.validate, () => this.validateAndSubmit(false)
				);
				this.memoizedFormContext.services.singletonMap = new SingletonMapService();
				this.memoizedFormContext.services.multiActiveArray = new MultiActiveArrayService();
			}
			return this.memoizedFormContext;
		}
	}

	componentDidMount() {
		this.mounted = true;
		this.memoizedFormContext.services.rootInstance.setIsMounted(true);
		this.props.autoFocus && this.memoizedFormContext.utils.focusById("root");

		(Object.keys(this.memoizedFormContext.services) as (keyof FormContext["services"])[]).forEach(service => {
			(this.memoizedFormContext.services[service] as any).initialize?.();
		});

		if (this.props.componentDidMount) this.props.componentDidMount();
	}

	componentWillUnmount() {
		this.mounted = false;
		this.memoizedFormContext.services.rootInstance.setIsMounted(false);
		(Object.keys(this.memoizedFormContext.services) as (keyof FormContext["services"])[]).forEach(service => {
			(this.memoizedFormContext.services[service] as any).destroy?.();
		});
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

	onSubmitHooksChange = (submitHooks: SubmitHook[], callback?: () => void) => {
		this.setState({submitHooks}, callback);
	}

	resetShortcuts(shortcuts: ShortcutKeys = {}) {
		this.memoizedFormContext.services.keyHandler.setShortcuts(shortcuts, this.keyFunctions);
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

	onChange = ({formData}: {formData: any}) => {
		this.setState({formData}, () => {
			if (this.props.onChange) {
				const _formData = this.props.optimizeOnChange
					? formData
					: this.memoizedFormContext.services.ids.removeLajiFormIds(formData);
				this.props.onChange(_formData);
			}
			this.memoizedFormContext.services.ids.setFormData(formData);
			this.memoizedFormContext.services.rootInstance.setFormData(formData);
			!this.validating && this.validate(!!"warnings", !"nonlive");
		});
	}

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
		const uiSchema = {
			...this.props.uiSchema,
			"ui:submitButtonOptions": {
				norender: true
			}
		};

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
					<FailedBackgroundJobsPanel
						jobs={this.state.submitHooks}
						schema={this.props.schema}
						uiSchema={uiSchema}
						formContext={this.state.formContext}
						errorClickHandler={this.memoizedFormContext.services.focus.focus}
						ref={this.bgJobRef}
					/>
					<Form
						{...this.props as any}
						formData={this.state.formData}
						uiSchema={uiSchema}
						ref={this.formRef}
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
						tagName="div"
						readonly={readonly}
						disabled={disabled}
					>
						{this.props.children}
					</Form>
					{(!this.props.children && this.props.renderSubmit !== false) ? (
						<Button id="submit" onClick={this.submit} disabled={readonly || disabled}>
							{this.props.submitText || translations.Submit}
						</Button>
					) : null}
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
				onSubmit?.({formData: removeUndefinedFromArrays(
					this.memoizedFormContext.services.ids.removeLajiFormIds(formData)
				)});
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
		
		const { formData } = this.state;
		const {live: liveErrorValidators, rest: errorValidators} =
			splitLive(this.props.validators, this.props.schema.properties);
		const {live: liveWarningValidators, rest: warningValidators} =
			splitLive(this.props.warnings, this.props.schema.properties);
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
			? this.getSchemaValidationErrors(formData)
			: {};
		block && this.memoizedFormContext.services.blocker.push();
		return new Promise(resolve =>
			Promise.all([validate(validations, formData), validate(liveValidations, formData)]).then(([_validations, _liveValidations]) => {
				if (nonlive || onlySchema) {
					this.cachedNonliveValidations = merge(schemaErrors, _validations);
					block && this.memoizedFormContext.services.blocker.pop();
				}
				const merged = merge(_liveValidations, !nonlive
					? (this.cachedNonliveValidations || {})
					: merge(_validations, schemaErrors)
				) as any;
				this.validating = false;
				resolve(!Object.keys(merged).length);
				!equals((this.state.extraErrors || {}), merged) && this.setState({extraErrors: merged}, this.popErrorListIfNeeded);
			}).catch((e) => {
				block && this.memoizedFormContext.services.blocker.pop();

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

		this.memoizedFormContext.services.blocker.push();
		this.setState({runningSubmitHooks: true});
		this.memoizedFormContext.services.submitHooks.checkHooks().then(() => {
			this.memoizedFormContext.services.blocker.pop();
			this.setState({runningSubmitHooks: false});
			this.validateAndSubmit(!_onlySchemaValidations, _onlySchemaValidations);
		}).catch(() => {
			this.setState({runningSubmitHooks: false});
			this.memoizedFormContext.services.blocker.pop();
			highlightElem(findDOMNode(this.bgJobRef?.current) as Element);
		});
		return undefined;
	}

	popErrorListIfNeeded = () => {
		const errorList = this.memoizedFormContext.services.rootInstance.getErrorListInstance();
		let errorListElem;
		try {
			errorListElem = findDOMNode(errorList) as Element;
		} catch (e) {
			// Empty
		}
		if (!errorListElem) return;
		const wouldScrollTo = getScrollPositionForScrollIntoViewIfNeeded(errorListElem, this.props.topOffset, this.props.bottomOffset) || 0;
		const scrollAmount = wouldScrollTo - getWindowScrolled();

		if (!errorList.state.poppedTouched && scrollAmount !== 0) {
			errorList.expand();
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
			return this.memoizedFormContext.services.focus.focusNextInput(reverse);
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
		this.memoizedFormContext.services.blocker.push();
	}

	popBlockingLoader = () => {
		this.memoizedFormContext.services.blocker.pop();
	}

	focusField = (fieldName: string) => {
		const id = JSONPointerToId(fieldName);
		this.memoizedFormContext.services.focus.focus("root_" + id);
	}

	openAllMultiActiveArrays = () => {
		this.memoizedFormContext.services.multiActiveArray.openAll();
	}

	closeAllMultiActiveArrays = () => {
		this.memoizedFormContext.services.multiActiveArray.closeAll();
	}

	getSettings(global = false) {
		return this.memoizedFormContext.services.settings.getSettings(global);
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

	getSchemaValidationErrors = (formData: any) => {
		const errors = rjsfValidator.validateFormData(
			removeUndefinedFromArrays(formData),
			this.props.schema,
			undefined,
			((e: any) => transformErrors(this.state.formContext.translations, e))
		).errors;
		return toErrorSchema(errors);
	}
}

const removeUndefinedFromArrays = (formData: any) => {
	if (isObject(formData)) {
		return Object.keys(formData).reduce((obj, k) => {
			obj[k] = removeUndefinedFromArrays(formData[k]);
			return obj;
		}, {} as Record<string, unknown>);
	} else if (Array.isArray(formData)) {
		return formData.reduce((filtered, i) => {
			if (i === undefined || i === null || i === "") {
				return filtered;
			}
			filtered.push(removeUndefinedFromArrays(i));
			return filtered;
		}, []);
	}
	return formData;
};
