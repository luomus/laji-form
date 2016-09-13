import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import ApiClient from "../../ApiClient";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField"
import { Modal } from "react-bootstrap";
import DropZone from "react-dropzone";

export default class ImagesArrayField extends Component {

	constructor(props) {
		super(props);
		this.apiClient = new ApiClient();
		this.state = this.getStateFromProps(props);
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props));
	}

	getStateFromProps = (props) => {
		(props.formData || []).map((item, i) => {
			if (item.match(/MM\./)) {
				this.apiClient.fetchCached("/images/" + item).then(response => {
					this.setState({imgURLs: update(this.state.imgURLs, {[i]: {$set: response.squareThumbnailURL}})})
				})
			}
			return item;
		});
		return {imgURLs: props.formData};
	}

	render() {
		const {readonly, disabled, schema, uiSchema, name, registry} = this.props;
		const {translations} = registry;

		const options = uiSchema["ui:options"] || {};
		const description = options.description;
		const title = (schema.title === undefined) ? name : schema.title;

		return (
			<div>
				<TitleField title={title} />
				{description !== undefined ? <DescriptionField description={description} /> : null}
				<div className="laji-form-images">
					{this.state.imgURLs ? this.state.imgURLs.map((dataURL, i) => <img key={i} src={dataURL} onClick={this.onImgClick(i)} />) : null}
					<DropZone className={"laji-form-drop-zone" + (this.state.dragging ? " dragging" : "")}
					          onDragEnter={() => this.setState({dragging: true})}
					          onDragLeave={() => this.setState({dragging: false})}
					          onDrop={this.onFileFormChange}>{translations.dropOrSelectFiles}</DropZone>
					{this.renderModal()}
				</div>
			</div>
		);
	}

	onImgClick = (i) => () => {
		const item = this.props.formData[i];
		if (item.match(/MM\./)) {
			this.apiClient.fetchCached("/images/" + item).then(response => {
				this.setState({modalOpen: true, modalImgSrc: response.originalURL});
			})
		} else {
			this.setState({modalOpen: true, modalImgSrc: item});
		}
	}

	renderModal = () => {
		return this.state.modalOpen ?
			<Modal dialogClassName="laji-form image-modal" show={true} onHide={() => this.setState({modalOpen: false})}><Modal.Body>
				<div className="laji-form image-modal-content">
					<img src={this.state.modalImgSrc} />
				</div>
			</Modal.Body></Modal> : null;
	}

	onFileFormChange = (files) => {
		const {onChange, formData} = this.props;
		this.processFiles(files)
			.then(filesInfo => {
				const dataURLs = filesInfo.map(fileInfo => fileInfo.dataURL);
				onChange((formData && formData.length > 0) ? update(formData, {$push: dataURLs}) : dataURLs);
			});
	}

	addNameToDataURL = (dataURL, name) => {
		return dataURL.replace(";base64", `;name=${name};base64`);
	}

	processFiles = (files) => {
		return Promise.all([].map.call(files, this.processFile));
	}

	processFile = (file) => {
		const {name, size, type} = file;
		return new Promise(resolve => {
			const reader = new window.FileReader();
			reader.onload = (event) => {
				resolve({
					dataURL: this.addNameToDataURL(event.target.result, name),
					name,
					size,
					type
				});
			};
			reader.readAsDataURL(file);
		});
	}
}
