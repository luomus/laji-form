import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import { ButtonToolbar, Dropdown, MenuItem, OverlayTrigger, Tooltip } from "react-bootstrap";
import Button from "../Button";
import Context from "../../Context";
import Isvg from "react-inlinesvg";

export default class ImageSelectWidget extends Component {
	static propTypes = {
		component: PropTypes.string.isRequired,
		options: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this.state = {open: false};
		this._context = new Context("IMAGES");
		this.staticImgPath = new Context().staticImgPath;
	}

	getValIdx = () => {
		return this.props.options.enumOptions.findIndex(option => option.value === this.props.value);
	}

	onKeyDown = (e) => {
		const {key} = e;

		switch (key) {
			case " ":
				this.setState({open: !this.state.open});
				e.preventDefault();
				break;
			case "ArrowDown":
				if (!this.state.open) {
					const valIdx = this.getValIdx();
					if (valIdx < this.props.options.enumOptions.length - 1) {
						this.props.onChange(this.props.options.enumOptions[valIdx + 1].value);
					}
					e.preventDefault();
					this.shouldFocusAfterUpdate = true;
				}
				break;
			case "ArrowUp":
				if (!this.state.open) {
					const valIdx = this.getValIdx();
					if (valIdx > 0) {
						this.props.onChange(this.props.options.enumOptions[valIdx - 1].value);
					}
					e.preventDefault();
					this.shouldFocusAfterUpdate = true;
				}
				break;
			case "Enter":
				this.shouldFocusAfterUpdate = true;
				break;
		};
	}

	toggle = () => {
		this.setState({open: !this.state.open});
	}

	componentDidUpdate() {
		if (this.shouldFocusAfterUpdate) {
			const elem = document.getElementById(`${this.props.id}-focus-sink`);
			elem.focus();
			this.shouldFocusAfterUpdate = false;
		} else if (this.state.open) {
			const active = document.getElementById(`${this.props.id}-active`);
			if (active) active.focus();
		}
	}

	render() {
		const {options} = this.props;
		const {enumOptions} = options;

		const valueLabel = enumOptions.find(enumOption => enumOption.value === this.props.value).label;
		const valueLabelElem = <span>{valueLabel}</span>;

		const inputElem = (
				<div>
					<div id={`${this.props.id}-focus-sink`} className={`form-control focus-sink ${this.state.open ? "focused" : ""}`}
							 tabIndex="0" bsRole="toggle" />
					<input id={this.props.id} style={{display: "none"}} />
					<div className="input-content img-value">
						{this.props.value ? this.renderImg(this.props.value, valueLabelElem) : valueLabelElem}
					</div>
					<span className="caret input-content"/>
				</div>
		);

		return (
			<div className="laji-form-image-select" onKeyDown={this.onKeyDown}>
					<Dropdown id={`${this.props.id}-dropdown`} open={this.state.open} onToggle={this.toggle} onClick={this.toggle}>
						{(valueLabel !== undefined  && valueLabel !== "") ? <OverlayTrigger placement="bottom" overlay={
							<Tooltip id={`${this.props.id}-image-select`}>{valueLabel}</Tooltip>
							}>
							{inputElem}
						</OverlayTrigger> : inputElem}
					<Dropdown.Menu id={`${this.props.id}-image-select-menu`} tabIndex="0">
					{enumOptions.map(enumOption => {
						const isActive = enumOption.value === this.props.value;
							return (
							<MenuItem key={`${this.props.id}-enum-option-${enumOption.value}`}
							          id={isActive ? `${this.props.id}-active` : null}
							          onClick={() => this.props.onChange(enumOption.value)}
							          active={isActive}>
								{this.renderImg(enumOption.value, null)}<span className="image-select-label">{enumOption.label}</span>
							</MenuItem>
							);
						}
					)}
					</Dropdown.Menu>
				</Dropdown>
			</div>
		);
	}

	renderImg = (enumName, fallback) => {
		const imgName = this.props.options.images[enumName];
		if (imgName === undefined) return fallback;

		let path = this._context[enumName] || {};

		try {
			path.svg = `${this.staticImgPath}/${imgName}.svg`;
			path.png = `${this.staticImgPath}/${imgName}.png`;
		} catch (e) {
			;
		}
		this._context[enumName] = path;
		return <Isvg key={enumName} src={path.svg} cacheGetRequests={true}><img src={path.png} /></Isvg>
	}
}
