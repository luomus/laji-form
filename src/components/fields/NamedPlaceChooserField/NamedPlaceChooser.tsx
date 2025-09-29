import * as React from "react";
import { findDOMNode } from "react-dom";
import Spinner from "react-spinner";
import ReactContext from "../../../ReactContext";
import { Map } from "../MapArrayField";
import { NORMAL_COLOR, ACTIVE_COLOR } from "@luomus/laji-map/lib/globals";
import { SearchableDrowndown } from "../../widgets/SelectWidget";
import { ByLang, FormContext } from "../../LajiForm";
import type { DataOptions as LajiMapData } from "@luomus/laji-map/lib/defs";
import { Popup } from "./Popup";
import memoize from "memoizee";
import type { components } from "generated/api.d";
type NamedPlace = components["schemas"]["namedPlace"];

type Props = {
	places: NamedPlace[];
	failed?: boolean;
	formContext: FormContext;
	onSelected: (place: NamedPlace) => void;
	onDeleted: (place: NamedPlace, callback: () => void) => void;
}

type State = {
	deleting?: boolean;
	popupIdx?: number;
}

export class NamedPlaceChooser extends React.Component<Props, State> {
	static contextType = ReactContext;

	popupRef = React.createRef<{elem: HTMLElement, button: HTMLElement}>();
	popupContainerRef = React.createRef<HTMLDivElement>();
	mapRef = React.createRef<any>();

	idxToLayer?: Record<string, any>;
	geometryCollectionData?: { geoData: any };

	constructor(props: Props) {
		super(props);
		this.state = {};
	}

	onPlaceSelected = (place: NamedPlace) => {
		this.props.onSelected(place);
	};

	onPlaceDeleted = (place: NamedPlace) => {
		const onDelete = () => {
			(this.mapRef.current as any).map.map.closePopup();
			this.setState({deleting: false, popupIdx: undefined});
		};
		this.setState({deleting: true});
		this.props.onDeleted(place, onDelete);
	};

	onSelectChange = (idx: number | undefined) => {
		if (idx === undefined) {
			return;
		}
		const {map} = this.mapRef.current as any;
		const layers = this.idxToLayer![idx];
		const [layer] = layers;
		const bounds = map.getBoundsForLayers(layers);
		const center = bounds.getCenter();
		map.fitBounds(bounds, {animate: false});
		layer.fire("click", {latlng: center});
	};

	componentDidUpdate(_: Props, prevState: State) {
		const {map} = this.mapRef.current as any;
		this.idxToLayer = (map.data as any[]).reduce((idxToLayer, item) => {
			const layerGroup = item.group;
			layerGroup.eachLayer((layer: any) => {
				if (!idxToLayer[layer.feature.properties.idx]) {
					idxToLayer[layer.feature.properties.idx] = [];
				}
				idxToLayer[layer.feature.properties.idx].push(layer);
			});
			return idxToLayer;
		}, {} as Record<string, any>);

		if (this.state.popupIdx !== prevState.popupIdx) {
			const prevLayers = this.idxToLayer![prevState.popupIdx as any] || [];
			const layers = this.idxToLayer![this.state.popupIdx as any] || [];

			[prevLayers, layers].forEach(layers => {
				layers.forEach((layer: any) => {
					if (layer) {
						map.setLayerStyle(layer, this.getFeatureStyle({feature: layer.feature}));
					}
				});
			});
		}
	}

	getFeatureStyle = (data: any) => {
		const {feature = {}} = data || {};
		function getColor(idx: number) {
			const r = NORMAL_COLOR.substring(1,3);
			const g = NORMAL_COLOR.substring(3,5);
			const b = NORMAL_COLOR.substring(5,7);
			return [r, g, b].reduce((rgb, hex) => {
				const decimal = parseInt(hex, 16);
				const amount = 40;
				const _decimal = (idx % 2) ? decimal : Math.min(decimal + amount, 255);
				return rgb + _decimal.toString(16);
			}, "#");
		}

		const {idx} = feature.properties || {};
		const color = idx === this.state.popupIdx ? ACTIVE_COLOR : getColor(idx);
		return {color, fillColor: color};
	};

	getPopup = ({feature}: any, givePopupToLajiMap: (element: HTMLElement) => void) => {
		const { elem, button } = this.popupRef.current!;
		const {idx} = feature.properties;
		this.setState({popupIdx: idx});
		givePopupToLajiMap(elem);
		this.props.formContext.setTimeout(() => (findDOMNode(button) as HTMLElement).focus());
	};

	onPopupClose = () => {
		this.popupContainerRef.current!.appendChild(findDOMNode(this.popupRef.current!.elem) as HTMLElement);
	};

	getEnumOptions = memoize((places: NamedPlace[], translations: ByLang) => ({
		placeholder:  `${translations.SelectPlaceFromList}...`,
		enumOptions: (places || []).map((place, idx) => {
			return {value: idx, label: place.name};
		})
	}));

	render() {
		const {places, failed, formContext: {translations}} = this.props;
		
		const {Alert} = this.context.theme;
		if (failed) {
			return <Alert variant="danger">{`${translations.NamedPlacesFetchFail} ${translations.TryAgainLater}`}</Alert>;
		} else {
			let pointer = 1;
			const data: LajiMapData[] = (places || []).reduce((data, place, i) => {
				const {geometry}  = place;
				let isCollection = false;
				if (geometry.type === "GeometryCollection") {
					isCollection = true;
				}
				if (isCollection) {
					data[pointer] = {
						geoData: {type: "FeatureCollection", features: (geometry as any).geometries.map((geom: any) => {return {type: "Feature", geometry: geom, properties: {idx: i}};})},
						getFeatureStyle: this.getFeatureStyle,
						getPopup: this.getPopup as any,
						highlightOnHover: true
					};
					pointer++;
				} else {
					if (!data[0]) data[0] = {
						geoData: {type: "FeatureCollection", features: []},
						getFeatureStyle: this.getFeatureStyle,
						getPopup: this.getPopup as any,
						cluster: true,
						highlightOnHover: true
					};
					(data[0] as any).geoData.features.push({type: "Feature", geometry, properties: {idx: i}});
				}
				return data;
			}, [] as LajiMapData[]);

			return (
				<div style={{height: "inherit"}}>
					<SearchableDrowndown 
						value={this.state.popupIdx}
						disabled={!places}
						options={this.getEnumOptions(places, translations)} 
						onChange={this.onSelectChange} 
						selectOnChange={false}
						includeEmpty={true} 
						id="named-place-chooser-select" 
						formContext={this.props.formContext} />
					<Map 
						ref={this.mapRef}
						data={data}
						markerPopupOffset={45}
						featurePopupOffset={5}
						controls={{draw: false}}
						lang={this.props.formContext.lang}
						bodyAsDialogRoot={false}
						formContext={this.props.formContext}
						onPopupClose={this.onPopupClose}
					/>
					{(!places) ? <Spinner /> : null}
					<div style={{display: "none"}} ref={this.popupContainerRef}>
						<Popup ref={this.popupRef} 
							place={(places || [])[this.state.popupIdx!]} 
							onPlaceSelected={this.onPlaceSelected}
							onPlaceDeleted={this.onPlaceDeleted}
							deleting={this.state.deleting}
							translations={translations} />
					</div>
				</div>
			);
		}
	}
}
