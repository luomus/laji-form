import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import { isEmptyString, getUiOptions, triggerParentComponent } from "../../utils";
import BaseComponent from "../BaseComponent";

@BaseComponent
export default class TagArrayField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				separatorKeys: PropTypes.arrayOf(PropTypes.string)
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	}

	render() {
		const {FieldTemplate} = this.props.registry.templates;
		const {uiSchema} = this.props;

		return (
			<FieldTemplate {...this.props} forceDisplayLabel={true} rawHelp={uiSchema["ui:help"]} description={uiSchema["ui:description"]} rawErrors={[]}>
				<TagInputComponent {...this.props} id={this.props.idSchema.$id} tags={this.props.formData} />
			</FieldTemplate>
		);
	}
}

export class TagInputComponent extends React.Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	UNSAFE_componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = ({value}) => {
		return {value};
	}

	getSeparatorKeys = (uiSchema) => {
		const {separatorKeys = ["Enter", ",", ";"]} = getUiOptions(uiSchema);
		return separatorKeys;
	}

	onKeyDown = (e) => {
		const {value} = this.state;
		const {tags = []} = this.props;
		const separatorKeys = this.getSeparatorKeys(this.props.uiSchema);
		if (separatorKeys.includes(e.key) && !isEmptyString(value)) {
			this.props.onChange([...tags, value], "enter");
			e.stopPropagation();
			e.preventDefault();
		} else if (e.key === "Backspace" && isEmptyString(value) && tags.length) {
			this.onRemove(tags.length - 1)();
		}
		triggerParentComponent("onKeyDown", e, this.props);
	}

	onRemove = (idx) => () => {
		const tags = [...(this.props.tags || [])];
		tags.splice(idx, 1);
		this.props.onChange(tags, "remove");
	}

	onFocus = (e) => {
		this.setState({focused: true}, () => {
			triggerParentComponent("onFocus", e, this.props);
		});
	}

	onBlur = (e) => {
		this.setState({focused: false});
		triggerParentComponent("onBlur", e, this.props);
		if (!isEmptyString(this.state.value)) {
			this.props.onChange([...(this.props.tags || []), this.state.value], "blur");
		}

	}

	setInputRef = (ref) => {
		this.inputRef = ref;
	}

	onClick = () => {
		findDOMNode(this.inputRef).focus();
	}

	onInputChange = (e) => {
		const {onInputChange} = this.props;
		onInputChange && e.persist();
		const {target: {value}} = e;

		const separatorKeys = this.getSeparatorKeys(this.props.uiSchema);
		const splitted = separatorKeys.reduce((splitted, separator) => 
			splitted.reduce((_splitted, i) => ([..._splitted, ...i.split(separator)]), []),
		[value]);
		this.setState({value}, () => {
			onInputChange && this.props.onInputChange(e);
			if (splitted.length > 1) {
				this.props.onChange([...(this.props.tags || []), ...splitted]);
			}
		});
	}

	render() {
		let {tags = [], InputComponent, readonly, disabled} = this.props;
		tags = tags.filter(s => !isEmptyString(s));
		const {value = ""} = this.state;

		const inputProps = {
			type: "text" ,
			className: "rw-input-reset",
			ref: this.setInputRef,
			value: value,
			onChange: this.onInputChange,
			id: this.props.id,
			...this.props.inputProps,
			onFocus: this.onFocus,
			onBlur: this.onBlur,
			onKeyDown: this.onKeyDown
		};

		return (
			<div className={`rw-multiselect rw-widget${this.state.focused ? " rw-state-focus" : ""}${readonly || disabled ? " rw-state-disabled" : ""}`}
				onClick={this.onClick}>
				<div className="rw-widget-input rw-widget-picked rw-widget-container">
					<ul className="rw-multiselect-taglist">
						{tags.map((item, idx) => 
							<li key={idx} className="rw-multiselect-tag">
								{item}
								<span className="rw-tag-btn" onClick={this.onRemove(idx)} tabIndex={0} onKeyDown={this.props.formContext.utils.keyboardClick(this.onRemove(idx))}>×</span>
							</li>
						)}
					</ul>
					{InputComponent ? <InputComponent {...inputProps} /> : <input {...inputProps} disabled={disabled || readonly} />}
				</div>
			</div>
		);
	}
}
