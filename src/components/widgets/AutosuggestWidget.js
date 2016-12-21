import React, { Component, PropTypes } from "react";
import Autosuggest from "react-autosuggest";
import ApiClient from "../../ApiClient";
import { Button, Tooltip, OverlayTrigger, FormControl, FormGroup, Popover, Glyphicon } from "react-bootstrap";
import Spinner from "react-spinner"
import { getUiOptions, isEmptyString } from "../../utils";
import Context from "../../Context";

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
		renderMetaInfo: (that, input) => {
			const content = that.state.autosuggestSettings.getTaxonCardContent(that);
			return <OverlayTrigger trigger="focus" overlay={content} placement="top">{input}</OverlayTrigger>;
		},
		renderUnsuggestedMetaInfo: (that, input) => {
			const tooltip = (
				<Tooltip id={`${that.props.id}-tooltip`}>{that.props.formContext.translations.UnknownSpeciesName}</Tooltip>
			);
			return (
				<OverlayTrigger overlay={tooltip}>{input}</OverlayTrigger>
			);
		},
		getTaxonCardContent: (that) => {
			const value = that.getValue();

			if (value && (!that.state || !that.state.value || that.state.value !== value)) {
				new ApiClient().fetchCached("/taxa/" + value).then(response => {
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
								<a href={"http://tun.fi/" + value}
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
		},
		renderSuccessGlyph: (that) => {
			const options = getUiOptions(that.props);
			const value = options.hasOwnProperty("value") ? options.value : that.props.value;

			const content = that.state.autosuggestSettings.getTaxonCardContent(that);

			return (
				<a href={"http://tun.fi/" + value} target="_blank">
					<OverlayTrigger overlay={content} placement="right">
						<Glyphicon style={{pointerEvents: "auto"}} glyph="tag" className="form-control-feedback"/>
					</OverlayTrigger>
				</a>
			);
		},
		convertInputValue: that => {
			let value = that.getValue();
			if (isEmptyString(value) || !value.match(/MX\.\d+/)) return new Promise(resolve => resolve(value));
			return new ApiClient().fetchCached("/taxa/" + value).then(({vernacularName, scientificName}) => {
				return vernacularName || scientificName || value;
			});
		},
	},
	friends: {
		query: {
			includeSelf: true,
		},
		renderSuggestion: suggestion => {
			return suggestion.value;
		},
		renderUnsuggestedMetaInfo: (that, input) => {
			const tooltip = (
				<Tooltip id={`${that.props.id}-tooltip`}>{that.props.formContext.translations.UnknownName}</Tooltip>
			)
			return (
				<OverlayTrigger overlay={tooltip}>{input}</OverlayTrigger>
			);
		},
		convertInputValue: that => {
			let value = that.props.value;
			if (isEmptyString(value) || !value.match(/MA\.\d+/)) return new Promise(resolve => resolve(value));
			return new ApiClient().fetchCached("/person/by-id/" + value).then(({fullName}) => {
				return fullName || value;
			});
		},
		renderSuccessGlyph: () => {
			return <Glyphicon glyph="user" />
		}
	}
}

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
		this.globalContext = new Context();
	}

	componentWillReceiveProps(props) {
		this.setState(this.getStateFromProps(props), () => {
			this.triggerConvert(this.props);
		});
	}

	getStateFromProps = (props) => {
		const options = getUiOptions(props);
		const {autosuggestField} = options;
		return {autosuggestSettings: autosuggestSettings[autosuggestField]};
	}

	componentDidMount() {
		this.mounted = true;
		this.triggerConvert(this.props);
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	triggerConvert = (props) => {
		const {isValueSuggested} = getUiOptions(this.props);
		if (props.value === undefined || props.value === "") {
			this.setState({inputValue: undefined});
			return;
		}
		const convert = this.state.autosuggestSettings.convertInputValue;
		if (convert) {
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
		const {autosuggestField} = getUiOptions(this.props);

		this.setState({isLoading: true});
		(() => {
			let timestamp = Date.now();
			this.promiseTimestamp = timestamp;
			this.get = this.apiClient.fetchCached("/autocomplete/" + autosuggestField,
				{q: value, ...(this.state.autosuggestSettings.query || {})})
				.then( suggestions => {
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
		const {onSuggestionSelected} = getUiOptions(this.props);
		this.suggestionSelectedFlag = true;
		let state = {inputInProgress: false, unsuggested: false, inputValue: (suggestion !== undefined && suggestion !== null) ? suggestion.value : ""};
		if (onSuggestionSelected) {
			onSuggestionSelected(suggestion);
		} else {
			this.props.onChange(suggestion.key);
		}
		this.setState(state);
	}

	onSuggestionSelected = (e, {suggestion, method}) => {
		e.preventDefault();
		if (method === "click") {
			this.globalContext.focusNextInput();
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
		return suggestions.find(suggestion => (suggestion && suggestion.value === this.state.inputValue));
	}

	onBlur = (e, {focusedSuggestion}) => {
		if (this.onTabBlur) {
			this.onTabBlur = false;
			return;
		}

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

	onKeyDown = (e) => {
		if (e.key === "Enter") {
			const unambigiousSuggestion = this.findUnambigiousSuggestion(this.state.suggestions);
			if (unambigiousSuggestion) this.selectSuggestion(unambigiousSuggestion);
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
			onBlur: this.onBlur,
			onKeyDown: this.onKeyDown
		};

		if (inputProps.value === undefined || inputProps.value === null) inputProps.value = "";

		let cssClasses = {
			suggestionsContainer: "dropdown-menu bootstrap3 react-selectize simple-select",
			suggestionsList: "list-group",
			containerOpen: "open",
			suggestion: "option-wrapper",
			suggestionFocused: "option-wrapper highlight"
		};

		const InputMetaInfo = ({children, className}) => {
			return (<div className={"input-meta" + (className ? " " + className : "")}>{children}</div>)
		}

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

		const input = (
			<FormGroup validationState={validationState}>
				<FormControl type="text" {...inputProps}/>
				{!this.state.focused && !this.state.isLoading ?
					<FormControl.Feedback>{
						validationState === "success" && this.state.autosuggestSettings.renderSuccessGlyph ?
							this.state.autosuggestSettings.renderSuccessGlyph(this) : null
					}</FormControl.Feedback> :
					null
				}
			</FormGroup>
		);

		if (value && !this.state.unsuggested && this.state.autosuggestSettings.renderMetaInfo) {
			return this.state.autosuggestSettings.renderMetaInfo(this, input);
		} else if (value && this.state.unsuggested && this.state.autosuggestSettings.renderUnsuggestedMetaInfo) {
			return this.state.autosuggestSettings.renderUnsuggestedMetaInfo(this, input);
		} else {
			return input;
		}
	}
}

