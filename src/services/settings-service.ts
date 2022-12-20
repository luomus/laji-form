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
				return {...settings, [key]: settingSavers[key]()};
			} catch (e) {
				// Swallow failing settings parsing.
			}
			return settings;
		}, this.settings);
	}

	onSettingsChange = (global = false) => {
		const settings = this.getSettings(global);
		if (!equals(this.settings, settings)) {
			this.settings = settings;
			this._onSettingsChange(settings, global);
		}
	}
}
