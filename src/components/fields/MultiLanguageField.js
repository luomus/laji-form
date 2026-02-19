import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions } from "../../utils";

export default class MultiLanguageField extends React.Component {
	static propTypes = {
		uiSchema: PropTypes.any,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object"])
		}).isRequired,
		formData: PropTypes.object
	};

	constructor(props) {
		super(props);
	}

	render() {
		const SchemaField = this.props.registry.fields.SchemaField;
		const {Label, lang} = this.props.formContext;
		const {schema, uiSchema, idSchema, errorSchema, formData = {}, required} = this.props;
		const uiOptions = getUiOptions(uiSchema);

		const languages = Object.keys(schema.properties).sort((a, b) => {
			const sortA = Number(a !== lang);
			const sortB = Number(b !== lang);
			return sortA - sortB;
		});

		return (
			<React.Fragment>
				<Label
					label={schema.title || ""}
					required={required || uiSchema["ui:required"]}
					uiSchema={uiSchema}
					id={this.props.idSchema.$id}
				/>
				{ languages.map(_lang => (
					<SchemaField
						{...this.props}
						key={_lang}
						schema={{title: "", ...schema.properties[_lang]}}
						uiSchema={{
							"ui:widget": "InputGroupWidget",
							"ui:options": {
								"inputGroupText": _lang,
								"className": "multi-lang-input-group",
								...uiOptions
							}
						}}
						errorSchema={errorSchema[_lang] || {}}
						idSchema={idSchema[_lang]}
						formData={formData[_lang] || ""}
						required={uiSchema[_lang]?.["ui:required"] || false}
						onChange={this.onChange(_lang)}
					/>
				)) }
			</React.Fragment>
		);
	}

	onChange = (lang) => (formData) => {
		const newFormData = {...this.props.formData, [lang]: formData};
		this.props.onChange(newFormData);
	};
}
