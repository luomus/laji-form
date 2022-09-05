import * as React from "react";
import Context from "../../Context";
import { parseJSONPointer } from "../../utils";
import * as L from "leaflet";

export default function DescriptonField(props) {
	const {description} = props;
	if (!description) {
		return null;
	}
	const {contextId, lang} = (props.registry || {}.formContext || {});
	console.log("DESC", contextId);
	const replacePatterns = description.match(/%{.*?}/g) || [];
	const _description = replacePatterns.reduce((desc, replacePattern) => {
		replacePattern = replacePattern.replace(/%|{|}/g, "");
		let replacement;
		if (replacePattern[0] === "#") {
			replacement = parseJSONPointer(new Context(contextId).formData, replacePattern.substr(1));
		// TODO DescriptionField doesn't receive formData
		//} else if (replacePattern[0] === "/") {
		//	replacement = parseJSONPointer(props.formData, replacePattern);
		} else if (replacePattern.startsWith("bbox")) {
			const field = replacePattern.match(/\((.*)\)/)[1];
			const value = parseJSONPointer(new Context(contextId).formData, field.substr(1));
			const bounds = L.geoJSON(value).getBounds();
			const sw = bounds.getSouthWest();
			const ne = bounds.getNorthEast(); 
			replacement = `${sw.lat}:${ne.lat}:${sw.lng}:${ne.lng}:WGS84`;
		} else if (replacePattern === "lang") {
			replacement = lang;
		}
		return desc.replace(`%{${replacePattern}}`, replacement);
	}, description);
	return <span dangerouslySetInnerHTML={{__html: _description}} />;
}
