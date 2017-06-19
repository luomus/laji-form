import deepEquals from "deep-equal";
import { getReactComponentName, parseJSONPointer } from "../utils";
import Context from "../Context";

/**
 * A base form component that unifies state management and some optimization.
 */
export default function BaseComponent(ComposedComponent) {
	return class BaseComponent extends ComposedComponent {

		static displayName = getReactComponentName(ComposedComponent);

		constructor(props) {
			super(props);
			this.onChange = this.onChange.bind(this);
			if (!this.state && this.getStateFromProps) this.state = this.getStateFromProps(props);
			if (props.uiSchema && props.uiSchema["ui:settings"]) this.state = this.loadSettings(props, this.state);
			this.updateSettingSaver(props);
		}

		loadSettings(props, state = {}) {
			const {uiSchema, formContext} = props;

			if (uiSchema && uiSchema["ui:settings"] && !uiSchema["ui:settings"].used) {
				const settings = formContext.settings || {};
				uiSchema["ui:settings"].forEach(key => {
					if (this.getSettingsKey(props, key) in settings) {
						const last = key.match(/.*\/(.*)/, "$1")[1];
						const withoutLast = key.match(/(.*)\/.*/, "$1")[1];
						const lastContainer = parseJSONPointer(state, withoutLast || "/", !!"safely");
						lastContainer[last] = settings[this.getSettingsKey(props, key)];
					}
				});
			}
			return state;
		}

		// Settings are hashed with setting id, field id, field name and the options path. Settings id is optional, all the others are automatically read.
		getSettingsKey(props, key) {
			const {uiSchema, idSchema: {$id: id}} = props;
			const settingsId = uiSchema && uiSchema["ui:settingsId"] !== undefined ? uiSchema["ui:settingsId"] : "";

			return `${settingsId}#${id}\$${uiSchema["ui:field"]}${key}`;
		}

		componentWillReceiveProps(props) {
			if (this.getStateFromProps) this.setState(this.getStateFromProps(props));
			if (super.componentWillReceiveProps) {
				super.componentWillReceiveProps(props);
			}
			this.updateSettingSaver(props);
		}

		updateSettingSaver(props) {
			if (props.uiSchema) (props.uiSchema["ui:settings"] || []).forEach(key => {
				this.getContext().addSettingSaver(this.getSettingsKey(props, key), () => parseJSONPointer(this.state, key, !!"safely"));
			});
		}

		componentDidUpdate(prevProps, prevState) {
			if (super.componentDidUpdate) {
				super.componentDidUpdate(prevProps, prevState);
			}

			if (this.props.uiSchema) (this.props.uiSchema["ui:settings"] || []).some(key => {
				if (!deepEquals(...[prevState, this.state].map(state => parseJSONPointer(state, key, !!"safely")))) {
					this.getContext().onSettingsChange();
				}
			});
		}

		componentWillUnmount() {
			if (this.props.uiSchema) (this.props.uiSchema["ui:settings"] || []).forEach(key => {
				this.getContext().removeSettingSaver(this.getSettingsKey(this.props, key));
			});
			if (super.componentWillUnmount) super.componentWillUnmount();
		}

		onChange(formData) {
			super.onChange ? super.onChange(formData) : this.props.onChange(formData);
		}

		getContext() {
			return new Context(this.props.formContext.contextId);
		}
	};
}
