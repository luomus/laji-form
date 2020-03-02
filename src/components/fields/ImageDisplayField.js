import React, { Component } from "react";
import PropTypes from "prop-types";
import BaseComponent from "../BaseComponent";
import { getUiOptions, getInnerUiSchema } from "../../utils";
import update from "immutability-helper";

// TODO should work as widget also
@BaseComponent
export default class ImageDisplayField extends Component {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				urls: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
				buttons: PropTypes.arrayOf(PropTypes.string),
			}),
		}),
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["array", "object"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.array, PropTypes.object])
	}
	render() {
		const {SchemaField} = this.props.registry.fields;
		let uiSchema = getInnerUiSchema(this.props.uiSchema);
		const {urls = [], buttons = []} = getUiOptions(this.props.uiSchema);
		uiSchema = update(uiSchema, {"ui:options": {buttons: {$set: [...buttons, 
			{position: "left", render: () => 
			<div className="laji-form-medias" key="image-display">
				{(Array.isArray(urls) ? urls : [urls]).map(url => 
					<div className="media-container" key={url}>
						<img src={url}></img>
					</div>
				)}
			</div>
			}
		]}}});
		return (
			<React.Fragment>
				<SchemaField
					{...this.props}
					uiSchema={uiSchema}
				/>
			</React.Fragment>
		);
	}
}
