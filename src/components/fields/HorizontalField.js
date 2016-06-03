import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import SchemaField from "react-jsonschema-form/lib/components/fields/SchemaField";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField";

export default class HorizontalField extends Component {
	constructor(props) {
		super(props);
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		let {uiSchema} = props;
		uiSchema = update(uiSchema, {$merge: {"ui:field": undefined}});
		
		let division = parseInt(12 / Object.keys(props.schema.properties).length);
		return {uiSchema, division};
	}
	
	isRequired = (requirements, name) => {
		return Array.isArray(requirements) &&
			requirements.indexOf(name) !== -1;
	}
	
	render() {
		let props = {...this.props, ...this.state};

		let fields = [];
		
		// make first division take rest of the total width divided by 12
		let firstDivision = props.division + (12 - (Object.keys(props.schema.properties).length * props.division));
		
		Object.keys(props.schema.properties).forEach((property, i) => {
			fields.push(
				<div key={"div_" + i} className={"col-md-" + ((i=== 0) ? firstDivision : props.division)}>
					<SchemaField
						key={i}
						name={props.schema.properties[property].title || property}
						required={this.isRequired(props.schema.required, property)}
						schema={props.schema.properties[property]}
						uiSchema={props.uiSchema[property]}
						idSchema={{id: props.idSchema + "_" + property}}
						errorSchema={props.errorSchema ? (props.errorSchema[property] || {}) : {}}
						formData={props.formData[property]}
						registry={props.registry}
						onChange={(data) => {
								let formData = update(this.props.formData, {$merge: {[property]: data}});
								props.onChange(formData);
							}}
					/>
				</div>
			)
		});

		let title = this.props.schema.title || this.props.name;
		return (
			<fieldset>
				{(title !== undefined && title !== "") ? <TitleField title={title} /> : null}
				<div className="row">
					{fields}
				</div>
			</fieldset>
		);

		// return (<SchemaField
		// 	{...this.props}
		// 	{...this.state}
		// />)
	}
}
