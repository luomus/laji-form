import { Component } from "react";
import VirtualSchemaField from "../VirtualSchemaField";

@VirtualSchemaField
export default class SingleItemArrayField extends Component {

	static getName() {return "SingleItemArrayField";}

	getStateFromProps(props) {
		return {
			...props,
			uiSchema: {
				...props.uiSchema,
				"ui:field": "SingleActiveArrayField",
				"ui:options": {
					...this.getUiOptions(),
					renderer: "uncontrolled",
					addable: false
				},
			}
		};
	}
}
