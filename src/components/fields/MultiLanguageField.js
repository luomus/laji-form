import * as React from "react";
import BaseComponent from "../BaseComponent";
import * as PropTypes from "prop-types";

@BaseComponent
export default class MultiLanguageField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.any,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object
	}

	constructor(props) {
		super(props);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		const {Label, lang} = this.props.formContext;
		const {schema, uiSchema, idSchema, errorSchema, formData, required} = this.props;
		const languages = Object.keys(schema.properties).sort((a, b) => {
			const sortA = Number(a !== lang);
			const sortB = Number(b !== lang);
			return sortA - sortB;
		});

		return (
			<React.Fragment>
				<Label label={schema.title || ""} uiSchema={uiSchema} required={required || uiSchema["ui:required"]}/>
				{ languages.map(_lang => (
					<SchemaField
						{...this.props}
						key={_lang}
						schema={{title: "", ...schema.properties[_lang]}}
						uiSchema={{
							"ui:widget": "InputGroupWidget",
							"ui:options": {"inputGroupText": _lang, "className": "multi-lang-input-group"}
						}}
						errorSchema={errorSchema[_lang] || {}}
						idSchema={idSchema[_lang]}
						formData={formData[_lang] || ""}
						required={uiSchema[_lang]?.["ui:required"] || false}
					/>
				)) }
			</React.Fragment>
		);
	}
}
