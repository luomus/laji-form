import React, { Component, useState, useEffect } from "react";
import { MediaArrayField } from "./ImageArrayField";
import Spinner from "react-spinner";
import { Glyphicon } from "react-bootstrap";
import { GlyphButton } from "../components";

const FILE_TYPES = ["audio/mp3", "audio/mpeg", "audio/x-wav", "audio/wav", "audio/wave", "audio/vnd.wave"];

@MediaArrayField
export default class AudioArrayField extends Component {
	ALLOWED_FILE_TYPES = FILE_TYPES;
	ACCEPT_FILE_TYPES = ["audio/*"];
	MAX_FILE_SIZE = 20000000;
	KEY = "AUDIO";
	ENDPOINT = "audio";
	GLYPH = "headphones";
	TRANSLATION_TAKE_NEW = "TakeNewRecording";
	TRANSLATION_SELECT_FILE = "SelectRecording";
	TRANSLATION_NO_MEDIA = "NoRecording"
	CONTAINER_CLASS = "audios-container"
	METADATA_FORM_ID = "MHL.63"

	renderMedia = (id, idx) => (
		<div className="audio-container">
			<AudioButton id={id}
				idx={idx}
				apiClient={this.props.formContext.apiClient}
				translations={this.props.formContext.translations}
			/>
				<GlyphButton className="audio-metadata-button" bsStyle="info" glyph="pencil" onClick={this.openModalFor(idx)}>{" "}{this.props.formContext.translations.Edit}</GlyphButton>
		</div>
	)
	renderLoadingMedia = () => null
	renderLoadingMedia = () => <div className="audio-container loading"><Spinner /></div>
	onMediaClick = () => null
	renderModalMedia = (idx) => (
		<div>
			<img src={this.state.modalMediaSrc} />
			<LajiAudio id={this.props.formData[idx]} style={{width: "100%"}} apiClient={this.props.formContext.apiClient} downloadLinks={true} translations={this.props.formContext.translations} />
		</div>
	)
	formatValue(value) {
		return  (value || []).map((id, idx) => <Glyphicon key={idx} glyph="headphones" />);
	}
}

const AudioButton = React.forwardRef((props, ref) => {
	const [loaded, setLoaded] = useState(null);
	const [playing, setPlaying] = useState(null);
	const audioRef = React.useRef();
	const play = React.useCallback(() => {
		setPlaying(true);
		audioRef.current.play();
	});
	const stop = React.useCallback(() => {
		audioRef.current.pause();
		audioRef.current.currentTime = 0;
		setPlaying(false);
	});
	const onKeyDown = React.useCallback((e) => {
		if (e.key === " ") {
			playing ? stop() : play();
			e.preventDefault();
			e.stopPropagation();
		}
	});
	return (
		<React.Fragment>
			{!loaded 
				? <div className="media-loading"><Spinner /></div>
				: <Glyphicon glyph={playing ? "pause" :"play"} onClick={playing ? stop : play} ref={ref} tabIndex={0} onKeyDown={onKeyDown}/>
			}
			<LajiAudio style={{display: "none"}} ref={audioRef} id={props.id} onLoaded={setLoaded} onStop={stop} apiClient={props.apiClient} translations={props.translations}/>
		</React.Fragment>
	);
});

const LajiAudio = React.forwardRef((props, ref) => {
	const [mp3Url, setMp3Url] = useState(null);
	const [wavUrl, setWavUrl] = useState(null);
	useEffect(() => {
		props.apiClient.fetchCached(`/audio/${props.id}`, undefined, {failSilently: true}).then(response => {
			setMp3Url(response.mp3URL);
			setWavUrl(response.wavURL);
			props.onLoaded && props.onLoaded(true);
		});
	});
	return !mp3Url ? <Spinner style={props.style} /> : (
		<div>
			<audio controls style={props.style} ref={ref} onPause={props.onStop}><source src={mp3Url} /></audio>
			{ props.downloadLinks && (
				<React.Fragment>
					<a href={mp3Url} download>{`${props.translations.Download} mp3`}</a>
					{wavUrl && 
							<React.Fragment>
								{" | "}
								<a href={wavUrl} download>{`${props.translations.Download} wav`}</a>
							</React.Fragment>
					}

				</React.Fragment>
			)}
		</div>
	);
});
