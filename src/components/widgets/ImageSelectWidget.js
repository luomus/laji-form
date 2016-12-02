import React, { Component, PropTypes } from "react";
import { ButtonToolbar, Dropdown, MenuItem, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Button } from "../components";
import Context from "../../Context";
import { getUiOptions } from "../../utils";
import Isvg from "react-inlinesvg";
import SelectWidget from "./SelectWidget";

export default class ImageSelectWidget extends Component {
	static propTypes = {
		options: PropTypes.object.isRequired
	}

	constructor(props) {
		super(props);
		this._context = new Context("IMAGES");
		this.staticImgPath = new Context().staticImgPath;
	}

	render() {
		return (
			<SelectWidget
				{...this.props}
				selectProps={{
					renderValue: item => this.renderImg(item.value, item.label),
					renderOption: item => <div>{this.renderImg(item.value, item.label)} <span>{item.label}</span></div>
				}}
			/>
		)
	}

	renderImg = (enumName, fallback) => {
		const imgName = getUiOptions(this.props).images[enumName];
		if (imgName === undefined) return fallback;

		let path = this._context[enumName] || {};

		try {
			path.svg = `${this.staticImgPath}/${imgName}.svg`;
			path.png = `${this.staticImgPath}/${imgName}.png`;
		} catch (e) {
			;
		}
		this._context[enumName] = path;
		return <span className="select-icon"><Isvg key={enumName} src={path.svg} cacheGetRequests={true}><img src={path.png} /></Isvg></span>
	}
}
