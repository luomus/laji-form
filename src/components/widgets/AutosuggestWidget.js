import * as React from "react";
import { findDOMNode } from "react-dom";
import * as PropTypes from "prop-types";
import Spinner from "react-spinner";
import { isEmptyString, stringifyKeyCombo, dictionarify, triggerParentComponent, getUiOptions, classNames } from "../../utils";
import { FetcherInput, TooltipComponent, OverlayTrigger, Button, GlyphButton } from "../components";
import ReactContext from "../../ReactContext";
import { InformalTaxonGroupChooser, getInformalGroups } from "./InformalTaxonGroupChooserWidget";

function renderFlag(suggestion, prepend) {
	return (suggestion || {}).finnish
		? <React.Fragment>{prepend || null}<img src="https://cdn.laji.fi/images/icons/flag_fi_small.png" width="16"/></React.Fragment>
		: null;
}

export default class _AutosuggestWidget extends React.Component {
	static propTypes = {
		schema: PropTypes.shape({
			type: PropTypes.oneOf(["string"])
		}).isRequired,
		value: PropTypes.string
	};

	render() {
		if (this.props.options) {
			switch (this.props.options.autosuggestField) {
			case "taxa":
			case "taxon":
				return <TaxonAutosuggestWidget {...this.props} options={ { ...this.props.options, autosuggestField: "taxa" } } />;
			case "unit":
				return <UnitAutosuggestWidget {...this.props} basePath="/shorthand/unit/trip-report" />;
			case "friends":
			case "person":
				return <FriendsAutosuggestWidget {...this.props} options={ { ...this.props.options, autosuggestField: "persons" } }/>;
			case "persons":
				return <FriendsAutosuggestWidget {...this.props} />;
			case "organization":
				return <OrganizationAutosuggestWidget {...this.props} />;
			case "collection":
				return <CollectionAutosuggestWidget {...this.props} />;
			case "dataset":
				return <DatasetAutosuggestWidget {...this.props} />;
			default: 
				return <RangeAutosuggestWidget {...this.props} />;
			}
		}
		return <Autosuggest {...this.props} />;
	}

	formatValue(value, options, parentProps) {
		if (options) {
			let component = undefined;
			switch (options.autosuggestField) {
			case "taxon":
			case "taxa":
				component = TaxonAutosuggestWidget;
				break;
			case "unit":
				component = UnitAutosuggestWidget;
				break;
			case "friends":
			case "person":
			case "persons":
				component = FriendsAutosuggestWidget;
				break;
			case "organization":
				component = OrganizationAutosuggestWidget;
				break;
			case "collection":
				component = CollectionAutosuggestWidget;
				break;
			case "dataset":
				component = DatasetAutosuggestWidget;
				break;
			default:
				component = RangeAutosuggestWidget;
			}
			if (component) {
				return <SimpleValueRenderer component={component} value={value} formContext={parentProps.formContext} />;
			}
		}
	}
}

class SimpleValueRenderer extends React.Component {
	constructor(props) {
		super(props);
		this.state = {inputValue: this.props.value, loading: true};
	}
	componentDidMount() {
		const {getSuggestionFromValue, isValueSuggested} = this.props.component.prototype;
		if (getSuggestionFromValue && isValueSuggested) {
			this.isValueSuggested = isValueSuggested.bind(this);
			getSuggestionFromValue.call(this, this.props.value).then((suggestion) => {
				this.setState({inputValue: suggestion.value, loading: false});
			}).catch(() => this.setState({loading: false}));
		}
	}
	render() {
		return this.state.loading ? <Spinner /> : <span>{this.state.inputValue}</span>;
	}

}

function TaxonAutosuggest(ComposedComponent) {
	return class TaxonAutosuggestWidget extends ComposedComponent {
		static contextType = ReactContext;

		constructor(props) {
			super(props);
			this.getSuggestionFromValue = this.getSuggestionFromValue.bind(this);
			this.isValueSuggested = this.isValueSuggested.bind(this);
			if (super.renderSuggestion) {
				this.renderSuggestion = super.renderSuggestion.bind(this);
			} else {
				this.renderSuggestion = this.renderSuggestion.bind(this);
			}
		}

		componentDidMount() {
			this.mounted = true;
		}

		componentWillUnmount() {
			this.mounted = false;
		}

		componentDidUpdate(prevProps) {
			const {value, options = {}} = this.props;
			if (value !== prevProps.value && options.getSuggestionFromValue && options.chooseImages) {
				options.getSuggestionFromValue(value).then(suggestion => {
					if (!this.mounted) return;
					const found = this.parseChooseImages(options.chooseImages).find(({id}) => suggestion.key === id);
					this.setState({chooseImages: found ? [found] : undefined});
				});
			}
		}

		async getSuggestionFromValue(value) {
			if (this.isValueSuggested(value)) {
				const {vernacularName, scientificName} = await this.props.formContext.apiClient.get(`/taxa/${id}`);
				if (vernacularName !== undefined) {
					return {value: vernacularName, key: value};
				}
				if (scientificName !== undefined) {
					return {value: scientificName, key: value};
				}
			} else {
				throw new Error("Unknown taxon");
			}
		}

		isValueSuggested(value) {
			return !isEmptyString(value) && !!value.match(/MX\.\d+/);
		}

		parseInputValue(inputValue) {
			return inputValue.replace(/ sp(\.|p)?\.?$/, "");
		}

		renderSuccessGlyph = () => {
			const {Glyphicon} = this.context.theme;
			return <Glyphicon style={{pointerEvents: "none"}} glyph="ok" className="form-control-feedback"/>;
		};

		renderSuggestion(suggestion) {
			const renderedSuggestion = "autocompleteDisplayName" in suggestion
				&& <span dangerouslySetInnerHTML={{__html: suggestion.autocompleteDisplayName}} />
				|| <React.Fragment>{suggestion.value}{renderFlag(suggestion)}</React.Fragment>;
			return <span className="simple-option">{renderedSuggestion}</span>;
		}

		parseChooseImages = (chooseImages) => {
			return chooseImages.map(taxonIDOrObj => typeof taxonIDOrObj === "string" ? {id: taxonIDOrObj} : taxonIDOrObj);
		};

		renderChooseImages = () => {
			const chooseImages = this.state && this.state.chooseImages || this.props.options.chooseImages;
			const {orWriteSpeciesNameLabel} = getUiOptions(this.props);
			const {or} = this.props.formContext.translations;
			const {Row, Col} = this.context.theme;
			return (
				<Row>
					<Col xs={12}>
						<div className="laji-form-medias">
							{this.parseChooseImages(chooseImages).map(taxonIDObj =>
								<TaxonImgChooser id={taxonIDObj.id}
								                 key={taxonIDObj.id}
								                 url={taxonIDObj.url}
								                 onSelect={this.onTaxonImgSelected}
								                 formContext={this.props.formContext}/>
							)}
						</div>
					</Col>
					<Col xs={12}>
						<label>{or} {orWriteSpeciesNameLabel || this.props.formContext.translations.orWriteSpeciesName}</label>
					</Col>
				</Row>
			);
		};

		onTaxonImgSelected = (taxonID, taxon) => {
			this.autosuggestRef.selectSuggestion({
				key: taxonID,
				value: taxon.vernacularName,
				...taxon
			});
		};

		setAutosuggestRef = (elem) => {
			this.autosuggestRef = elem;
		};

		render() {
			const {props} = this;

			const {options: propsOptions, ...propsWithoutOptions} = props;

			const options = {
				getSuggestionFromValue: this.getSuggestionFromValue,
				isValueSuggested: this.isValueSuggested,
				Wrapper: TaxonWrapper,
				renderSuccessGlyph: this.renderSuccessGlyph,
				renderSuggestion: this.renderSuggestion,
				parseInputValue: this.parseInputValue
			};
			const _options = {
				...options,
				...propsWithoutOptions,
				...(propsOptions || {}),
				query: {
					...(options.query || {}),
					...(propsWithoutOptions.query || {}),
					...(propsOptions.query || {}),
				}
			};

			if (propsOptions.chooseImages && !(props.value && props.formContext.uiSchemaContext.isEdit)) {
				_options.renderExtra = this.renderChooseImages;
			}

			return <Autosuggest ref={this.setAutosuggestRef} {..._options}/>;
		}
	};
}

@TaxonAutosuggest
class TaxonAutosuggestWidget extends React.Component {}

@TaxonAutosuggest
class UnitAutosuggestWidget extends React.Component {
	constructor(props) {
		super(props);
		this.renderSuggestion = this.renderSuggestion.bind(this);
	}
	renderSuggestion(suggestion) {
		const {count, maleIndividualCount, femaleIndividualCount} = suggestion.interpretedFrom;
		const [countElem, maleElem, femaleElem] = [count, maleIndividualCount, femaleIndividualCount].map(val => 
			val && <span className="text-muted">{val}</span>
		);
		const taxonName = suggestion.unit.identifications[0].taxon;
		const name = suggestion.isNonMatching
			? <span className="text-muted">{taxonName} <i>({this.props.formContext.translations.unknownSpeciesName})</i></span>
			: taxonName;
		return <span>{countElem}{countElem && " "}{name}{maleElem && " "}{maleElem}{femaleElem && " "}{femaleElem}{renderFlag(suggestion)}</span>;
	}
}

class FriendsAutosuggestWidget extends React.Component {
	static contextType = ReactContext;

	constructor(props) {
		super(props);
		this.getSuggestionFromValue = this.getSuggestionFromValue.bind(this);
		this.isValueSuggested = this.isValueSuggested.bind(this);
	}

	async getSuggestionFromValue(value) {
		const {showID} = getUiOptions(this.props);
		const {isAdmin} = this.props.formContext.uiSchemaContext;
		if (this.isValueSuggested(value)) {
			const {fullName, group, id} = await this.props.formContext.apiClient.get(`/person/${value}`);
			if (fullName) {
				const addGroup = str => group ? `${str} (${group})` : str;
				const addID = str => isAdmin && showID ? `${str} (${id})` : str;
				return {
					value: addID(addGroup(fullName)),
					key: value
				};
			}
		} else {
			throw new Error("Unknown friend");
		}
	}

	prepareSuggestion = (suggestion) => {
		const {isAdmin} = this.props.formContext.uiSchemaContext;
		const {showID} = getUiOptions(this.props);
		return isAdmin && showID
			? {...suggestion, value: `${suggestion.value} (${suggestion.key})`}
			: suggestion;
	};

	isValueSuggested(value) {
		return !isEmptyString(value) && value.match(/MA\.\d+/);
	}

	findExactMatch = (suggestions, inputValue) => {
		return suggestions.find(suggestion => (suggestion && suggestion.value.toLowerCase() === inputValue.trim().toLowerCase()));
	};

	renderSuccessGlyph = () => {
		const {Glyphicon} = this.context.theme;
		return (
			<Glyphicon style={{pointerEvents: "none"}}
			           glyph="user"
			           className="form-control-feedback"/>
		);
	};

	render() {
		const {options: propsOptions, ...propsWithoutOptions} = this.props;

		const options = {
			query: {
				includeSelf: true,
				...propsOptions.queryOptions
			},
			getSuggestionFromValue: this.getSuggestionFromValue,
			isValueSuggested: this.isValueSuggested,
			Wrapper: FriendsWrapper,
			renderSuccessGlyph: this.renderSuccessGlyph,
			findExactMatch: this.findExactMatch,
			prepareSuggestion: this.prepareSuggestion
		};

		return <Autosuggest {...options} {...propsWithoutOptions} {...propsOptions} />;
	}
}

class OrganizationAutosuggestWidget extends React.Component {
	static contextType = ReactContext;

	render() {
		return (
			<BasicAutosuggestWidget
				{...this.props}
				{...this.props.options}
				nameField={"fullName"}
				validValueRegexp={"MOS.\\d+"}
				cache={false}
				Wrapper={OrganizationWrapper}
			></BasicAutosuggestWidget>
		);
	}
}

class CollectionAutosuggestWidget extends React.Component {
	static contextType = ReactContext;

	render() {
		return (
			<BasicAutosuggestWidget
				{...this.props}
				{...this.props.options}
				nameField={"collectionName"}
				validValueRegexp={"HR.\\d+"}
				cache={false}
				Wrapper={CollectionWrapper}
			></BasicAutosuggestWidget>
		);
	}
}

class DatasetAutosuggestWidget extends React.Component {
	static contextType = ReactContext;

	render() {
		return (
			<BasicAutosuggestWidget
				{...this.props}
				{...this.props.options}
				nameField={"datasetName"}
				validValueRegexp={"GX.\\d+"}
				cache={false}
				Wrapper={DatasetWrapper}
			></BasicAutosuggestWidget>
		);
	}
}

class BasicAutosuggestWidget extends React.Component {
	static contextType = ReactContext;

	static propTypes = {
		autosuggestField: PropTypes.string.isRequired,
		allowNonsuggestedValue: PropTypes.bool,
		onSuggestionSelected: PropTypes.func,
		onUnsuggestedSelected: PropTypes.func,
		onInputChange: PropTypes.func,
		uiSchema: PropTypes.object,
		nameField: PropTypes.string,
		validValueRegexp: PropTypes.string,
		cache: PropTypes.bool,
		Wrapper: PropTypes.object
	};

	static defaultProps = {
		nameField: "name",
		validValueRegexp: "",
		cache: true
	};

	constructor(props) {
		super(props);
		this.getSuggestionFromValue = this.getSuggestionFromValue.bind(this);
		this.isValueSuggested = this.isValueSuggested.bind(this);
	}

	async getSuggestionFromValue(value) {
		const { autosuggestField, nameField } = this.props;
		if (this.isValueSuggested(value)) {
			const result = await this.props.formContext.apiClient.get(`/${autosuggestField}/by-id/${value}`, undefined, this.props.cache);
			if (result[nameField]) {
				return {
					value: result[nameField],
					key: value
				};
			}
		} else {
			throw new Error("Not autosuggested value");
		}
	}

	isValueSuggested(value) {
		const regexp = new RegExp(this.props.validValueRegexp);
		return !isEmptyString(value) && value.match(regexp);
	}

	findExactMatch = (suggestions, inputValue) => {
		return suggestions.find(suggestion => (suggestion && suggestion.value.toLowerCase() === inputValue.trim().toLowerCase()));
	};

	render() {
		const options = {
			query: {
				includeSelf: true,
				...this.props.queryOptions
			},
			getSuggestionFromValue: this.getSuggestionFromValue,
			isValueSuggested: this.isValueSuggested,
			Wrapper: this.props.Wrapper,
			findExactMatch: this.findExactMatch
		};

		return <Autosuggest {...options} {...this.props} />;
	}
}

class RangeAutosuggestWidget extends React.Component {
	render() {
		const {options: propsOptions, ...propsWithoutOptions} = this.props;
		return <Autosuggest highlightFirstSuggestion={true} {...propsWithoutOptions} {...propsOptions} />;
	}
}

export class Autosuggest extends React.Component {
	static contextType = ReactContext;

	static propTypes = {
		autosuggestField: PropTypes.string,
		allowNonsuggestedValue: PropTypes.bool,
		onSuggestionSelected: PropTypes.func,
		onUnsuggestedSelected: PropTypes.func,
		onInputChange: PropTypes.func,
		uiSchema: PropTypes.object,
		informalTaxonGroups: PropTypes.string,
		onInformalTaxonGroupSelected: PropTypes.func,
		cache: PropTypes.bool
	};

	static defaultProps = {
		allowNonsuggestedValue: true,
		suggestionReceive: "key",
		cache: true
	};

	isValueSuggested = (props) => {
		const {isValueSuggested, suggestionReceive, onSuggestionSelected} = props;
		if (!onSuggestionSelected && suggestionReceive !== "key") return undefined;
		return isValueSuggested ? isValueSuggested(props.value) : undefined;
	};

	wrapperRef = React.createRef();

	constructor(props) {
		super(props);
		const isSuggested = this.isValueSuggested(props);
		this.state = {
			isLoading: false,
			suggestions: [],
			focused: false,
			inputValue: props.value !== undefined ? props.value : "",
			suggestion: isSuggested ? {} : undefined,
		};
		this.apiClient = this.props.formContext.apiClient;
	}

	componentDidMount() {
		this.mounted = true;
		this.triggerConvert(this.props);
		this.props.formContext.services.keyHandler.addKeyHandler(this.props.id, this.keyFunctions);
	}

	componentWillUnmount() {
		this.mounted = false;
		this.props.formContext.services.keyHandler.removeKeyHandler(this.props.id, this.keyFunctions);
	}

	componentDidUpdate(prevProps) {
		if (!this.props.controlledValue && this.state.suggestion && this.props && prevProps.value !== this.props.value && this.props.value !== this.state.suggestionForValue) {
			this.props.getSuggestionFromValue(this.props.value).then(suggestion => {
				this.setState({inputValue: this.getSuggestionValue(suggestion), suggestion});
			}, () => {
				this.setState({inputValue: "", suggestion: undefined});
			});
		}
	}

	keyFunctions = {
		autosuggestToggle: () => {
			if (this.props.onToggle) {
				this.onToggle();
				return true;
			}
			return false;
		}
	};

	triggerConvert = (props) => {
		const {value, getSuggestionFromValue} = props;
		if (isEmptyString(value) || !getSuggestionFromValue) {
			if (this.state.suggestion && Object.keys(this.state.suggestion).length > 0) {
				this.setState({suggestion: undefined, inputValue: value, suggestionForValue: value});
			}
			return;
		}

		this.setState({isLoading: true});
		getSuggestionFromValue(value).then(suggestion => {
			if (!this.mounted) return;
			this.setState({suggestion, inputValue: this.getSuggestionValue(suggestion), isLoading: false, suggestionForValue: value});
		}).catch(() => {
			if (!this.mounted) return;
			this.setState({isLoading: false});
		});
	};

	getSuggestionValue = (suggestion) => {
		const {getSuggestionValue} = this.props;
		const def = suggestion.value;
		return getSuggestionValue
			? getSuggestionValue(suggestion, def)
			: def;
	};

	renderSuggestion = (suggestion) => {
		let {renderSuggestion} = this.props;
		if (!renderSuggestion) renderSuggestion = suggestion => suggestion.value;
		return (<span>{renderSuggestion(suggestion)}</span>);
	};

	selectSuggestion = (suggestion) => {
		const {onSuggestionSelected, onChange, suggestionReceive} = this.props;
		const afterStateChange = () => {
			if (onSuggestionSelected) {
				onSuggestionSelected(suggestion, this.mounted);
			} else {
				if (this.mounted) {
					this.setState({suggestionForValue: suggestion[suggestionReceive]}, () => onChange(suggestion[suggestionReceive]));
				} else {
					onChange(suggestion[suggestionReceive]);
				}
			}
		};
		const state = {suggestion, inputValue: this.getSuggestionValue(suggestion)};
		this.mounted
			? this.setState(state, afterStateChange)
			: afterStateChange();
	};

	selectUnsuggested = (inputValue) => {
		if (isEmptyString(inputValue) && isEmptyString(this.props.value)) return;

		const value = !isEmptyString(inputValue) ? inputValue : undefined;

		const {onUnsuggestedSelected, onChange} = this.props;

		const afterStateChange = () => {
			onUnsuggestedSelected ?
				onUnsuggestedSelected(value) :
				onChange(value);
		};

		const state = {inputValue, suggestion: undefined, suggestionForValue: inputValue};
		this.mounted
			? this.setState(state, afterStateChange)
			: afterStateChange();
	};

	onSuggestionSelected = (suggestion) => {
		this.selectSuggestion(suggestion);
	};

	onUnsuggestedSelected = (inputValue) => {
		this.selectUnsuggested(inputValue);
	};

	findExactMatch = (suggestions, inputValue = "") => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		const {findExactMatch} = this.props;
		return findExactMatch
			? findExactMatch(suggestions, inputValue)
			: suggestions.find(suggestion => (suggestion && suggestion.value.toLowerCase() === inputValue.trim().toLowerCase() && !suggestion.isNonMatching));
	};

	findTheOnlyOneMatch = (suggestions) => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		const filtered = suggestions.filter(suggestion => !suggestion || !suggestion.isNonMatching);
		if (filtered.length === 1) {
			return filtered[0];
		}
	};
	
	findNonMatching = (suggestions) => {
		if (!Array.isArray(suggestions)) suggestions = [suggestions];
		const filtered = suggestions.filter(suggestion => suggestion && suggestion.isNonMatching);
		if (filtered.length === 1) {
			return filtered[0];
		}
	};

	onInputChange = (e, reason, callback) => {
		let {value} = e.target;

		if (this.props.inputProps && this.props.inputProps.onChange) {
			e.persist && e.persist();
			value = this.props.inputProps.onChange(e, reason, callback);
		} 
		this.setState({inputValue: value}, callback);
	};

	onSuggestionsFetchRequested = ({value}, debounce = true) => {
		if (value === undefined || value === null) value = "";
		value = this.props.parseInputValue ? this.props.parseInputValue(value) : value;
		if (value.length < (this.props.minFetchLength !== undefined ? this.props.minFetchLength : 2)) {
			this.setState({suggestions: []});
			return;
		}	

		const {autosuggestField, query = {}} = this.props;

		this.setState({isLoading: true});

		const request = async () => {
			let timestamp = Date.now();
			this.promiseTimestamp = timestamp;
			try {
				let suggestionsResponse = await this.apiClient.get(this.props.basePath || "/autocomplete" + "/" + autosuggestField,
					{ query: {
						query: value,
						matchType: "exact,partial",
						includeHidden: false,
						...query
					} },
					this.props.cache
				);
				// Hack for laji-form in Kotka, since it uses API that isn't laji-api and might have different response signature.
				let suggestions = Array.isArray(suggestionsResponse) ? suggestionsResponse : suggestionsResponse.results;
				if (this.props.prepareSuggestion) {
					suggestions = suggestions.map(s => this.props.prepareSuggestion(s));
				}
				if (timestamp !== this.promiseTimestamp) {
					return;
				}
				this.mounted
					? this.setState({isLoading: false, suggestions}, () => this.afterBlurAndFetch(suggestions))
					: this.afterBlurAndFetch(suggestions);
			} catch (e) {
				this.mounted
					? this.setState({isLoading: false}, this.afterBlurAndFetch)
					: this.afterBlurAndFetch();
			}
		};

		if (this.timeout) {
			clearTimeout(this.timeout);
		}
		if (debounce) {
			this.timeout = this.props.formContext.setTimeout(request, 100);
		} else {
			request();
		}
	};

	onFocus = (e) => {
		this.setState({focused: true});
		triggerParentComponent("onFocus", e, this.props.inputProps);
	};

	onBlur = (e) => {
		this.setState({focused: false}, () => {
			this._valueForBlurAndFetch = this.state.inputValue;
			this.afterBlurAndFetch(this.state.suggestions);
			triggerParentComponent("onBlur", e, this.props.inputProps);
			const overlay = this.wrapperRef.current;
			if (overlay && overlay.overlayTriggerRef && overlay.overlayTriggerRef.hide) {
				setTimeout(() => {
					overlay && overlay.overlayTriggerRef && overlay.overlayTriggerRef.hide();
				}, 1);
			}
		});
	};

	afterBlurAndFetch = (suggestions, callback) => {
		const {inputValue = ""} = this.state;
		const {_valueForBlurAndFetch = ""} = this;
		if (this.mounted
			&& (this.state.focused || this._valueForBlurAndFetch === undefined || this.state.isLoading)
			|| (this.props.controlledValue && _valueForBlurAndFetch !== this.state.inputValue)
		) {
			return;
		}
		const parsedInputValue = this.props.parseInputValue ? this.props.parseInputValue(inputValue) : inputValue;

		const {selectOnlyOne, selectOnlyNonMatchingBeforeUnsuggested = true, informalTaxonGroups, informalTaxonGroupsValue, allowNonsuggestedValue} = this.props;

		const exactMatch = this.findExactMatch(suggestions, parsedInputValue);
		const onlyOneMatch = selectOnlyOne ? this.findTheOnlyOneMatch(suggestions) : undefined;
		const nonMatching = selectOnlyNonMatchingBeforeUnsuggested ? this.findNonMatching(suggestions) : undefined;
		const valueDidntChangeAndHasInformalTaxonGroup = this.props.value === inputValue && informalTaxonGroups && informalTaxonGroupsValue && informalTaxonGroupsValue.length;

		if (this.highlightedSuggestionOnBlur) {
			this.selectSuggestion(this.highlightedSuggestionOnBlur);
		} else if (onlyOneMatch) {
			this.selectSuggestion(onlyOneMatch);
		}	else if (exactMatch) {
			this.selectSuggestion({...exactMatch, value: inputValue});
		}	else if (nonMatching && !valueDidntChangeAndHasInformalTaxonGroup) {
			this.selectSuggestion(nonMatching);
		} else if (!valueDidntChangeAndHasInformalTaxonGroup && allowNonsuggestedValue) {
			this.selectUnsuggested(parsedInputValue);
		} else if (!allowNonsuggestedValue) {
			this.setState({inputValue: ""}, () => this.props.onChange && this.props.onChange(undefined));
		}

		callback && callback();
	};

	render() {
		const {props} = this;
		let {suggestions, inputValue = ""} = this.state;

		const inputProps = {
			id: this.props.id,
			value: inputValue,
			disabled: props.disabled || props.readonly,
			placeholder: props.placeholder,
			...(this.props.inputProps || {}),
			onChange: this.onInputChange,
			onBlur: this.onBlur,
			onFocus: this.onFocus,
			autoComplete: "off"
		};

		let cssClasses = {
			suggestionsContainer: "rw-popup-container rw-popup-transition",
			suggestionsContainerOpen: "rw-popup",
			suggestionsList: "rw-list",
			suggestion: "rw-list-option",
			suggestionHighlighted: "rw-list-option rw-state-focus rw-state-selected"
		};

		const highlightFirstSuggestion = "highlightFirstSuggestion" in this.props
			? this.props.highlightFirstSuggestion
			: !this.props.allowNonsuggestedValue;

		const {renderExtra} = props;

		return <>
			{renderExtra && renderExtra()}
			<div className={classNames("autosuggest-wrapper", props.wrapperClassName)}>
				<ReactAutosuggest
					id={`${this.props.id}-autosuggest`}
					inputProps={inputProps}
					renderInputComponent={this.renderInput}
					suggestions={suggestions}
					renderSuggestion={this.renderSuggestion}
					onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
					onSuggestionsClearRequested={this.onSuggestionsClearRequested}
					onSuggestionSelected={this.onSuggestionSelected}
					onUnsuggestedSelected={this.onUnsuggestedSelected}
					highlightFirstSuggestion={highlightFirstSuggestion}
					suggestionsOpenOnFocus={!this.isSuggested()}
					theme={cssClasses}
					formContext={this.props.formContext}
					ref={this.setRef}
				/>
			</div>
		</>;
	}

	setRef = (elem) => {
		this.autosuggestRef = elem;
	};

	onInformalTaxonGroupsOpened = (open) => {
		this.setState({informalTaxonGroupsOpen: open});
	};

	onInformalTaxonGroupSelected = (id) => {
		this.setState({informalTaxonGroupsOpen: false});
		this.props.onInformalTaxonGroupSelected && this.props.onInformalTaxonGroupSelected(id);
	};

	onInformalTaxonGroupHide = () => {
		this.setState({informalTaxonGroupsOpen: false});
	};

	onToggle = () => {
		if (!this.mounted) return;
		this.props.onToggle(!this.props.toggled);
		setTimeout(() => this.props.formContext.utils.focusById(this.props.id), 1); // Refocus input
	};

	onKeyDown = this.props.formContext.utils.keyboardClick(this.onToggle);

	isSuggested = () => {
		const {suggestion} = this.state;
		return !!suggestion && this.isValueSuggested(this.props);
	};

	renderInput = (inputProps) => {
		let {value, renderSuccessGlyph, informalTaxonGroups, renderInformalTaxonGroupSelector = true, taxonGroupID, onToggle, displayValidationState = true, Wrapper} = this.props;
		let validationState = null;
		const {translations, lang} = this.props.formContext;
		const {suggestion} = this.state;
		const {Glyphicon} = this.context.theme;

		const isSuggested = this.isSuggested();

		if (displayValidationState && !isEmptyString(value) && isSuggested !== undefined) {
			validationState = isSuggested ? "success" : "warning";
		}

		const getGlyphNameFromState = (state) => {
			switch (state) {
			case "success":
				return "ok";
			case "warning":
				return "warning-sign";
			case "error":
				return "remove";
			default:
				return "";
			}
		};

		const getGlyph = (state) => {
			if (!displayValidationState) {
				return null;
			}

			const glyph = getGlyphNameFromState(state);

			return glyph ? (
				<Glyphicon
					key={glyph}
					style={{pointerEvents: "none"}}
					glyph={glyph}
					className="form-control-feedback"
				/>
			) : null;
		};

		let glyph = undefined;

		if (!this.state.focused && !this.state.isLoading && (!onToggle || !this.state.focused)) {
			glyph = (validationState === "success" && renderSuccessGlyph) ?
				renderSuccessGlyph(value) : getGlyph(validationState);
		}

		const addon = informalTaxonGroups && renderInformalTaxonGroupSelector
			? <InformalTaxonGroupsAddon key="informal"
					                        taxonGroupID={taxonGroupID} 
				                          onClear={this.onInformalTaxonGroupSelected} 
				                          open={this.state.informalTaxonGroupsOpen}
				                          onOpen={this.onInformalTaxonGroupsOpened} 
			                            onToggle={onToggle}
				                          formContext={this.props.formContext} /> 
			: null;

		const getTogglerTooltip = () => {
			const {toggleable} = getUiOptions(this.props.uiSchema);
			let tooltip = typeof toggleable.tooltip === "string"
				? toggleable.tooltip
				: `${translations[this.props.toggled ? "StopShorthand" :  "StartShorthand"]}. ${translations.ShorthandHelp}`;

			if (tooltip === "") {
				return tooltip;
			}

			const {shortcuts} = this.props.formContext.services.keyHandler;
			Object.keys(shortcuts).some(keyCombo => {
				if (shortcuts[keyCombo].fn == "autosuggestToggle") {
					tooltip = `[${stringifyKeyCombo(keyCombo)}]: ${tooltip}`;
					return true;
				}
			});
			return tooltip;
		};

		const getToggleGlyph = () => {
			const {toggleable} = getUiOptions(this.props.uiSchema);
			const props = {
				className: classNames("autosuggest-input-addon", "power-user-addon", this.props.toggled && "active"),
				onMouseDown: this.onToggle,
				onKeyDown: this.onKeyDown
			};

			if (toggleable && toggleable.glyphClass) {
				return (
					<Button {...props}>
						<span className={toggleable.glyphClass} />
					</Button>
				);
			}

			return <GlyphButton glyph="flash" {...props} />;
		};

		const toggler = onToggle
			? (
				<TooltipComponent tooltip={getTogglerTooltip()} key="toggler">
					{getToggleGlyph()}
				</TooltipComponent>
			) : null;

		const {inputValue = ""} = this.state;
		const input = (
			<FetcherInput 
				value={inputValue}
				glyph={glyph} 
				loading={this.state.isLoading} 
				validationState={validationState} 
				extra={[addon, toggler]}
				{...inputProps} 
			/>
		);
		let component = input;
		if (displayValidationState && Wrapper) {
			component = (
				<Wrapper isSuggested={isSuggested}
			           suggestion={suggestion}
			           options={getUiOptions(this.props)}
			           id={this.props.id}
			           value={suggestion && suggestion.key}
			           inputValue={value}
				         ref={this.wrapperRef}
			           formContext={this.props.formContext}>
					{component}
				</Wrapper>
			);
		}
		if (informalTaxonGroups) {
			component = (
				<React.Fragment>
					{component}
					{this.state.informalTaxonGroupsOpen && <InformalTaxonGroupChooser modal={true} onHide={this.onInformalTaxonGroupHide} onSelected={this.onInformalTaxonGroupSelected} formContext={this.props.formContext} lang={lang} />}
				</React.Fragment>
			);
		}
		return component;
	};
}

class _TaxonWrapper extends React.Component {
	static contextType = ReactContext;

	constructor(props) {
		super(props);
		this.state = {converted: false};
	}

	componentDidMount() {
		this.mounted = true;
		this.fetch(this.props.value);
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	UNSAFE_componentWillReceiveProps({value}) {
		this.fetch(value);
	}

	async fetch(value) {
		if (!value) { 
			this.setState({scientificName: "", cursiveName: false});
		} else {
			this.props.formContext.apiClient.get(`/taxa/${value}`).then(({scientificName, cursiveName, vernacularName, taxonRank, informalGroups, finnish}) => {
				if (!this.mounted) return;
				this.setState({value, taxonRank, informalTaxonGroups: informalGroups, taxon: {scientificName, vernacularName, cursiveName, finnish}});

				getInformalGroups(this.props.formContext.apiClient).then(({informalTaxonGroupsById}) => {
					if (!this.mounted) return;
					this.setState({informalTaxonGroupsById});
				});
			});
			const parents = (await this.props.formContext.apiClient.get(`/taxa/${value}/parents`)).results;
			if (!this.mounted) return;
			const state = {order: undefined, family: undefined};
			for (let parent of parents) {
				const {vernacularName, scientificName, cursiveName} = parent;
				if (parent.taxonRank === "MX.order") {
					state.order = {vernacularName, scientificName, cursiveName};
				} else if (parent.taxonRank === "MX.family") {
					state.family = {vernacularName, scientificName, cursiveName};
				}
				if (state.order && state.family) {
					this.setState(state);
					break;
				}
			}
			this.setState({...state, higherThanOrder: !state.order && !state.family});
			const taxonRanks = await this.props.formContext.apiClient.get("/metadata/ranges/MX.taxonRankEnum");
			if (!this.mounted) return;
			this.setState({taxonRanks: dictionarify(taxonRanks, function getKey(rank) {return rank.id;}, function getValue(rank) {return rank.value;})});
		}
	}

	render() {
		const {id, formContext, value, children, placement, inputValue, isSuggested} = this.props;
		const {
			taxon = {},
			taxonRanks,
			taxonRank,
			order,
			family,
			higherThanOrder,
			informalTaxonGroupsById = {},
			informalTaxonGroups = []
		} = this.state;

		const {Popover, Tooltip} = this.context.theme;

		const tooltipElem = (
			<Tooltip id={`${id}-popover-tooltip`}>
				{formContext.translations.OpenSpeciedCard}
			</Tooltip>
		);

		let imageID = informalTaxonGroups[0];
		if (informalTaxonGroupsById[imageID] && informalTaxonGroupsById[imageID].parent) {
			imageID = informalTaxonGroupsById[imageID].parent.id;
		}

		const loading = !taxonRank || !(order || family || higherThanOrder) || !taxonRanks;

		const popover = isEmptyString(inputValue)
			? <React.Fragment />
			: inputValue && isSuggested === false
				? <Tooltip id={`${this.props.id}-tooltip`}>{this.props.formContext.translations.UnknownName}</Tooltip>
				: (
					<Popover id={`${id}-popover`}>
						<div className={`laji-form taxon-popover informal-group-image ${imageID}`}>
							<div>
								<ReactContext.Provider value={this.context}>
									<OverlayTrigger overlay={tooltipElem}>
										<a href={`http://tun.fi/${value}`} target="_blank" rel="noopener noreferrer">
											<TaxonName {...taxon} /><br />
										</a>
									</OverlayTrigger>
								</ReactContext.Provider>
								<strong>{formContext.translations.taxonomicRank}:</strong> {taxonRanks && taxonRank ? taxonRanks[taxonRank] : ""}<br />
								{!higherThanOrder ? (
									<React.Fragment>
										<strong>{formContext.translations.taxonGroups}:</strong>
										<ul>
											{order && <li><TaxonName {...order} /></li>}
											{family && <li><TaxonName {...family} /></li>}
										</ul>
									</React.Fragment>
								) : <React.Fragment><br /><br /></React.Fragment>}
							</div>
							{loading && <Spinner />}
						</div>
					</Popover>
				);

		return (
			<OverlayTrigger hoverable={true}
			                placement={placement}
			                contextId={this.props.formContext.contextId}
			                overlay={popover}
			                ref={this.props.overlayRef}
			                formContext={this.props.formContext}>
				{children}
			</OverlayTrigger>
		);
	}
}

const TaxonWrapper = React.forwardRef((props, ref) => <_TaxonWrapper {...props} overlayRef={ref} />);

class InformalTaxonGroupsAddon extends React.Component {
	static contextType = ReactContext;

	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount() {
		this.mounted = true;
		getInformalGroups(this.props.formContext.apiClient).then(({informalTaxonGroupsById}) => {
			if (!this.mounted) return;
			this.setState({informalTaxonGroupsById});
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	onClear = (e) => {
		e.stopPropagation();
		if (this.props.onClear) this.props.onClear(undefined);
	};

	toggle = () => {
		if (this.props.onOpen) this.props.onOpen(!this.props.open);
	};


	onKeyDown = this.props.formContext.utils.keyboardClick(this.toggle);

	renderGlyph = () => {
		const {taxonGroupID} = this.props;
		let imageID = taxonGroupID;
		const {informalTaxonGroupsById = {}} = this.state;
		if (informalTaxonGroupsById[taxonGroupID] && informalTaxonGroupsById[taxonGroupID].parent) {
			imageID = informalTaxonGroupsById[taxonGroupID].parent.id;
		}
		const buttonProps = {
			onClick: this.toggle,
			onKeyDown: this.onKeyDown
		};
		return taxonGroupID
			? (
				<span className="btn btn-default informal-taxon-group-chooser-addon active">
					<div>
						<span {...buttonProps} className={`informal-group-image ${imageID}`} />
						<button className="close" onClick={this.onClear}>×</button>
					</div>
				</span>
			) : (
				<GlyphButton {...buttonProps} glyph="menu-hamburger" className="autosuggest-input-addon informal-taxon-group-chooser"/>
			);
	};

	render() {
		if (!this.onKeyDown) { // Context not available before first render, so we initialize the key handler here.
			this.onKeyDown = this.context.utils.keyboardClick(this.toggle);
		}
		return (
			<TooltipComponent tooltip={this.props.taxonGroupID && this.state.informalTaxonGroupsById ? this.state.informalTaxonGroupsById[this.props.taxonGroupID].name : this.props.formContext.translations.PickInformalTaxonGroup}>
				{this.renderGlyph()}
			</TooltipComponent>
		);
	}
}

class TaxonImgChooser extends React.Component {
	static contextType = ReactContext;
	constructor(props) {
		super(props);
		this.state = {};
	}

	componentDidMount(){
		this.mounted = true;
		this.props.formContext.apiClient.get(`/taxa/${this.props.id}`, { query: { includeMedia: true }}).then(taxon => {
			if (!this.mounted) return;

			if (taxon.multimedia && taxon.multimedia.length) {
				const [media] = taxon.multimedia;
				this.setState({
					taxon: taxon,
					thumbnail: this.props.url || media.squareThumbnailURL || media.thumbnailURL,
					large: this.props.url || media.largeURL
				});
			} else {
				this.setState({taxon});
			}
		});
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	showModal = () => {
		this.setState({modal: true});
	};

	hideModal = () => {
		this.setState({modal: false});
	};

	onSelected = () => {
		this.props.onSelect(this.props.id, this.state.taxon);
		this.hideModal();
	};

	render() {
		const {thumbnail, taxon, modal} = this.state;

		const {translations} = this.props.formContext;
		const {Modal} = this.context.theme;
		return (
			<div className="laji-form-medias">
				<div className="taxon-img media-container interactive" style={{backgroundImage: `url(${thumbnail})`}} onClick={this.showModal} tabIndex={0}>
					{!taxon && <div className="media-loading"><Spinner /></div>}
					<span>
						{taxon && taxon.vernacularName || ""}
					</span>
				</div>
				{modal && 
						<Modal dialogClassName="laji-form media-modal" show={true} onHide={this.hideModal}>
							<Modal.Body>
								<img src={this.state.large} />
								<div>
									<h3 className="text-center"><TaxonName {...this.state.taxon} finnish={false} /></h3>
									<Button block onClick={this.onSelected}>{translations.Select}</Button>
									<Button block onClick={this.hideModal}>{translations.Cancel}</Button>
								</div>
							</Modal.Body>
						</Modal>
				}
			</div>
		);
	}
}

const TaxonName = ({scientificName, vernacularName = "", cursiveName, finnish}) => {
	const _scientificName = vernacularName && scientificName
		?  `(${scientificName})`
		: (scientificName || "");
	return (
		<React.Fragment>
			{`${vernacularName}${vernacularName ? " " : ""}`}
			{cursiveName ? <i>{_scientificName}</i> : _scientificName}
			{renderFlag({finnish}, " ")}
		</React.Fragment>
	);
};

class ReactAutosuggest extends React.Component {
	static contextType = ReactContext;
	constructor(props) {
		super(props);
		this.listRef = React.createRef();
		this.state = {
			inputValue: props.inputProps.value
		};
	}

	UNSAFE_componentWillReceiveProps(props) {
		if ("value" in props.inputProps) {
			this.setState({inputValue: props.inputProps.value});
		}
	}

	render() {
		return (
			<div onFocus={this.onContainerFocus} onBlur={this.onContainerBlur}>
				{this.renderInput()}
				{this.renderSuggestions()}
			</div>
		);
	}

	onInputFocus = (e) => {
		this.setState({focused: true, hideSuggestions: false});
		this.requestFetch(this.state.inputValue);
		this.props.inputProps && this.props.inputProps.onFocus && this.props.inputProps.onFocus(e);
	};

	onInputTryBlur = (e) => {
		if (this.suggestionMouseDownFlag) {
			return;
		}
		this.onBlur(e);
	};

	onBlur(e) {
		if (e.relatedTarget && e.relatedTarget === findDOMNode(this.listRef.current)) {
			return;
		}
		const suggestion = (this.props.suggestions || [])[this.state.focusedIdx];
		suggestion && this.onSuggestionSelected(this.props.suggestions[this.state.focusedIdx]);
		this.setState({focused: false, focusedIdx: undefined, touched: false});
		this.props.inputProps?.onBlur?.(e);
	}

	onListBlur = (e) => {
		this.onBlur(e);
	};

	onInputKeyDown = (e) => {
		let state;
		switch (e.key) {
		case "ArrowDown":
			e.preventDefault();
			if (this.state.focusedIdx >= (this.props.suggestions || []).length - 1) {
				break;
			}
			state = {
				focusedIdx: typeof this.state.focusedIdx === "number"
					? this.state.focusedIdx + 1
					: (this.props.suggestions || []).length
						? 0
						: undefined,
				touched: true
			};
			if (state.focusedIdx !== undefined) {
				state.inputValue = this.props.suggestions[state.focusedIdx].value;
			}
			this.setState(state);
			break;
		case "ArrowUp":
			e.preventDefault();
			state = {focusedIdx: this.state.focusedIdx > 0 ? this.state.focusedIdx - 1 : undefined, touched: true};
			if (state.focusedIdx !== undefined) {
				state.inputValue = this.props.suggestions[state.focusedIdx].value;
			}
			this.setState(state);
			break;
		case "Enter":
			if (e.altKey || e.ctrlKey || e.shiftKey) {
				return;
			}
			e.preventDefault();
			this.inputElem.blur();
			this.inputElem.focus();
			break;
		case "Control":
		case "Meta":
		case "Alt":
		case "Shift":
		case "CapsLock":
			break;
		default:
			this.setState({touched: true});
		}
		this.props.inputProps?.onKeyDown?.(e);
	};

	onInputChange = (e) => {
		this._onInputChange(e.target.value, "keystroke");
	};

	_onInputChange = (value, reason) => {
		const callback = reason === "click"
			? () => {}
			: () => this.requestFetch(this.state.inputValue);
		this.props.inputProps && this.props.inputProps.onChange
			? this.props.inputProps.onChange({target: {value}}, reason, callback)
			: this.setState({inputValue: value}, callback);
	};

	setInputRef = (elem) => {
		this.inputElem = findDOMNode(elem);
	};

	renderInput() {
		const {inputProps, renderInputComponent = this.renderDefaultInputComponent} = this.props;
		return renderInputComponent({
			...inputProps,
			value: this.state.inputValue,
			onChange: this.onInputChange,
			onFocus: this.onInputFocus,
			onBlur: this.onInputTryBlur,
			onKeyDown: this.onInputKeyDown,
			ref: this.setInputRef
		});
	}

	renderDefaultInputComponent(props) {
		return <input {...props} />;
	}

	renderSuggestions() {
		if ((!this.props.suggestionsOpenOnFocus && !this.state.touched)
			|| !this.state.focused
			|| this.state.hideSuggestions
			|| !(this.props.suggestions || []).length
		) {
			return null;
		}
		const {suggestion, suggestionsList, suggestionsContainer, suggestionsContainerOpen, suggestionHighlighted} = this.props.theme || {};
		return (
			<div className={classNames(suggestionsContainer, suggestionsContainerOpen)}>
				<ul className={suggestionsList} tabIndex={-1} ref={this.listRef} onBlur={this.onListBlur}>
					{this.props.suggestions.map((s, i) =>
						<li key={i}
						    className={classNames(suggestion, this.state.focusedIdx === i && suggestionHighlighted)}
						    onMouseDown={this.onSuggestionMouseDown}
						    onMouseUp={this.onSuggestionMouseUp}
						    data-idx={i}
						>{this.props.renderSuggestion(s)}</li>
					)}
				</ul>
			</div>
		);
	}

	onSuggestionMouseDown = () => {
		this.suggestionMouseDownFlag = true;
	};

	onSuggestionMouseUp = (e) => {
		this.suggestionMouseDownFlag = false;
		const suggestion = this.getSuggestionFromClick(e);
		this.setState({inputValue: suggestion.value}, () => {
			this._onInputChange(suggestion.value, "click");
			this.onBlur(e);
		});
	};

	getSuggestionFromClick = ({target}) => {
		let idx;
		while (typeof idx !== "string") {
			idx = target.getAttribute("data-idx");
			target = target.parentElement;
		}
		return this.props.suggestions[idx];
	};

	onSuggestionSelected(suggestion) {
		this.setState({inputValue: suggestion.value, hideSuggestions: true});
		this.props.onSuggestionSelected && this.props.onSuggestionSelected(suggestion);
	}

	requestFetch(value) {
		this.props.onSuggestionsFetchRequested({value});
	}
}

const getWrapper = (unknownValueLabel) => React.forwardRef(({formContext, children, id, inputValue, isSuggested}, ref) => {
	const {Tooltip} = React.useContext(ReactContext).theme;
	if (!inputValue || isSuggested) {
		return children;
	}
	const tooltip = (
		<Tooltip id={`${id}-tooltip`}>{formContext.translations[unknownValueLabel]}</Tooltip>
	);
	return (
		<OverlayTrigger overlay={tooltip} placement="top" ref={ref}>{children}</OverlayTrigger>
	);
});

const FriendsWrapper = getWrapper("UnknownName");
const OrganizationWrapper = getWrapper("UnknownOrganization");
const CollectionWrapper = getWrapper("UnknownCollection");
const DatasetWrapper = getWrapper("UnknownTag");
