import React, { Component } from "react";
import PropTypes from "prop-types";
import validate from "../validation";
import { Button, Label, Help } from "./components";
import { isMultiSelect, getTabbableFields, getSchemaElementById,
	canFocusNextInput, focusNextInput } from "../utils";
import scrollIntoViewIfNeeded from "scroll-into-view-if-needed";

import Form from "react-jsonschema-form";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import ArrayFieldTemplate from "./ArrayFieldTemplate";

import ApiClient from "../ApiClient";
import Context from "../Context";
import translations from "../translations.js";

class _SchemaField extends Component {
	componentDidMount() {
		function focus(id) {
			const elem = getSchemaElementById(id);
			if (elem) {
				const tabbableFields = getTabbableFields(elem);
				if (tabbableFields && tabbableFields.length) {
					tabbableFields[0].focus();
					scrollIntoViewIfNeeded(elem);
				}
			}
		}

		const _context = new Context(this.props.registry.formContext.contextId);
		const {idToFocus} = _context;
		if (idToFocus !== undefined && this.props.idSchema.$id === idToFocus) {
			const id = idToFocus;
			_context.delayFocus ? setTimeout(() => focus(id), _context.delayFocus) : focus(id);
			_context.idToFocus = undefined;
			_context.delayFocus = undefined;
		}
	}

	render() {
		const {props} = this;
		let {schema, uiSchema} = props;
		if (schema.uniqueItems && schema.items.enum && !isMultiSelect(schema, uiSchema)) {
			schema = {...schema, uniqueItems: false};
		}
		return <SchemaField
			{...props}
			// Reset ArrayFieldTemplate
			registry={{...props.registry, ArrayFieldTemplate}}
			schema={schema}
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
	"UnitRapidField",
	{"AccordionArrayField": "SingleActiveArrayField"} // Alias for backward compatibility.
]);

const widgets = importLocalComponents("widgets", [
	"CheckboxWidget",
	"SelectWidget",
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
	required,
	displayLabel,
	schema,
	uiSchema,
	}) {

	if (hidden) {
		return children;
	}
	const inlineHelp = uiSchema["ui:inlineHelp"];
	const ids = new Context("IDS");
	const htmlId = `_laji-form_${id}`;
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
			{label && _displayLabel ? <Label label={label} help={rawHelp} required={required} id={id} /> : null}
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

export default class LajiForm extends Component {
	static propTypes = {
		lang: PropTypes.oneOf(["fi", "en", "sv"]),
		uiSchemaContext: PropTypes.object,
		validators: PropTypes.object
	}

	static defaultProps = {
		lang: "en"
	}

	constructor(props) {
		super(props);
		this.apiClient = new ApiClient(props.apiClient);
		this.translations = this.constructTranslations();
		this._context = new Context(this.props.contextId);
		this.blockingLoaderCounter = 0;
		this._context.pushBlockingLoader = this.pushBlockingLoader;
		this._context.popBlockingLoader = this.popBlockingLoader;
		this._context.stateClearListeners = [];
		this._context.addStateClearListener = (fn) => this._context.stateClearListeners.push(fn);
		this._context.clearState = () => this._context.stateClearListeners.forEach(stateClearFn => stateClearFn());
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		if (props.hasOwnProperty("lang") && this.props.lang !== props.lang) this.apiClient.flushCache();
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		this._context.staticImgPath = props.staticImgPath;
		this._context.formData = props.formData;
		return {translations: this.translations[props.lang]};
	}

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	constructTranslations = () => {
		function capitalizeFirstLetter(string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
		}
		function decapitalizeFirstLetter(string) {
			return string.charAt(0).toLowerCase() + string.slice(1);
		}

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

	render() {
		const {translations} = this.state;
		return (
			<div onKeyDown={this.onKeyDown} className="laji-form">
				<Form
					{...this.props}
					ref="form"
					onChange={this.onChange}
					fields={fields}
					widgets={widgets}
					FieldTemplate={FieldTemplate}
					ArrayFieldTemplate={ArrayFieldTemplate}
					formContext={{
						translations,
						lang: this.props.lang,
						uiSchemaContext: this.props.uiSchemaContext,
						contextId: this.props.contextId,
						getFormRef: () => this.refs.form
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
			<div ref="blockingLoader" className="blocking-loader" />
		</div>
		);
	}

	submit = () => {
		this.refs.form.onSubmit({preventDefault: () => {}});
	}

	onKeyDown = (e) => {
		function isDescendant(parent, child) {
			var node = child.parentNode;
			while (node != null) {
				if (node == parent) {
					return true;
				}
				node = node.parentNode;
			}
			return false;
		}

		if (this.blockingLoaderCounter > 0 &&
			  !isDescendant(document.querySelector(".pass-block"), e.target)) {
			e.preventDefault();
			return;
		}

		if (isDescendant(document.querySelector(".laji-map"), e.target)) return;

		if (e.key == "Enter" && canFocusNextInput(this.refs.form, e.target)) {
			focusNextInput(this.refs.form, e.target, e.shiftKey);
			e.preventDefault();
		}
	}

	pushBlockingLoader = () => {
		this.blockingLoaderCounter++;
		if (this.mounted) {
			if (this.blockingLoaderCounter === 1) {
				this.refs.blockingLoader.className = "blocking-loader enter-start";
				setImmediate(() => {
					this.refs.blockingLoader.className = "blocking-loader entering";
				});
			}
		}
	}

	popBlockingLoader = () => {
		this.blockingLoaderCounter--;
		if (this.blockingLoaderCounter < 0) {
			console.warn("laji-form: Blocking loader was popped before pushing!");
		} else if (this.blockingLoaderCounter === 0) {
			this.refs.blockingLoader.className = "blocking-loader leave-start";
			setImmediate(() => {
				this.refs.blockingLoader.className = "blocking-loader leaving";
			});
			setTimeout(() => {
				this.refs.blockingLoader.className = "blocking-loader";
			}, 200); // should match css transition time.
		}
	}

	clearState = () => {
		this._context.clearState();
	}
}
