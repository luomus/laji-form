/**
 * Keeps track of reserved DOM IDs so that the IDs are rendered only once.
 **/
export default class DOMIdService {
	private ids: {[id: string]: ((id: string) => void)[]} = {};

	// First call returns id, next call (and only the very next) reserves the id until it is released.
	reserve = (id: string, sendId: (id: string) => void): string | void => {
		if (this.ids[id] && this.ids[id].length) {
			this.ids[id].push(sendId);
		} else {
			this.ids[id] = [sendId]; // Just mark that the id is now used. It isn't reserved yet.
			return id;
		}
	};
	release = (id: string, sendId: (id: string) => void) => {
		if (this.ids[id]) {
			const idx = this.ids[id].indexOf(sendId);
			this.ids[id].splice(idx, 1);
			if (this.ids[id].length > 0) {
				this.ids[id][0](id);
			}
		}
	};
}
