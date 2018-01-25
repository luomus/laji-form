import deepEquals from "deep-equal";
import { getReactComponentName, parseJSONPointer } from "../utils";
import Context from "../Context";

/**
 * A base form component that unifies state management and some optimization.
 * Handles also loading settings & triggering settings change.
 */
export default function BaseComponent(ComposedComponent) {
	return class BaseComponent extends ComposedComponent {

		static displayName = getReactComponentName(ComposedComponent);

		constructor(props) {
			super(props);
			this.onChange = this.onChange.bind(this);
			if (props.uiSchema && props.uiSchema["ui:settings"]) this.loadContextSettings(props, this.getContext());
			if (!this.state && this.getStateFromProps) this.state = this.getStateFromProps(props);
			if (props.uiSchema && props.uiSchema["ui:settings"]) this.state = this.loadStateSettings(props, this.state);
		}

		loadSettings(props, target, rule) {
			const {uiSchema, formContext} = props;

			if (uiSchema && uiSchema["ui:settings"]) {
				const settings = formContext.settings || {};
				uiSchema["ui:settings"].forEach(key => {
					if (this.getSettingsKey(props, key) in settings) {
						if (key.match(rule)) {
							const last = key.match(/.*\/(.*)/, "$1")[1];
							const withoutLastMatch = key.match(/^(%[^/]+)?(\/.*)\/.*$/);
							const withoutLast = withoutLastMatch ? withoutLastMatch[2] : "/";
							const lastContainer = parseJSONPointer(target, withoutLast || "/", "createParents");
							lastContainer[last] = settings[this.getSettingsKey(props, key)];
						}
					}
				});
			}
			return target;
		}

		loadContextSettings(props, context) {
			return this.loadSettings(props, context, /^%/);
		}

		loadStateSettings(props, state = {}) {
			return this.loadSettings(props, state, /^((?!%))/);
		}

		// Settings are hashed with setting id, field id, field name and the options path. Settings id is optional, all the others are automatically read.
		getSettingsKey(props, key) {
			const {uiSchema, idSchema: {$id: id}} = props;
			const settingsId = uiSchema && uiSchema["ui:settingsId"] !== undefined ? uiSchema["ui:settingsId"] : "";

			if (key.match(/^%/)) {
				return key;
			} else {
				return `${settingsId}#${id}$${uiSchema["ui:field"]}${key}`;
			}
		}

		componentWillReceiveProps(props) {
			super.componentWillReceiveProps && super.componentWillReceiveProps(props);
			if (this.getStateFromProps) {
				const state = this.getStateFromProps(props);
				if (state) this.setState(state);
			}
			this.updateSettingSaver(props);
		}

		// JSON Parsing will throw exceptions for paths that aren't initialized. This is intentional -
		// we don't want to save undefined values for settings that are not set.
		updateSettingSaver(props) {
			function parseSettingSaver(target, key) {
				const splits = key.split("/");
				const last = splits.pop();

				const lastContainer = parseJSONPointer(target, splits.join("/"));

				if (lastContainer && last in lastContainer) {
					return lastContainer[last];
				} else {
					throw new Error("Setting saver parsing failed");
				}
			}

			if (props.uiSchema) (props.uiSchema["ui:settings"] || []).forEach(key => {
				this.getContext().addSettingSaver(this.getSettingsKey(props, key), () => {
					if (key.match(/^%/)) {
						key = key.replace(/^%[^/]*/, "");
						return parseSettingSaver(this.getContext(), key);
					} else {
						return parseSettingSaver(this.state, key);
					}
				});
			});
		}

		componentDidUpdate(prevProps, prevState) {
			if (super.componentDidUpdate) {
				super.componentDidUpdate(prevProps, prevState);
			}

			if (this.props.uiSchema && (this.props.uiSchema["ui:settings"] || []).some(key => {
				if (key.match(/^%/)) key = key.match(/^%([^/]*)/)[1];
				if (!deepEquals(...[prevState, this.state].map(state => parseJSONPointer(state, key, !!"safely")))) {
					return true;
				}
			})) {
				this.getContext().onSettingsChange();
			}
		}

		componentDidMount() {
			this.updateSettingSaver(this.props);
			if (super.componentDidMount) super.componentDidMount();
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
