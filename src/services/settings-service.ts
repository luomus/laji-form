import { FieldProps, WidgetProps } from "../types";
import { parseJSONPointer } from "../utils";
const equals = require("deep-equal");

export type Settings = Record<string, string>;
type OnSettingsChange = (settings: Record<string, string>, global: boolean) => void;

/**
 * Handles parsing settings from uiSchema. Settings can be either global or form specific (it's up to the client using LajiForm to pass the global or form specific settings).
 */
export default class SettingsService {
	public settings: Settings = {};

	private settingSavers: {[key: string]: () => any} = {};
	private globalSettingSavers: {[key: string]: () => any} = {} as any;
	private _onSettingsChange: OnSettingsChange;

	constructor(onSettingsChange: OnSettingsChange, settings: Settings = {}) {
		this._onSettingsChange = onSettingsChange;
		this.settings = settings;
	}

	addSettingSaver = (key: string, fn: () => any, global = false) => {
		const settingSavers = global ? this.globalSettingSavers : this.settingSavers;
		settingSavers[key] = fn;
	};

	removeSettingSaver = (key: string, global = false) => {
		const settingSavers = global ? this.globalSettingSavers : this.settingSavers;
		delete settingSavers[key];
	};

	setSettings(settings: Settings = {}) {
		this.settings = settings;
	}

	getSettings(global = false) {
		const settingSavers = global ? this.globalSettingSavers : this.settingSavers;
		return Object.keys(settingSavers).reduce((settings, key) => {
			try {
				const value = settingSavers[key]();
				if (value === undefined) { // skip, or JSON parse will error.
					return settings;
				}
				return {...settings, [key]: value};
			} catch (e) {
				// Swallow failing settings parsing.
			}
			return settings;
		}, {});
	}

	onSettingsChange = (global = false) => {
		const settings = this.getSettings(global);
		if (!equals(this.settings, settings)) {
			this.settings = settings;
			this._onSettingsChange(settings, global);
		}
	}

	/**
	 * Should be binded at React Class Component constructor. The component will unbind automatically when unmounted.
	 * Hooks into the component React hooks componentDidMount, componentWillUnmount & componentDidUpdate.
	 *
	 * @param that this of the React component
	 * @param props The constructor props
	 */
	bind<P extends (FieldProps<any> | WidgetProps)> (that: React.Component<P>, props: P) {
		this.loadContextSettings(props, props.formContext.globals);
		that.state = this.loadStateSettings(props, that.state);

		const componentDidMount = that.componentDidMount;
		const componentWillUnmount = that.componentWillUnmount;
		const componentDidUpdate = that.componentDidUpdate;

		that.componentDidMount = () => {
			componentDidMount?.call(that);
			this.updateSettingSaver(that);
		};

		that.componentWillUnmount = () => {
			componentWillUnmount?.call(that);
			(that.props.uiSchema?.["ui:settings"] || []).forEach((key: string) => {
				this.removeSettingSaver(this.getSettingsKey(that.props as P, key));
			});
		};

		that.componentDidUpdate = (prevProps, prevState) => {
			componentDidUpdate?.call(that, prevProps, prevState);
			if (that.props.uiSchema && (that.props.uiSchema["ui:settings"] || []).some((key: string) => {
				if (key.match(/^%/)) key = (key.match(/^%([^/]*)/) as string[])[1];
				return (!equals(...[prevState, that.state].map(state => parseJSONPointer(state, key, !!"safely"))));
			})) {
				this.onSettingsChange();
			}
		};
	}

	private loadStateSettings<P extends FieldProps | WidgetProps>(props: P, state: any) {
		return this.loadSettings(props, state, /^((?!%))/);
	}

	loadContextSettings<P extends FieldProps | WidgetProps>(props: P, context: any) {
		return this.loadSettings(props, context, /^%/);
	}

	private loadSettings<P extends (FieldProps | WidgetProps)>(props: P, target: any = {}, rule: RegExp) {
		const {uiSchema, formContext} = props;

		if (!uiSchema?.["ui:settings"]) {
			return target;
		}

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
		return target;
	}

	// JSON Parsing will throw exceptions for paths that aren't initialized. This is intentional -
	// we don't want to save undefined values for settings that are not set.
	updateSettingSaver<P extends (FieldProps | WidgetProps)>(that: React.Component<P>): void {
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

		(that.props.uiSchema?.["ui:settings"] || []).forEach((key: string) => {
			this.addSettingSaver(this.getSettingsKey<P>(that.props, key), () => {
				if (key.match(/^%/)) {
					return parseSettingSaver(that.props.formContext.globals, key.replace(/^%[^/]*/, ""));
				} else {
					return parseSettingSaver(that.state, key);
				}
			});
		});
	}

	// Settings are hashed with setting id, field id, field name and the options path. Settings id is optional, all the others are automatically read.
	private getSettingsKey<P extends (FieldProps | WidgetProps)>(props: P, key: string) {
		const id = this.getIdSchemaId(props);
		//const id = this.props.idSchema?.$id || this.props.id;
		const {uiSchema} = props;
		const settingsId = uiSchema && uiSchema["ui:settingsId"] !== undefined ? uiSchema["ui:settingsId"] : "";

		if (key.match(/^%/)) {
			return key;
		} else {
			return `${settingsId}#${id}$${uiSchema["ui:field"]}${key}`;
		}
	}

	private getIdSchemaId<P extends (FieldProps | WidgetProps)>(props: P) {
		return (props as any).idSchema ? (props as any).idSchema.$id : props.id;
	}
}
