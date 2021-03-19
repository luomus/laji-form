import * as React from "react";
const { useState, useEffect } = React;
import { MediaArrayField } from "./ImageArrayField";
import * as Spinner from "react-spinner";
import { GlyphButton } from "../components";
import ReactContext from "../../ReactContext";

const FILE_TYPES = ["audio/mp3", "audio/mpeg", "audio/x-wav", "audio/wav", "audio/wave", "audio/vnd.wave"];

@MediaArrayField
export default class AudioArrayField extends React.Component {
	static contextType = ReactContext;
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
			<GlyphButton className="audio-metadata-button" themeRole="info" glyph="pencil" onClick={this.openModalFor(idx)}>{" "}{this.props.formContext.translations.Edit}</GlyphButton>
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
	formatValue = (value) => {
		const {Glyphicon} = this.context.theme;
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
	}, [audioRef, setPlaying]);
	const stop = React.useCallback(() => {
		audioRef.current.pause();
		audioRef.current.currentTime = 0;
		setPlaying(false);
	}, [audioRef, setPlaying]);
	const onKeyDown = React.useCallback((e) => {
		if (e.key === " ") {
			playing ? stop() : play();
			e.preventDefault();
			e.stopPropagation();
		}
	}, [playing, stop, play]);
	const {Glyphicon} = React.useContext(ReactContext).theme;
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
