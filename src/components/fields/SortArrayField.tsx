import * as React from "react";
import { capitalizeFirstLetter, getInnerUiSchema, getUiOptions, getUUID, isDefaultData } from "../../utils";
import { FormContext } from "../LajiForm";
import memoize from "memoizee";
import ReactContext from "../../ReactContext";
import {TooltipComponent} from "../components";
import { FieldProps, JSONSchemaArray, JSONSchemaObject } from "../../types";
import Spinner from "react-spinner";

interface Options {
	columns?: Record<string, ColumnOptions> | undefined;
	sortableColumns?: string[];
	/**
	 * defaults to false
	 */
	multisort?: boolean;
	excludeSortableColumns?: string[];
}

export const colIsLoading = (col: SortCol) => col.compareStrategy && !col.compare;

const colsLoading = (sortCols: SortCol[]) => sortCols.filter(colIsLoading).length > 0;

interface SortCol {
	name: string;
	/**
	 * Undefined if shouldn't sort at all.
	 */
	descending?: boolean;
	/**
	 * Compare function provided by the compare strategy. It can be asynchronously set.
	 * If it returns undefined, comparison will fallback to the default algorithm.
	*/
	compare?: (a: any, b: any, sortCol: SortCol, schema: any) => number | undefined;
	/**
	 * The chosen compare strategy object.
	*/
	compareStrategy: CompareStrategy;
	loading?: boolean;
}

interface State {
	uiSchema?: any;
	sortCols: SortCol[];
}

type DefaultCompareStrategy = {
	strategy: "default";
	noDescending?: boolean;
}

type TaxonomicCompareStrategy = {
	strategy: "taxonomic";
	noDescending?: boolean;
	valueField?: string
	query: {
		informalGroupsFilter?: string
		onlyFinnish?: boolean
	}
}

type CompareStrategy = DefaultCompareStrategy | TaxonomicCompareStrategy;

interface ColumnOptions {
	compareStrategies?: CompareStrategy[];
	tooltip?: string;
}

type ColumnOptionsUIProps = ColumnOptions & {
	field: string;
	updateSortCol: (sortCol: Omit<SortCol, "name">) => void;
	sortCol?: SortCol;
	formContext: FormContext;
}

interface ComparerI {
	initialize?: () => Promise<void>;
	compare(a: any, b: any, sortCol: SortCol, schema: any): number | undefined;
}

abstract class Comparer<T extends CompareStrategy> implements ComparerI {
	protected options: T;
	protected formContext: FormContext;
	protected colName: string;

	constructor(options: T, colName: string, formContext: FormContext) {
		this.options = options;
		this.formContext = formContext;
		this.colName = colName;
	}

	abstract compare(a: any, b: any, sortCol: SortCol, schema: any): number | undefined;
}

class TaxonomicComparer extends Comparer<TaxonomicCompareStrategy> {
	constructor(options: TaxonomicCompareStrategy, colName: string, formContext: FormContext) {
		super(options, colName, formContext);
		this.compare = this.compare.bind(this);
	}

	private idToIdx: Record<string, number>;

	async initialize() {
		this.idToIdx = (await this.formContext.apiClient.get("/taxa", { query: {...this.options.query, pageSize: 10000, selectedFields: "id" } }))
			.results.reduce((idToIdx, {id}: {id: string}, idx: number) => {
				idToIdx[id] = idx;
				return idToIdx;
			}, {} as Record<string, number>);
	}

	compare(a: any, b: any) {
		const aValue = a[this.options.valueField || this.colName];
		const bValue = b[this.options.valueField || this.colName];

		if (this.idToIdx[aValue] === undefined && this.idToIdx[bValue] !== undefined) { 
			return 1;
		} else if (this.idToIdx[aValue] !== undefined && this.idToIdx[bValue] === undefined) {
			return -1;
		// Fall back to default comparison if it's neither are in the taxonomic set.
		} else if (this.idToIdx[aValue] === undefined && this.idToIdx[bValue] === undefined) {
			return undefined;
		}
		return this.idToIdx[aValue] - this.idToIdx[bValue];
	}
}

class DefaultComparer extends Comparer<DefaultCompareStrategy> {
	compare(a: any, b: any, sortCol: SortCol, schema: any) {
		const {name} = sortCol;
		const colSchema = schema.items.properties[name];
		const aValue = getValue(a[name], colSchema);
		const bValue = getValue(b[name], colSchema);
		if (aValue === undefined && bValue !== undefined || aValue < bValue) { 
			return -1;
		} else if (aValue !== undefined && bValue === undefined || aValue > bValue) {
			return 1;
		}
		return 0;
	}
}

const compareStrategyMap: Record<string, typeof DefaultComparer | typeof TaxonomicComparer> = {
	taxonomic: TaxonomicComparer,
	default: DefaultComparer
};
const comparers: Record<string, DefaultComparer | TaxonomicComparer> = {};

const ColumnOptionsUI = ({field, compareStrategies = [], sortCol, updateSortCol, formContext}: ColumnOptionsUIProps) => {
	const {MenuItem, Glyphicon, Dropdown} = React.useContext(ReactContext).theme;

	const selectedStrategy = sortCol?.compareStrategy;
	const selectedStrategyIdx = selectedStrategy ? compareStrategies.indexOf(selectedStrategy) : 0;

	const onClick = React.useCallback((e) => {
		e.stopPropagation();
	}, []);

	const onSelect = React.useCallback((idx: number) => {
		const strategy = compareStrategies[idx];
		updateSortCol({...(sortCol || {}), compareStrategy: strategy});
	}, [compareStrategies, sortCol, updateSortCol]);

	if (!compareStrategies) {
		return null;
	}

	return (
		<TooltipComponent tooltip={formContext.translations["SortStrategies"]} placement="left">
			<Dropdown id={`${field}-column-options`} onClick={onClick} className="laji-form-col-options" pullRight>
				<Dropdown.Toggle noCaret>
					<Glyphicon glyph="cog" />
				</Dropdown.Toggle>
				<Dropdown.Menu onSelect={onSelect}>
					{compareStrategies.map((strategy, i) => {
						const label = formContext.translations[`SortStrategy${capitalizeFirstLetter(strategy.strategy)}`];
						return <MenuItem key={i} eventKey={i} active={selectedStrategyIdx === i}>{label}</MenuItem>;
					})}
				</Dropdown.Menu>
			</Dropdown>
		</TooltipComponent>
	);
};

const getUpdateSortCol = memoize((col: string, sortCols: SortCol[], setSortCols: (sortCols: SortCol[]) => void) => (sortCol: SortCol) => {
	const existingIdx = sortCols.findIndex(c => c.name === col);
	const _sortCols = [...sortCols];
	_sortCols.splice(existingIdx === -1 ? _sortCols.length : existingIdx, 1, {...sortCol, name: col, descending: sortCol.descending});
	setSortCols(_sortCols);
});

const getUI = (
	columns: Record<string, ColumnOptions> | undefined,
	sortCols: SortCol[],
	setSortCols: (sortCols: SortCol[]) => void,
	formContext: FormContext
) => {
	return Object.keys(columns || {}).reduce((fieldToUI, field: string) => {
		fieldToUI[field] = <>
			{colsLoading(sortCols) && <Spinner />}
			{(columns?.[field]?.compareStrategies?.length || 0) > 1 && <ColumnOptionsUI field={field}
				{...columns?.[field]}
				sortCol={sortCols?.find(c => c.name === field)}
				updateSortCol={getUpdateSortCol(field, sortCols, setSortCols)}
				formContext={formContext} />}
		</>;
		return fieldToUI;
	}, {} as Record<string, React.ReactNode>);
};

const getValue = (formData: any, schema: any) => {
	if (schema.oneOf) {
		return schema.oneOf.find(({const: v}: {const: any}) => v === formData)?.title;
	} 
	return formData;
};

const sort = (schema: any, {sortCols}: State, sortTimeIdToSortedIdx: Record<string, number>, sortTimeIdToOrigIdx: Record<string, number>) => (a: any, b: any): number => {

	// Don't sort items that weren't there when the sorting was done.
	// For example when adding a new item to the array, it should be exactly where it is added.
	// const idToOrigIdx = getIdToOrigIdx(formData);
	const aSortedIdx = sortTimeIdToOrigIdx[getUUID(a)!];
	const bSortedIdx = sortTimeIdToOrigIdx[getUUID(b)!];
	if (aSortedIdx === undefined || bSortedIdx === undefined) {
		return sortTimeIdToSortedIdx[getUUID(a)!] - sortTimeIdToSortedIdx[getUUID(b)!];
	}

	const defaultSort = DefaultComparer.prototype.compare;

	let result;
	for (const sortCol of sortCols) {
		result = sortCol.descending === undefined
			? 0
			: (sortCol.compare?.(a, b, sortCol, schema)
				?? defaultSort(a, b, sortCol, schema)
			) || 0;
		if (result !== 0) {
			result = sortCol.descending ? result * -1 : result;
			break;
		}
	}
	return result as number;
};

const getSortedData = memoize((formData: any[], schema: any, state: State, sortTimeIdToSortedIdx: Record<string, number>, sortTimeIdToOrigIdx: Record<string, number>) => {
	return (state.sortCols.length && !colsLoading(state.sortCols))
		? [...formData].sort(sort(schema, state, sortTimeIdToSortedIdx, sortTimeIdToOrigIdx))
		: formData;
}, {max: 1});

const getIdToIdx = (formData: any) => formData.reduce((idToIdx: Record<string, number>, item: any, idx: number) => {
	idToIdx[getUUID(item)!] = idx;
	return idToIdx;
}, {} as Record<string, number>);

// These are otherwise identical, but are memoized against different input.
// Use max 2 because current props / next props might be compared.
const getIdToSortedIdx = memoize((formData: any[]) => getIdToIdx(formData), {max: 2});
const getIdToOrigIdx = memoize((formData: any[]) => getIdToIdx(formData), {max: 2});

/**
 * Sorts date according to selected columns. This component provides only the sorting logic,
 * a child component must handle the UI for selecting the sort columns.
 *
 * Can be used only if items are objects (non-objects don't have UUIDs which are used for
 * keeping the original order intact upon changes);
 */
export default class SortArrayField extends React.Component<FieldProps<JSONSchemaArray<JSONSchemaObject>>, State> {

	state: State = {sortCols: []};

	sortTimeIdToSortedIdx: Record<string, number> = {};
	/**
	 * Id-to-idx mapping when the sorting was touched. Used to sorting newly items where they are put, instead of sorting them according to the sort cols.
	*/
	sortTimeIdToOrigIdx: Record<string, number> = {};

	constructor(props: FieldProps<JSONSchemaArray<JSONSchemaObject>>) {
		super(props);
		props.formContext.services.settings.bind(this, props);
		this.syncColumns();
	}

	componentDidUpdate() {
		this.syncColumns();
	}

	/**
	 * Sort cols might be retrieved from settings JSON, which doesn't hold the 'compare' fn. We add the fn
	 * asynchronously when the  component updates according to the comparison strategy name.
	 */
	syncColumns() {
		const {sortCols} = this.state;
		sortCols.forEach(sortCol => {
			const {compareStrategy} = sortCol;
			if (sortCol.compare) {
				return;
			}

			const finish = (comparer: TaxonomicComparer) => {
				const descending = sortCol?.descending === undefined
					? true
					: sortCol?.descending;
				this.updateSortCol({...(sortCol || {}), compareStrategy, compare: comparer.compare, descending});
			};

			const comparer = comparers[compareStrategy.strategy];
			if (!comparer) {
				comparers[compareStrategy.strategy] = new compareStrategyMap[compareStrategy.strategy](compareStrategy as any, sortCol.name, this.props.formContext);
				const instance = comparers[compareStrategy.strategy];
				if ((instance as any).initialize) {
					(instance as any).initialize().then(() => finish(instance as any));
				} else {
					finish(instance as any);
				}
			} else {
				finish(comparer as any);
			}
		});
	}

	getUiShema(props: FieldProps<JSONSchemaArray<JSONSchemaObject>>, {sortCols}: State, sortedData: any[]) {
		const idToSortedIdx = getIdToSortedIdx(sortedData);
		const idToOrigIdx = getIdToSortedIdx(props.formData);
		const nextComponentUiSchema = getInnerUiSchema(props.uiSchema);
		const uiOptions: Options = getUiOptions(props.uiSchema);
		return {
			...nextComponentUiSchema,
			"ui:options": {
				...getUiOptions(nextComponentUiSchema),
				onSortToggle: this.onSortToggle.bind(this),
				sortCols,
				ui: getUI(uiOptions.columns, sortCols, this.setSortCols.bind(this), props.formContext),
				sortableColumns: this.getSortableColumns(props),
				sortColTooltips: Object.keys(uiOptions.columns || {})?.reduce<Record<string, string>>((map, c) => {
					const {tooltip} = uiOptions.columns?.[c] || {};
					if (tooltip) {
						map[c] = tooltip;
					}
					return map;
				}, {}),
				idxMap: Object.keys(idToOrigIdx).reduce((map, id) => {
					map[idToSortedIdx[id] as any] = idToOrigIdx[id];
					map["_" + idToOrigIdx[id] as any] = idToSortedIdx[id];
					return map;
				}, {} as Record<string, number>)
			}
		};
	}

	getSortableColumns(props: FieldProps<JSONSchemaArray<JSONSchemaObject>>) {
		const {uiSchema, schema} = props;
		const {sortableColumns, excludeSortableColumns} = getUiOptions(uiSchema) as Options;
		if (sortableColumns) {
			if (excludeSortableColumns) {
				return sortableColumns.filter(c => !excludeSortableColumns.includes(c));
			}
			return sortableColumns;
		}
		if (excludeSortableColumns) {
			return Object.keys(schema.items.properties).filter(c => !excludeSortableColumns.includes(c));
		}
		return undefined;
	}

	getNextComponentProps(props: any, state: State) {
		const sortedFormData = getSortedData(props.formData || [], props.schema, state, this.sortTimeIdToSortedIdx, this.sortTimeIdToOrigIdx);
		return {
			uiSchema: this.getUiShema(props, state, sortedFormData),
			formData: sortedFormData,
			onChange: this.onChange
		};
	}

	updateSortCol(sortCol: SortCol) {
		const existingIdx = this.state.sortCols.findIndex(c => c.name === sortCol.name);
		const _sortCols = [...this.state.sortCols];
		_sortCols.splice(existingIdx === -1 ? _sortCols.length : existingIdx, 1, sortCol);
		this.setSortCols(_sortCols);
	}

	setSortCols(sortCols: SortCol[]) {
		this.sortTimeIdToSortedIdx = {};
		this.sortTimeIdToOrigIdx = getIdToOrigIdx(this.props.formData);
		this.setState({sortCols});
	}

	onSortToggle(name: string) {
		const {sortCols: _sortCols = []} = this.state || {};
		const sortCols = [..._sortCols];
		const colSortIdx = sortCols?.findIndex(s => s.name === name);
		const current = sortCols[colSortIdx];
		const options = getUiOptions(this.props.uiSchema) as Options;
		const {multisort} = options;
		const colOptions = options.columns?.[name] || {};

		const compareStrategy = current?.compareStrategy || colOptions.compareStrategies?.[0] || {strategy: "default"};

		const {noDescending} = compareStrategy;
		const nextDescending = current?.descending === undefined
			? false
			: current.descending
				? undefined
				: noDescending ? undefined : true;
		const sortCol = {
			...(current || {}),
			compareStrategy,
			name,
			descending: nextDescending,
		};

		if (!multisort) {
			this.setSortCols([sortCol]);
			return;
		}

		if (current && current.descending === undefined) { // Push to end if the "descending" changes from undefined.
			sortCols.splice(colSortIdx, 1);
			sortCols.push(sortCol);
		} else { // Replace current with new
			sortCols.splice(current ? colSortIdx : sortCols.length, 1, sortCol);
		}

		this.setSortCols(sortCols);
	}

	// Note: if next component hard sorts the data, this won't work with that.
	// Probably not a common use case to have both hard/soft sorting.
	onChange = (formData: any[]) => {
		if (!this.state.sortCols.length) {
			this.props.onChange(formData);
			return;
		} else {
			const idToOrigIdx = getIdToOrigIdx(this.props.formData);
			this.sortTimeIdToSortedIdx = getIdToSortedIdx(formData);

			const existingItems: any[] = [];
			const newItems: any[] = [];

			let prevUUID: string | number = -1; // Start with UUID that won't match any item.
			const UUIDToPrev: Record<string, number | string> = {};
			formData.forEach(i => {
				const uuid = getUUID(i);
				if (idToOrigIdx[uuid!] !== undefined) {
					existingItems.push(i);
				} else {
					newItems.push(i);
					UUIDToPrev[uuid!] = prevUUID;
				}
				prevUUID = uuid as number | string;
			});

			const sortedToOriginal = existingItems.sort((a: any, b: any) => {
				const aIdx = idToOrigIdx[getUUID(a)!];
				const bIdx = idToOrigIdx[getUUID(b)!];
				return aIdx - bIdx;
			});

			newItems.forEach(item => {
				const uuid = getUUID(item);
				const precedingUUID = UUIDToPrev[uuid!];
				const precedingOriginalIdx = sortedToOriginal.findIndex((i) => getUUID(i) === precedingUUID);
				const precedingSortedIdx = this.sortTimeIdToSortedIdx[getUUID(item)!];
				// Detect whether i's a new empty item. If it is, put it to the end of the original array.
				// Otherwise (it's e.g. a copied item), put it in the original array after the preceding item of the sorted order.
				if (precedingSortedIdx === sortedToOriginal.length && isDefaultData(item, this.props.schema.items)) {
					sortedToOriginal.push(item);
				} else {
					sortedToOriginal.splice(precedingOriginalIdx + 1, 0, item);
				}
			});
			this.props.onChange(sortedToOriginal);
		}
	};

	render() {
		const SchemaField = this.props.registry.fields.SchemaField as any; // TODO as any
		const nextProps = this.getNextComponentProps(this.props, this.state);
		return (
			<SchemaField
				{...this.props}
				{...nextProps}
				onChange={this.onChange}
			/>
		);
	}
}
