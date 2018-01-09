import React, { Component } from "react";
import { isEmptyString } from "../../utils";
import BaseComponent from "../BaseComponent";
import { Label } from "../components";

@BaseComponent
export default class TagArrayField extends Component {
	getStateFromProps = ({value}) => {
		return {value};
	}

	onChange = ({target: {value}}) => {
		this.setState({value});
	}

	onKeyDown = (e) => {
		const {value} = this.state;
		const {formData} = this.props;
		if (e.key === "Enter" && !isEmptyString(value)) {
			this.props.onChange([...formData, value]);
			e.stopPropagation();
			e.preventDefault();
		} else if (e.key === "Backspace" && isEmptyString(value) && formData.length) {
			this.onRemove(formData.length - 1)();
		}
	}

	onRemove = (idx) => () => {
		const formData = [...this.props.formData];
		formData.splice(idx, 1);
		this.props.onChange(formData);
	}

	onFocus = () => {
		this.setState({focused: true});
	}

	onBlur = () => {
		this.setState({focused: false});
		if (!isEmptyString(this.state.value)) {
			this.props.onChange([...this.props.formData, this.state.value]);
		}
	}

	render() {
		const {formData = []} = this.props;
		const {value = ""} = this.state;
		return (
			<div>
				<Label label={this.props.schema.title} />
				<div className={`rw-multiselect rw-widget${this.state.focused ? " rw-state-focus" : ""}`}>
					<div className="rw-multiselect-wrapper">
						<ul className="rw-multiselect-taglist">
							{formData.map((item, idx) => 
								<li key={idx}>
									{item}
									<span className="rw-tag-btn" onClick={this.onRemove(idx)}>×</span>
								</li>
							)}
						</ul>
						<input type="text" 
						       className="rw-input"
							     value={value}
							     onChange={this.onChange}
							     onFocus={this.onFocus}
							     onBlur={this.onBlur}
							     onKeyDown={this.onKeyDown} />
					</div>
				</div>
			</div>
		);
	}
}
