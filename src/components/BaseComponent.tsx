const deepEquals = require("deep-equal");
import { getReactComponentName, parseJSONPointer, getUUID as _getUUID } from "../utils";
import { FieldProps, WidgetProps } from "./LajiForm";
import { SubmitHook } from "../services/submit-hook-service";

type Constructor<T> = new(...args: any[]) => T;

interface LajiFormComponentForBaseComponent<P, S> extends React.Component<P, S> {
	getStateFromProps?(props: P): S;
	UNSAFE_componentWillReceiveProps?(props: Readonly<P>, nextContext?: any): void;
	onChange?(formData: any): void;
}

export function BaseComponent<P extends FieldProps | WidgetProps, S, LFC extends Constructor<LajiFormComponentForBaseComponent<P, S>>>(ComposedComponent: LFC) {
	return class BaseComponent extends ComposedComponent {

		static displayName = getReactComponentName(ComposedComponent);

		constructor(...args: any[]) {
			const props: P = args[0];
			super(props);
			this.onChange = this.onChange.bind(this);
			if (props.uiSchema && props.uiSchema["ui:settings"]) this.loadGlobalSettings(props, this.getGlobals());
			if (!this.state && this.getStateFromProps) this.state = this.getStateFromProps(props);
			if (props.uiSchema && props.uiSchema["ui:settings"]) this.state = this.loadStateSettings(props, this.state);
		}

		loadSettings(props: P, target: any = {}, rule: RegExp) {
			const {uiSchema, formContext} = props;

			if (uiSchema?.["ui:settings"]) {
				const {settings} = formContext.services.settings;
				uiSchema["ui:settings"].forEach((key: string) => {
					if (this.getSettingsKey(props, key) in settings) {
						if (key.match(rule)) {
							const last = key.match(/.*\/(.*)/)?.[1] ?? "";
							const withoutLastMatch = key.match(/^(%[^/]+)?(\/.*)\/.*$/);
							const withoutLast = withoutLastMatch ? withoutLastMatch[2] : "/";
							const lastContainer = parseJSONPointer(target, withoutLast || "/", "createParents");
							lastContainer[last] = JSON.parse(JSON.stringify(settings[this.getSettingsKey(props, key)]));
						}
					}
				});
			}
			return target;
		}

		loadGlobalSettings(props: P, context: any) {
			return this.loadSettings(props, context, /^%/);
		}

		loadStateSettings(props: P, state: S) {
			return this.loadSettings(props, state, /^((?!%))/);
		}

		// Settings are hashed with setting id, field id, field name and the options path. Settings id is optional, all the others are automatically read.
		getSettingsKey(props: P, key: string) {
			const id = this.getIdSchemaId(this.props);
			//const id = this.props.idSchema?.$id || this.props.id;
			const {uiSchema} = props;
			const settingsId = uiSchema && uiSchema["ui:settingsId"] !== undefined ? uiSchema["ui:settingsId"] : "";

			if (key.match(/^%/)) {
				return key;
			} else {
				return `${settingsId}#${id}$${uiSchema["ui:field"]}${key}`;
			}
		}

		UNSAFE_componentWillReceiveProps(props: Readonly<P>, nextContext: any) {
			if (super.UNSAFE_componentWillReceiveProps) {
				super.UNSAFE_componentWillReceiveProps(props, nextContext);
			} else if (this.getStateFromProps) {
				const state = this.getStateFromProps(props);
				if (state) this.setState(state);
			}
			this.updateSettingSaver(props);
		}

		// JSON Parsing will throw exceptions for paths that aren't initialized. This is intentional -
		// we don't want to save undefined values for settings that are not set.
		updateSettingSaver(props: P) {
			function parseSettingSaver(target: any, key: string) {
				const splits = key.split("/");
				const last = splits.pop() || "";

				const lastContainer = parseJSONPointer(target, splits.join("/"));

				if (lastContainer && last in lastContainer) {
					return lastContainer[last];
				} else {
					throw new Error("Setting saver parsing failed");
				}
			}

			if (props.uiSchema) (props.uiSchema["ui:settings"] || []).forEach((key: string) => {
				this.props.formContext.services.settings.addSettingSaver(this.getSettingsKey(props, key), () => {
					if (key.match(/^%/)) {
						return parseSettingSaver(this.getGlobals(), key.replace(/^%[^/]*/, ""));
					} else {
						return parseSettingSaver(this.state, key);
					}
				});
			});
		}

		componentDidUpdate(prevProps: Readonly<P>, prevState: S) {
			if (super.componentDidUpdate) {
				super.componentDidUpdate(prevProps, prevState);
			}

			if (this.props.uiSchema && (this.props.uiSchema["ui:settings"] || []).some((key: string) => {
				if (key.match(/^%/)) key = (key.match(/^%([^/]*)/) as string[])[1];
				return (!deepEquals(...[prevState, this.state].map(state => parseJSONPointer(state, key, !!"safely"))));
			})) {
				this.props.formContext.services.settings.onSettingsChange();
			}
		}

		componentDidMount() {
			this.updateSettingSaver(this.props);
			if (super.componentDidMount) super.componentDidMount();
		}

		componentWillUnmount() {
			(this.props.uiSchema?.["ui:settings"] || []).forEach((key: string) => {
				this.props.formContext.services.settings.removeSettingSaver(this.getSettingsKey(this.props, key));
			});
			if (super.componentWillUnmount) super.componentWillUnmount();
		}

		onChange(formData: any) {
			super.onChange ? super.onChange(formData) : this.props.onChange(formData);
		}

		getGlobals() {
			return this.props.formContext.globals;
		}

		getUUID() {
			return _getUUID((this.props as any)?.formData) || this.props.formContext._parentLajiFormId || "root";
		}

		getIdSchemaId(props: P) {
			return (props as any).idSchema ? (props as any).idSchema.$id : props.id;
		}

		addSubmitHook(hook: SubmitHook["hook"]) {
			const id = this.getUUID();
			const idSchemaId = this.getIdSchemaId(this.props);
			const relativePointer = this.props.formContext.services.ids.getRelativePointer(idSchemaId, id);
			return this.props.formContext.services.submitHooks.add(id, relativePointer, hook);
		}
	} as any;
}

export default BaseComponent;
