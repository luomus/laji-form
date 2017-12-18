import React, { Component } from "react";
import PropTypes from "prop-types";
import { MapComponent } from "./MapArrayField";
import { getUiOptions } from "../../utils";
import BaseComponent from "../BaseComponent";

@BaseComponent
export default class MapField extends Component {
	render() {
		const {TitleField} = this.props.registry.fields;
		const options = getUiOptions(this.props.uiSchema);
		const {height = 400} = options;
		return (
			<div>
				<TitleField title={this.props.schema.title || this.props.name} />
				<div style={{height}}>
					<MapComponent {...options.mapOptions || {}} {...this.state.mapOptions || {}} draw={this.getDrawOptions()} lang={this.props.formContext.lang}  onOptionsChanged={this.onOptionsChanged} />
				</div>
			</div>
		);
	}

	getDrawOptions = () => {
		const options = getUiOptions(this.props.uiSchema);
		const {mapOptions = {}} = options;
		const {formData} = this.props;
		return {
			...(mapOptions.draw || {}),
			geoData: formData && Object.keys(formData).length ? formData : undefined,
			onChange: this.onChange
		}
	}

	onOptionsChanged = (options) => this.setState({mapOptions: {...this.state.mapOptions, ...options}})

	onChange = (events) => {
		let formData;
		events.forEach(e => {
			switch(e.type) {
			case "create":
				formData = {
					type: "GeometryCollection",
					geometries: [e.feature.geometry]
				};
				break;
			case "edit":
				formData = {
					type: "GeometryCollection",
					geometries: [e.features[0].geometry]
				};
				break;
			case "delete":
				formData = {
					type: "GeometryCollection",
					geometries: []
				}
			}
		});
		this.props.onChange(formData);
	}
}
