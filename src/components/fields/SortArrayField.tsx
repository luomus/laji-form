import * as React from "react";
import { getInnerUiSchema, getUiOptions, getUUID } from "../../utils";
import { FieldProps } from "../LajiForm";
import * as memoize from "memoizee";

interface SortCol {
	name: string;
	descending?: boolean;
	compare?: (a: any, b: any) => number;
}


interface State {
	uiSchema?: any;
	sortCols: SortCol[];
}

const getUiShema = memoize((uiSchema: any, sortCols: SortCol[] = []) => ({
	...uiSchema,
	"ui:options": {
		...getUiOptions(uiSchema),
		sortCols
	}
}));

const sort = (sortCols: SortCol[]) => (a: any, b: any) => {
	const defaultSort = (a: any, b: any, sort: SortCol) => {
		const {name, descending} = sort;
		let result;
		if (a[name] < b[name]) {
			result = 1;
		} else if (a[name] > b[name]) {
			result = -1;
		}
		if (result) {
			return descending ? result * -1 : result;
		}
		return 0;
	};

	let result;
	for (const sort of sortCols) {
		result = sort.descending === undefined
			? 0
			: (sort.compare?.(a, b)
				?? defaultSort(a, b, sort)
			) || 0;
		if (result !== 0) {
			break;
		}
	}
	return result;
};

const getSortedData = memoize((props: any, sortCols: SortCol[]) => {
	const formData = props.formData;
	return sortCols.length
		? formData.sort(sort(sortCols))
		: formData;
}, {max: 1});

/**
 * Sorts date according to selected columns. This component provides only the sorting logic,
 * a child component must handle the UI for selecting the sort columns.
 *
 * Can be used only if items are objects (non-objects don't have UUIDs which are used for
 * keeping the original order intact upon changes);
 */
export default class SortArrayField extends React.Component<FieldProps, State> {

	static getName() {return "SortArrayField";}

	state: State = {sortCols: []};

	constructor(props: FieldProps) {
		super(props);
		this.onChange = this.onChange.bind(this);
	}

	static getDerivedStateFromProps(props: any, state: State) {
		return {
			...props,
			sortCols: state.sortCols,
			uiSchema: getUiShema(getInnerUiSchema(props.uiSchema), state.sortCols),
			formData: getSortedData(props, state.sortCols)
		};
	}

	getUiShemaWithOnSortToggle = memoize((uiSchema: any) => ({
		...uiSchema,
		"ui:options": {
			...getUiOptions(uiSchema),
			onSortToggle: this.onSortToggle.bind(this)
		}
	}))

	onSortToggle(name: string, compare: SortCol["compare"]) {
		const {sortCols: _sortCols = []} = this.state || {};
		const sortCols = [..._sortCols];
		const colSortIdx = sortCols.findIndex(s => s.name === name);
		const current = sortCols[colSortIdx];
		const nextDescending = current?.descending === undefined
			? true
			: current.descending
				? false
				: undefined;
		if (nextDescending === undefined) {
			sortCols.splice(current ? colSortIdx : sortCols.length, 1);
		} else {
			const sortCol = {name, descending: nextDescending, compare};
			sortCols.splice(current ? colSortIdx : sortCols.length, 1, sortCol);
		}
		const stateWithUpdatedSortCols = {sortCols};
		this.setState(SortArrayField.getDerivedStateFromProps(this.props, stateWithUpdatedSortCols));
	}

	onChange(formData: any) {
		if (!this.state.sortCols.length) {
			this.props.onChange(formData);
			return;
		} else {
			const origIdToIdx = this.props.formData.reduce((idToIdx: Record<string, number>, item: any, idx: number) => {
				idToIdx[getUUID(item)] = idx;
				return idToIdx;
			}, {} as Record<string, number>);
			const sorted = formData.sort((a: any, b: any) => {
				const aIdx = origIdToIdx[getUUID(a)];
				const bIdx = origIdToIdx[getUUID(b)];
				if (aIdx === undefined) {
					return 1;
				} else if (bIdx === undefined) {
					return -1;
				}
				return aIdx - bIdx;
			});
			this.props.onChange(sorted);
		}
	}

	render() {
		const {SchemaField} = this.props.registry.fields;
		return (
			<SchemaField
				{...this.props}
				uiSchema={this.getUiShemaWithOnSortToggle(this.state.uiSchema)}
				onChange={this.onChange}
			/>
		);
	}
}
