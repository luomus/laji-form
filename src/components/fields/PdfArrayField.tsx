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
	METADATA_FORM_ID = "MHL.1070"

	renderMedia = (id: string) => <Thumbnail id={id} apiClient={this.props.formContext.apiClient} apiEndpoint={this.ENDPOINT} />
	renderLoadingMedia = (id: string) => <Thumbnail dataURL={id} loading={true} apiClient={this.props.formContext.apiClient} apiEndpoint={this.ENDPOINT} />
	onMediaClick = (i: number) => (this as any).openModalFor(i)
	renderModalMedia = () => <img src={this.state.modalMediaSrc} />

	formatValue(value: string[], options: any, props: FieldProps) {
		const {translations} = props.formContext;
		return value && value.length
			? `${value.length} ${translations.HowManyFiles}`
			: null;
	}
}
