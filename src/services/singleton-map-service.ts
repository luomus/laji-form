import LajiMap from "laji-map";
import LajiMapType from "laji-map/lib/map";
import { Options } from "laji-map";

/**
 * Service used for accessing a singlet on instance of LajiMap. Using a singleton instance increases performance, as
 * the map needs to be initialized only once. Control of the map of simply grabbed, making the previous owner lose
 * control of the map.
 */
export default class SingletonMapService {
	public map: LajiMapType;
	private owner: any;

	destroy() {
		this.map?.destroy();
	}

	/**
	 * Grab control of the singleton map. 
	 * @param instance should be the Map component instance, that is set as the controller of the map.
	 * @param mapOptions Map options to set to the map.
	 */
	grab(instance: any, mapOptions: Options) {
		this.owner = instance;
		if (!this.map) {
			this.map = new LajiMap(mapOptions);
			// this.map = singletonMapService.map;
			// this.mounted && props.singleton && this.hasSingletonHandle && props.zoomToData && this.map.zoomToData(props.zoomToData);
			// props.zoomToData && this.map.zoomToData(props.zoomToData);
		} else {
			this.owner.setMapOptions(this.map.getOptions(), mapOptions, this.owner.props.id);
		}
		return this.map;
	}

	release(instance: any) {
		if (instance === this.owner) {
			this.owner = undefined;
		}
	}

	/**
	 * Ask whether given instance has control of the map.
	 */
	amOwner(instance: any) {
		return this.owner === instance;
	}
}
