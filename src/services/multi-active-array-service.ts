export type SetAccordionOpenHandler = (open: boolean) => Promise<void> | void;

export default class MultiActiveArrayService {
	private setOpenHandlers: {[id: string]: SetAccordionOpenHandler[]} = {};

	constructor() {
		this.openAll = this.openAll.bind(this);
		this.closeAll = this.closeAll.bind(this);
	}

	addSetOpenHandler(id: string, fn: SetAccordionOpenHandler) {
		if (!this.setOpenHandlers[id]) this.setOpenHandlers[id] = [];
		this.setOpenHandlers[id].push(fn);
	}

	removeSetOpenHandler(id: string, fn: SetAccordionOpenHandler) {
		if (!this.setOpenHandlers[id]) {
			console.warn(`laji-form warning: removing set accordion open handler that isn't registered for id ${id}.`);
			return;
		}
		this.setOpenHandlers[id] = this.setOpenHandlers[id].filter(_fn => fn !== _fn);
	}

	openAll() {
		this.setAllOpen(true);
	}

	closeAll() {
		this.setAllOpen(false);
	}

	private setAllOpen(open: boolean) {
		Object.keys(this.setOpenHandlers).forEach(id => {
			return (this.setOpenHandlers[id] || []).forEach((fn) => {
				fn(open);
			});
		});
	}
}
