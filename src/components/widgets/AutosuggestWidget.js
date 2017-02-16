import React, { Component, PropTypes } from "react";
import { findDOMNode } from "react-dom";
import Autosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";
import { Tooltip, OverlayTrigger, FormControl, FormGroup, Popover, Glyphicon } from "react-bootstrap";
import Spinner from "react-spinner"
import { getUiOptions, isEmptyString, focusNextInput } from "../../utils";
import BaseComponent from "../BaseComponent";

const autosuggestSettings = {
	taxon: {
		query: {
			includePayload: true,
		},
		renderSuggestion: suggestion => {
			let text = suggestion.value;
			if (suggestion.payload.taxonGroupsStr) {
				text += " (" + suggestion.payload.taxonGroupsStr + ")";
			}
			return text;
		},
		convertInputValue: that => {
			let value = that.getValue();
			if (!autosuggestSettings.taxon.isValueSuggested(value)) return new Promise(resolve => resolve(value));
			return new ApiClient().fetchCached(`/taxa/${value}`).then(({vernacularName, scientificName}) => {
				return vernacularName || scientificName || value;
			});
		},
		isValueSuggested: value => {
			return !isEmptyString(value) && value.match(/MX\.\d+/);
		},
		renderMetaInfo: (that, input) => {
			const content = autosuggestSettings.taxon.getTaxonCardContent(that);
			return <OverlayTrigger trigger={["hover", "focus"]}
			                       placement={that.state.focused ? "top" : "right"}
			                       overlay={content}>
							{input}
						</OverlayTrigger>;
		},
		renderUnsuggestedMetaInfo: (that, input) => {
			const tooltip = (
				<Tooltip id={`${that.props.id}-tooltip`}>{that.props.formContext.translations.UnknownSpeciesName}</Tooltip>
			);
			return (
				<OverlayTrigger overlay={tooltip}>{input}</OverlayTrigger>
			)
		},
		renderSuccessGlyph: (that) => {
			const options = getUiOptions(that.props);
			const value = options.hasOwnProperty("value") ? options.value : that.props.value;

			return (
				<a href={"http://tun.fi/" + value} target="_blank">
					<Glyphicon style={{pointerEvents: "auto"}} glyph="tag" className="form-control-feedback"/>
				</a>
			);
		},
		getTaxonCardContent: (that) => {
			const value = that.getValue();

			if (value && (!that.state || !that.state.value || that.state.value !== value)) {
				new ApiClient().fetchCached(`/taxa/${value}`).then(response => {
					if (that.mounted) that.setState({urlTxt: response.scientificName, value, urlTxtIsCursive: response.cursiveName});
				});
			}

			const tooltipElem = (
				<Tooltip id={`${that.props.id}-popover-tooltip`}>
					{that.props.formContext.translations.OpenSpeciedCard}
				</Tooltip>
			);

			return (
				<Popover id={`${that.props.id}-popover`}>
					<span className="text-success">
						<Glyphicon glyph="tag" /> {that.props.formContext.translations.KnownSpeciesName}
					</span>
					{that.state.urlTxt ?
						<div>
							<OverlayTrigger overlay={tooltipElem}>
								<a href={`http://tun.fi/${value}`}
								   target="_blank"><Glyphicon glyph="modal-window"/> {
									that.state.urlTxtIsCursive ? <i>{that.state.urlTxt}</i> :
										that.state.urlTxt
								}</a>
							</OverlayTrigger>
						</div> :
						<Spinner />
					}
				</Popover>
			);
		}
	},
	friends: {
		query: {
			includeSelf: true,
		},
		renderSuggestion: suggestion => {
			return suggestion.value;
		},
		convertInputValue: that => {
			let value = that.props.value;
			if (isEmptyString(value) || !value.match(/MA\.\d+/)) return new Promise(resolve => resolve(value));
			return new ApiClient().fetchCached(`/person/by-id/${value}`).then(({fullName}) => {
				return fullName || value;
			});
		},
		isValueSuggested: value => {
			return !isEmptyString(value) && value.match(/MA\.\d+/);
		},
		renderMetaInfo: (that, input) => {
			const content = autosuggestSettings.friends.getFriendProfile(that);
			return that.state.imgUrl ? (
				<OverlayTrigger trigger={["hover", "focus"]}
			                       overlay={content}>
					{input}
				</OverlayTrigger>) : input;
		},
		renderUnsuggestedMetaInfo: (that, input) => {
			const tooltip = (
				<Tooltip id={`${that.props.id}-tooltip`}>{that.props.formContext.translations.UnknownName}</Tooltip>
			)
			return (
				<OverlayTrigger overlay={tooltip}>{input}</OverlayTrigger>
			);
		},
		renderSuccessGlyph: (that) => <Glyphicon style={{pointerEvents: "auto"}}
		                                         glyph="user"
		                                         className="form-control-feedback"/>,
		getFriendProfile: (that) => {
			return;
			const value = that.getValue();

			if (value && that.state.imgUrlPerson !== value) {
				new ApiClient().fetchCached(`/person/by-id/${value}/profile`).then(({image}) => {
					if (that.mounted && image) that.setState({imgUrl: image, imgUrlPerson: value});
				});
			}

			return (
				<Popover id={`${that.props.id}-popover`}>
					{that.state.imgUrl ?
						<img src={that.state.imgUrl} style={{width: 70}} /> : <Spinner />
					}
				</Popover>
			);
		},
	}
}

@BaseComponent
export default class AutoSuggestWidget extends Component {
	static propTypes = {
		options: PropTypes.shape({
			autosuggestField: PropTypes.string.isRequired,
			allowNonsuggestedValue: PropTypes.boolean,
			onSuggestionSelected: PropTypes.function,
			onConfirmUnsuggested: PropTypes.function,
			onInputChange: PropTypes.function,
			uiSchema: PropTypes.object
		}).isRequired
	}

	constructor(props) {
		super(props);
		this.state = {isLoading: false, suggestions: [], unsuggested: false, focused: false, ...this.getStateFromProps(props)};
		this.apiClient = new ApiClient();
	}

	componentWillReceiveProps(props) {
		const prevValue = this.state.value;
		this.setState(this.getStateFromProps(props), () => {
			if (props.value !== prevValue) this.triggerConvert(this.props);
		});
	}

	getStateFromProps(props) {
		const options = getUiOptions(props);
		const {autosuggestField} = options;
		return {autosuggestSettings: autosuggestSettings[autosuggestField], value: props.value};
	}

	componentDidMount() {
		this.mounted = true;
		this.triggerConvert(this.props);
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	triggerConvert = (props) => {
		const isValueSuggested = getUiOptions(this.props).isValueSuggested ||
		                         this.state.autosuggestSettings.isValueSuggested;

		if (props.value === undefined || props.value === "") {
			this.setState({inputValue: undefined});
			return;
		}

		const convert = this.state.autosuggestSettings.convertInputValue;
		if ((isValueSuggested && isValueSuggested(props.value) && convert) || (!isValueSuggested && convert)) {
			this.setState({isLoading: true});
			convert(this)
				.then(inputValue => {
					if (!this.mounted) return;
					this.setState({inputValue: inputValue, isLoading: false});
				})
				.catch( () => {
					if (!this.mounted) return;
					this.setState({inputValue: undefined, isLoading: false, unsuggested: true});
				});
		} else if (isValueSuggested) {
			if (!isValueSuggested()) this.setState({unsuggested: true});
		}
	}

	getSuggestionValue = (suggestion) => {
		return suggestion.value;
	}

	renderSuggestion = (suggestion) => {
		return (<span className="simple-option">{this.state.autosuggestSettings.renderSuggestion(suggestion)}</span>);
	}

	onSuggestionsFetchRequested = ({value}) => {
		value = this.inputValue;
		if (!value || value.length < 2) return;
		const {autosuggestField, query = {}} = getUiOptions(this.props);

		this.setState({isLoading: true});
		(() => {
			let timestamp = Date.now();
			this.promiseTimestamp = timestamp;
			this.get = this.apiClient.fetchCached("/autocomplete/" + autosuggestField,
				{q: value, ...(this.state.autosuggestSettings.query || {}), ...query})
				.then(suggestions => {
					const state = {isLoading: false};
					if (this.mounted && this.promiseTimestamp === timestamp) {
						const unambigiousSuggestion = this.findUnambigiousSuggestion(suggestions);
						if (!this.state.focused && unambigiousSuggestion) {
							this.selectSuggestion(unambigiousSuggestion);
						}
						else if (this.state.focused) state.suggestions = suggestions;
						else state.oldSuggestions = suggestions;
						this.setState(state);
						this.promiseTimestamp = undefined;
					}
				})
				.catch(error => {
					if (this.mounted && this.promiseTimestamp === timestamp) {
						this.setState({isLoading: false});
						this.promiseTimestamp = undefined;
					}
				});
		})();
	}

	onSuggestionsClearRequested = () => {
		this.setState({oldSuggestions: this.state.suggestions.slice(0), suggestions: []});
	}

	selectSuggestion = (suggestion) => {
		if (!suggestion) return;
		const {onSuggestionSelected, suggestionReceive} = getUiOptions(this.props);
		this.suggestionSelectedFlag = true;
		let state = {inputInProgress: false, unsuggested: false, inputValue: (suggestion !== undefined && suggestion !== null) ? suggestion.value : ""};
		if (onSuggestionSelected) {
			onSuggestionSelected(suggestion);
		} else {
			this.props.onChange(suggestion[suggestionReceive]);
		}
		this.setState(state);
	}

	onSuggestionSelected = (e, {suggestion, method}) => {
		e.preventDefault();
		if (method === "click") {
			focusNextInput(this.props.formContext.getFormRef(), document.getElementById(this.props.id));
		}
		this.selectSuggestion(suggestion);
		this.setState({focused: false});
	}

	onInputChange = (value) => {
		const {onInputChange} = getUiOptions(this.props);
		if (onInputChange) {
			value = onInputChange(value);
		}
		this.inputChanged = (value !== this.state.inputValue);
		if (this.inputChanged && !this.suggestionSelectedFlag) {
			const state = {inputValue: value};
			if (value !== "") state.inputInProgress = true;
			this.setState(state);
			this.inputValue = value; //setState works asynchronously. We need the input value immediately for suggestion fetching.
		}
		this.suggestionSelectedFlag = false;
	}

	onFocus =  () => {
		this.setState({focused: true});
	}

	findUnambigiousSuggestion = (suggestions) => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		return suggestions.find(suggestion => (suggestion && suggestion.value.toLowerCase() === this.state.inputValue.toLowerCase()));
	}

	onBlur = (e, {focusedSuggestion}) => {
		if (this.state.inputValue === "") {
			this.setState({unsuggested: false}, () => {
				this.props.onChange("");
			});
			return;
		}

		const unambigiousSuggestion = this.findUnambigiousSuggestion(this.state.suggestions);
		this.setState({focused: false}, () => {
			if (!this.state.inputInProgress) {
				return;
			} else if (focusedSuggestion === null && this.state.inputValue === "") {
				this.selectSuggestion(focusedSuggestion);
			} else if (unambigiousSuggestion) {
				this.selectSuggestion(unambigiousSuggestion);
			} else {
				this.onConfirmUnsuggested();
			}
		});
	}

	onConfirmUnsuggested = () => {
		const {onConfirmUnsuggested} = getUiOptions(this.props);
		this.setState({inputInProgress: false, unsuggested: true});
		if (onConfirmUnsuggested) {
			onConfirmUnsuggested(this.state.inputValue);
		} else {
			this.props.onChange(this.state.inputValue);
		}
	}

	componentDidUpdate() {
		this.suggestionSelectedFlag = false;
	}

	render() {
		const {props} = this;
		let {suggestions, inputValue, isLoading} = this.state;
		const {preventTypingPattern} = getUiOptions(props);

		const inputProps = {
			id: this.props.id,
			value: (inputValue !== undefined) ? inputValue : props.value,
			readOnly: props.readonly,
			disabled: props.disabled,
			placeholder: props.placeholder,
			onChange: (e, {newValue, method}) => {
				if (method === "type" && preventTypingPattern) {
					const regexp = new RegExp(preventTypingPattern);
					if (newValue.match(regexp)) return;
				}
				this.onInputChange(newValue, method);
			},
			onFocus: this.onFocus,
			onBlur: this.onBlur
		};

		if (inputProps.value === undefined || inputProps.value === null) inputProps.value = "";

		let cssClasses = {
			suggestionsContainer: "dropdown-menu bootstrap3 react-selectize simple-select",
			suggestionsList: "list-group",
			containerOpen: "open",
			suggestion: "option-wrapper",
			suggestionFocused: "option-wrapper highlight"
		};

		return (
			<div className="autosuggest-wrapper">
				<Autosuggest
					ref="autosuggestInput"
					id={`${this.props.id}-autosuggest`}
					inputProps={inputProps}
					renderInputComponent={this.renderInput}
					suggestions={suggestions}
					getSuggestionValue={this.getSuggestionValue}
					renderSuggestion={this.renderSuggestion}
					onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
					onSuggestionsClearRequested={this.onSuggestionsClearRequested}
					onSuggestionSelected={this.onSuggestionSelected}
					focusInputOnSuggestionClick={false}
					theme={cssClasses}
				/>
				{isLoading ? <Spinner /> : null }
			</div>
		);
	}

	getValue = () => {
		const options = getUiOptions(this.props);
		return options.hasOwnProperty("value") ? options.value : this.props.value;
	}

	renderInput = (inputProps) => {
		let validationState = null;

		const value = this.getValue();

		if ((this.state.inputInProgress && !this.state.focused) || this.state.unsuggested) {
			validationState = "warning";
		} else if (value) {
			validationState = "success";
		}

		const options = getUiOptions(this.props);
		const renderMetaInfo = !options.hasOwnProperty("renderMetaInfo") || options.renderMetaInfo;

		const getGlyphNameFromState = (state) => {
			switch (state) {
				case "success":
					return "ok";
					break;
				case "warning":
					return "warning-sign";
					break;
				case "error":
					return "remove";
					break;
				default:
					return "";
					break;
			}
		};

		const getGlyph = (state) => {
			const glyph = getGlyphNameFromState(state);

			return glyph ? (
				<Glyphicon
					style={{pointerEvents: "auto"}}
					glyph={glyph}
					className="form-control-feedback"
				/>
			) : null;
		}

		// react-bootstrap components can't be used here because they require using form-group which breaks layout.
		const input = (
			<div className={`has-feedback${renderMetaInfo ? ` has-${validationState}` : ""}`}>
				<input className="form-control" type="text" {...inputProps} />
				{!this.state.focused && !this.state.isLoading && renderMetaInfo ?
					<FormControl.Feedback>{
						validationState === "success" && this.state.autosuggestSettings.renderSuccessGlyph ?
							this.state.autosuggestSettings.renderSuccessGlyph(this) : getGlyph(validationState)
					}</FormControl.Feedback> :
					null
				}
			</div>
		);

		if (value && !this.state.unsuggested && renderMetaInfo && this.state.autosuggestSettings.renderMetaInfo) {
			return this.state.autosuggestSettings.renderMetaInfo(this, input);
		} else if (value && this.state.unsuggested && renderMetaInfo && this.state.autosuggestSettings.renderUnsuggestedMetaInfo) {
			return this.state.autosuggestSettings.renderUnsuggestedMetaInfo(this, input);
		} else {
			return input;
		}
	}
}

