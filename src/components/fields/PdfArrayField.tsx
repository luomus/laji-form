import * as React from "react";
import { FieldProps } from "../LajiForm";
import { MediaArrayField, MediaArrayState, Thumbnail } from "./ImageArrayField";

@MediaArrayField
export default class PdfArrayField extends React.Component<FieldProps, MediaArrayState> {
	ALLOWED_FILE_TYPES = ["application/pdf"];
	ACCEPT_FILE_TYPES = ["application/pdf"];
	MAX_FILE_SIZE = 20000000;
	KEY = "PDF";
	ENDPOINT = "pdf";
	GLYPH = "paperclip";
	TRANSLATION_TAKE_NEW = "";
	TRANSLATION_SELECT_FILE = "";
	TRANSLATION_NO_MEDIA = ""
	CONTAINER_CLASS = "pdf-container"
	METADATA_FORM_ID = ""

	renderMedia = (id: string) => <Thumbnail id={id} apiClient={this.props.formContext.apiClient} apiEndpoint={this.ENDPOINT} downloadLink={true} />
	renderLoadingMedia = () => <Thumbnail loading={true} apiClient={this.props.formContext.apiClient} apiEndpoint={this.ENDPOINT} downloadLink={true} />
	onMediaClick = () => null

	formatValue(value: string[], options: any, props: FieldProps) {
		const {translations} = props.formContext;
		return value && value.length
			? `${value.length} ${translations.HowManyFiles}`
			: null;
	}
}
