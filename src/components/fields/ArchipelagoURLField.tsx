import * as React from "react";
import * as PropTypes from "prop-types";
import VirtualSchemaField from "../VirtualSchemaField";
import { FieldProps } from "../../types";
import { getInnerUiSchema, getUiOptions } from "../../utils";

@VirtualSchemaField
export default class ArchipelagoURLField extends React.Component<FieldProps> {
	static propTypes = {
		uiSchema: PropTypes.shape({
			"ui:options": PropTypes.shape({
				baseURL: PropTypes.string
			}),
			uiSchema: PropTypes.object
		}).isRequired,
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}),
		formData: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired
	};

	constructor(props: FieldProps) {
		super(props);
	}

	static getName() { return "ArchipelagoURLField"; }

	getStateFromProps(props: FieldProps) {
		return {
			rootFormData: props.formContext.services.rootInstance.getFormData()
		};
	}

	componentDidMount() {
		this.props.formContext.services.rootInstance.addFormDataListener(this.onRootFormDataChange);
	}

	componentWillUnmount() {
		this.props.formContext.services.rootInstance.removeFormDataListener(this.onRootFormDataChange);
	}

	onRootFormDataChange = (rootFormData: any) => {
		this.setState({ rootFormData });
	};

	render() {
		const { rootFormData } = this.state as any;
		const { baseURL } = getUiOptions(this.props.uiSchema);
		const { translations } = this.props.formContext;
		const SchemaField = this.props.registry.fields.SchemaField as any;
		const dateBegin = rootFormData?.gatheringEvent?.dateBegin;
		const year = Number(dateBegin?.split("-")[0]) || undefined;
		const namedPlace = rootFormData?.namedPlaceID;
		const url = baseURL + `/project/MHL.1166/stats?tab=statistics&year=${year}&namedPlace=${namedPlace}`;
		return (
			<>
				{year !== undefined && namedPlace !== undefined && (
					<div style={{ margin: 10 }}>
						<b>{translations.ResultsLink}</b>
						<br />
						<a href={url} target="_blank">
							{translations.FieldObservationsFromNP}
						</a>
					</div>
				)}
				<SchemaField
					{...this.props}
					uiSchema={getInnerUiSchema(this.props.uiSchema)}
				/>
			</>
		);
	}
};
