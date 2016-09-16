import React, { Component, PropTypes } from "react";
import update from "react-addons-update";
import ApiClient from "../../ApiClient";
import TitleField from "react-jsonschema-form/lib/components/fields/TitleField"
import DescriptionField from "react-jsonschema-form/lib/components/fields/DescriptionField"
import { Modal, Row, Col } from "react-bootstrap";
import DropZone from "react-dropzone";
import Button from "../Button";

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
					if (!this.mounted) return;
					this.setState({imgURLs: update(this.state.imgURLs, {[i]: {$set: response.squareThumbnailURL}})})
				})
			}
			return item;
		});
		return {imgURLs: props.formData};
	}

	componentDidMount() {
		this.mounted = true;
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	render() {
		const {schema, uiSchema, name, registry} = this.props;
		const {translations} = registry;

		const options = uiSchema["ui:options"] || {};
		const description = options.description;
		const title = (schema.title === undefined) ? name : schema.title;

		return (
			<Row>
				<Col xs={12}>
					<TitleField title={title} />
					{description !== undefined ? <DescriptionField description={description} /> : null}
					<div className="laji-form-images">
						{this.renderImgs()}
							<DropZone ref="dropzone" className={"laji-form-drop-zone" + (this.state.dragging ? " dragging" : "")}
											  accept="image/*"
											  onDragEnter={() => {this.setState({dragging: true})}}
											  onDragLeave={() => {this.setState({dragging: false})}}
											  onDrop={files => {
													this.setState({dragging: false});
													this.onFileFormChange(files)}
												}>{translations.DropOrSelectFiles}</DropZone>
						{this.renderModal()}
					</div>
				</Col>
			</Row>
		);
	}

	renderImgs = () => {
		return this.state.imgURLs ?
			this.state.imgURLs.map((dataURL, i) => (
				<div key={i} className="img-container">
					<a onClick={this.onImgClick(i)}><img src={dataURL} /></a>
					<Button buttonType="danger" classList={["img-remove"]} onClick={this.onImgRmClick(i)}>✖</Button>
				</div>
			)) :
			null;
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

	onImgRmClick = (i) => () => {
		this.props.onChange(update(this.props.formData, {$splice: [[i, 1]]}));
	}

	renderModal = () => {
		return this.state.modalOpen ?
			<Modal dialogClassName="laji-form image-modal" show={true} onHide={() => this.setState({modalOpen: false})}>
				<Modal.Header closeButton={true} />
				<Modal.Body>
					<div className="laji-form image-modal-content">
						<img src={this.state.modalImgSrc} />
					</div>
				</Modal.Body>
			</Modal> : null;
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
