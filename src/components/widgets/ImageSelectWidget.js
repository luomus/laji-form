import * as React from "react";
import * as PropTypes from "prop-types";
import getContext from "../../Context";
import { getUiOptions } from "../../utils";
import Isvg from "react-inlinesvg";
import SelectWidget from "./SelectWidget";
import BaseComponent from "../BaseComponent";

@BaseComponent
export default class ImageSelectWidget extends React.Component {
	static propTypes = {
		options: PropTypes.object.isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}),
		value: PropTypes.string
	}

	constructor(props) {
		super(props);
		this._context = getContext("IMAGES");
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
		);
	}

	renderImg = (enumName, fallback) => {
		const imgName = getUiOptions(this.props).images[enumName];
		if (imgName === undefined) return fallback;

		let path = this._context[enumName] || {};

		try {
			path.svg = `https://cdn.laji.fi/images/${imgName}.svg`;
			path.png = `https://cdn.laji.fi/images/${imgName}.png`;
		} finally {
			this._context[enumName] = path;
			return <span className="select-icon"><Isvg key={enumName} src={path.svg} cacheGetRequests={true}><img src={path.png} /></Isvg></span>;
		}
	}
}
