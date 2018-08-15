import React, { Component } from "react";
import { findDOMNode } from "react-dom";
import { isEmptyString } from "../../utils";
import BaseComponent from "../BaseComponent";
import { Label } from "../components";

@BaseComponent
export default class TagArrayField extends Component {
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

	getStateFromProps = ({value}) => {
		return {value};
	}

	onKeyDown = (e) => {
		const {value} = this.state;
		const {tags = []} = this.props;
		if (e.key === "Enter" && !isEmptyString(value)) {
			this.props.onChange([...tags, value], "enter");
			e.stopPropagation();
			e.preventDefault();
		} else if (e.key === "Backspace" && isEmptyString(value) && tags.length) {
			this.onRemove(tags.length - 1)();
		}
		if (this.props.onKeyDown) {
			e.persist();
			this.props.onKeyDown(e);
		}
	}

	onRemove = (idx) => () => {
		const tags = [...(this.props.tags || [])];
		tags.splice(idx, 1);
		this.props.onChange(tags, "remove");
	}

	onFocus = () => {
		this.setState({focused: true}, () => {
			if (this.props.onFocus) this.props.onFocus();
		});
	}

	onBlur = () => {
		this.setState({focused: false});
		if (this.props.onBlur) this.props.onBlur();
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

	onChange = (e) => {
		const {onInputChange} = this.props;
		onInputChange && e.persist();
		const {target: {value}} = e;
		this.setState({value}, () => {
			onInputChange && this.props.onInputChange(e);
		});
	}

	render() {
		let {tags = [], InputComponent} = this.props;
		tags = tags.filter(s => !isEmptyString(s));
		const {value = ""} = this.state;

		const inputProps = {
			type: "text" ,
			className: "rw-input",
			ref: this.setInputRef,
			value: value,
			onChange: this.onChange,
			id: this.props.id,
			onFocus: this.onFocus,
			onBlur: this.onBlur,
			onKeyDown: this.onKeyDown
		};

		return (
			<div className={`rw-multiselect rw-widget${this.state.focused ? " rw-state-focus" : ""}`} onClick={this.onClick}>
				<div className="rw-multiselect-wrapper">
					<ul className="rw-multiselect-taglist">
						{tags.map((item, idx) => 
							<li key={idx}>
								{item}
								<span className="rw-tag-btn" onClick={this.onRemove(idx)}>×</span>
							</li>
						)}
					</ul>
					{InputComponent ? <InputComponent {...inputProps} /> : <input {...inputProps} />}
				</div>
			</div>
		);
	}
}
