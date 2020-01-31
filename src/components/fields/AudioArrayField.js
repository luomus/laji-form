import React, { Component, useState, useEffect } from "react";
import { findDOMNode } from "react-dom";
import { MediaArrayField } from "./ImageArrayField";
import Spinner from "react-spinner";
import { Glyphicon } from "react-bootstrap";
import AudioPlayer from 'react-h5-audio-player';
import { DeleteButton } from "../components";

@MediaArrayField
export default class AudioArrayField extends Component {
	constructor(props) {
		super(props);
		//this._refs = (this.props.formData || []).map(() => React.createRef());
		this._refs = [];
		this.setRefs = (this.props.formData || []).map((_, i) => (elem) => {this._refs[i] = elem;});
	}

	componentWillReceiveProps(props) {
		if ((props.formData || []).length > this._refs.length) {
			//	this._refs = (this.props.formData || []).map((_, i) => this._refs[i] || React.createRef());
			this.setRefs = (this.props.formData || []).map((_, i) => (elem) => {this._refs[i] = elem;});
		}
	}

	ALLOWED_FILE_TYPES = ["audio/mp3", "audio/x-wav"];
	MAX_FILE_SIZE = 20000000;
	KEY = "AUDIO";
	ENDPOINT = "audio";
	GLYPH = "headphones";
	METADATA_SETTINGS_KEY = "defaultAudioMetadata";
	TRANSLATION_TAKE_NEW = "TakeNewRecording";
	TRANSLATION_SELECT_FILE = "SelectRecording";
	TRANSLATION_NO_MEDIA = "NoRecording"
	CONTAINER_CLASS = "audios-container"

	renderMedia = (id, idx, onMediaClick) => <Audio id={id}
			idx={idx}
			apiClient={this.props.formContext.apiClient}
			translations={this.props.formContext.translations}
			ref={this.setRefs[idx]}
		/>
	renderLoadingMedia = (id) => null
	onMediaClick = (idx) => () => console.log(this._refs[idx]) || findDOMNode(this._refs[idx]).click();
}

const Audio = React.forwardRef((props, ref) => {
	const [url, setUrl] = useState(null);
	const [shouldShowPlayer, setShowPlayer] = useState(null);
	const containerRef = React.useRef();
	useEffect(() => {
		props.apiClient.fetchCached(`/audio/${props.id}`, undefined, {failSilently: true}).then(response => {
			setUrl(response.mp3URL);
		});
	})
	const onBlur = React.useCallback(() => {
		setShowPlayer(false);
	});
	const showPlayer = React.useCallback(() => {
		console.log("SHOW PLAYER");
		setShowPlayer(true);
		setImmediate(() => {
			containerRef.current && containerRef.current.focus();
		});
	});
	const hidePlayer = React.useCallback(() => {
		setShowPlayer(false);
	});
	const onKeyDown = React.useCallback((e) => {
		if (e.key === "Escape") {
			hidePlayer();
		}
	});
	const onNext = React.useCallback((e) => {
		hidePlayer();
		//GOTO NEXDT
	}, [props.idx]);
	return !url 
		? <div className="media-loading"><Spinner /></div>
		: (
			shouldShowPlayer
			//? <div><audio controls><source src={url} />Selaimesi ei tue audiota</audio><DeleteButton corner={true}></div>
			? (<div style={{position: "absolute", zIndex: 1}} onBlur={onBlur} ref={containerRef} tabIndex={0} onKeyDown={onKeyDown}>
				<AudioPlayer src={url} autoPlay height={120} showLoopControl={false} showSkipControls={true} showJumpControls={false} onClickNext={onNext} />
				<DeleteButton corner={true} translations={props.translations} onClick={hidePlayer}/>
				</div>)
			: <Glyphicon glyph="play-circle" onClick={showPlayer} ref={ref}/>
	);
});
