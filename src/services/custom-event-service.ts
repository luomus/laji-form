type CustomEventListener = (data?: any, callback?: () => void) => boolean | void;

/**
 * A service for sending events outside DOM.
 */
export default class CustomEventService {

	eventListeners: {[eventName: string]: {[id: string]: CustomEventListener[]}} = {};

	add(id: string, eventName: string, fn: CustomEventListener) {
		if (!this.eventListeners[eventName]) this.eventListeners[eventName] = {};
		if (!this.eventListeners[eventName][id]) this.eventListeners[eventName][id] = [];
		this.eventListeners[eventName][id].push(fn);
	}

	remove(id: string, eventName: string, fn: CustomEventListener) {
		this.eventListeners[eventName][id] = this.eventListeners[eventName][id].filter(_fn => _fn !== fn);
	}

	send(id: string, eventName: string, data?: any, callback?: () => void, {bubble = true} = {}) {
		const ids = Object.keys(this.eventListeners[eventName] || {}).filter(_id => id.startsWith(_id)).sort().reverse();

		outer: for (let _id of ids) {
			for (let listener of this.eventListeners[eventName][_id]) {
				const result = listener(data, callback);
				if (!bubble) break outer;
				if (result === true || result === undefined) {
					return;
				}
			}
		}
		callback && callback();
	}
}
