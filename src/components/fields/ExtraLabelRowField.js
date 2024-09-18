import * as React from "react";
import * as PropTypes from "prop-types";
import { getUiOptions, getInnerUiSchema } from "../../utils";
import { Affix } from "../components";
import BaseComponent from "../BaseComponent";
import ReactContext from "../../ReactContext";
import { getTemplate } from "@rjsf/utils";

@BaseComponent
export default class ExtraLabelRowField extends React.Component {
	static contextType = ReactContext;
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				labels: PropTypes.arrayOf(PropTypes.object).isRequired,
				lg: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
				md: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
				sm: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
				xs: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
				hiddenXs: PropTypes.bool
			})
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["object", "array"])
		}).isRequired,
		formData: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired
	};

	getStateFromProps(props) {
		return {
			schema: {...props.schema, title: ""},
			uiSchema: getInnerUiSchema(props.uiSchema),
			options: getUiOptions(props.uiSchema)
		};
	}

	setContainerRef = (elem) => {
		this.containerElem = elem;
	}

	getContainerRef = () => {
		return this.containerElem;
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		const TitleFieldTemplate = getTemplate("TitleFieldTemplate", this.props.registry, getUiOptions(this.props.uiSchema));
		const {labels, hiddenXs, affixed} = getUiOptions(this.props.uiSchema);
		const cols = [];

		labels.forEach((label, i) => {
			cols.push(this.getColContent(label, i));
		});

		const title = this.props.schema.title !== undefined ? this.props.schema.title : this.props.name;

		const {Row} = this.context.theme;
		let labelRow = <Row className={"laji-form-label-row" + (hiddenXs ? " hidden-xs" : "")  + (affixed ? " affixed-labels" : "")}>{cols}</Row>;

		if (affixed) {
			labelRow = (
				<Affix getContainer={this.getContainerRef} 
				       style={affixed ? {position: "relative", zIndex: 1} : undefined} 
				       topOffset={this.props.formContext.topOffset}
				       bottomOffset={this.props.formContext.bottomOffset}>
					{labelRow}
				</Affix>
			);
		}

		return (
			<div ref={this.setContainerRef}>
				{title
					? (
						<TitleFieldTemplate title={title} schema={this.props.schema} uiSchema={this.props.uiSchema} id={this.props.idSchema.$id} registry={this.props.registry} />
					) : null
				}
				{labelRow}
				<SchemaField {...this.props} {...this.state}/>
			</div>
		);
	}

	getColContent = (label, i) => {
		const cols = this.getCols(label.size);

		const {Label} = this.props.formContext;
		const {Col} = this.context.theme;
		return (
			<Col {...cols} key={i}>
				<Label label={label.label} id={this.props.idSchema.$id} uiSchema={{"ui:help": label.help}}/>
			</Col>
		);
	};

	getCols = (property) => {
		const cols = {lg: 12, md: 12, sm: 12, xs: 12};

		const options = getUiOptions(this.props.uiSchema);
		Object.keys(cols).forEach(col => {
			const optionCol = options[col];
			if (typeof optionCol === "object") {
				let selector = undefined;
				if (optionCol[property]) selector = property;
				else if (optionCol["*"]) selector = "*";
				cols[col] = optionCol[selector];
			} else {
				cols[col] = optionCol;
			}
		});

		return cols;
	}
}
