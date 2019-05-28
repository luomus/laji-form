import React, { Component } from "react";
import BaseComponent from "../BaseComponent";
import { getUiOptions, getInnerUiSchema } from "../../utils";
import update from "immutability-helper";

@BaseComponent
export default class ImageDisplayField extends Component {
	render() {
		const {SchemaField} = this.props.registry.fields;
		let uiSchema = getInnerUiSchema(this.props.uiSchema);
		const {urls = [], buttons = []} = getUiOptions(this.props.uiSchema);
		uiSchema = update(uiSchema, {"ui:options": {buttons: {$set: [...buttons, 
			{position: "left", render: () => 
			<div className="laji-form-images">
				{(Array.isArray(urls) ? urls : [urls]).map(url => 
					<div className="img-container">
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
