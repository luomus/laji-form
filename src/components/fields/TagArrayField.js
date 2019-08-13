import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import PropTypes from "prop-types";
import { isEmptyString, getUiOptions, triggerParentComponent } from "../../utils";
import BaseComponent from "../BaseComponent";
import { Label } from "../components";
import Context from "../../Context";
import deepEquals from "deep-equal";

@BaseComponent
export default class TagArrayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:option": PropTypes.shape({
				separatorKeys: PropTypes.arrayOf(PropTypes.string)
			})
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array"])
		}).isRequired,
		formData: PropTypes.array
	}

	render() {
		return (
			<React.Fragment>
				<Label label={this.props.schema.title} id={this.props.idSchema.$id} />
				<TagInputComponent {...this.props} id={this.props.idSchema.$id} tags={this.props.formData} />
			</React.Fragment>
		);
	}
}

export class TagInputComponent extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	componentDidUpdate(prevProps) {
		if (!deepEquals(prevProps.formData, this.props.formData)) {
			new Context(this.props.formContext.contextId).sendCustomEvent(this.props.idSchema.$id, "resize");
		}
	}

	getStateFromProps = ({value}) => {
		return {value};
	}

	onKeyDown = (e) => {
		const {value} = this.state;
		const {tags = []} = this.props;
		const {separatorKeys = ["Enter"]} = getUiOptions(this.props.uiSchema);
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

		const {separatorKeys = []} = getUiOptions(this.props.uiSchema);
		const splitted = separatorKeys.reduce((splitted, separator) => {
			return splitted.reduce((splitted, i) => i.split(separator), splitted);
		}, [value]);
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
			className: "rw-input",
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
				<div className="rw-multiselect-wrapper">
					<ul className="rw-multiselect-taglist">
						{tags.map((item, idx) => 
							<li key={idx}>
								{item}
								<span className="rw-tag-btn" onClick={this.onRemove(idx)}>×</span>
							</li>
						)}
					</ul>
					{InputComponent ? <InputComponent {...inputProps} /> : <input {...inputProps} disabled={disabled || readonly} />}
				</div>
			</div>
		);
	}
}
