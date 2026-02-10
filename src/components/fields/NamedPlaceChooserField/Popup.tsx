import * as React from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { FormContext } from "src/components/LajiForm";
import Spinner from "react-spinner";
import { isEmptyString } from "../../../utils";
import { Button, DeleteButton } from "../../../components/components";
import type { components } from "generated/api.d";
type NamedPlace = components["schemas"]["store-namedPlace"];

type Props = {
	onPlaceSelected: (place: NamedPlace) => void
	onPlaceDeleted: (place: NamedPlace) => void
	place: NamedPlace;
	translations: FormContext["translations"];
	deleting?: boolean;
}

export const Popup = forwardRef<any, Props>((props, ref) => {
	const { onPlaceSelected, onPlaceDeleted, place, translations, deleting } = props;

	const _onPlaceSelected = useCallback(() => {
		onPlaceSelected(place);
	}, [onPlaceSelected, place]);
	const _onPlaceDeleted = useCallback(() => {
		onPlaceDeleted(place);
	}, [onPlaceDeleted, place]);

	const containerRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	useImperativeHandle(ref, () => ({
		elem: containerRef.current,
		button: buttonRef.current,
	}));

	return (
		<div className="named-place-popup" ref={containerRef}>
			{ !place
				?  <Spinner />
				: <table>
					<tbody>{
						[
							["Name", "name"], 
							["Notes", "notes"]
						].reduce((fieldset, [translationKey, fieldName], i) => {
							if (!isEmptyString(place[fieldName as keyof NamedPlace])) fieldset.push(
								<tr key={i}>
									<td><b>{translations[translationKey]}: </b></td>
									<td>{place[fieldName as keyof NamedPlace]}</td>
								</tr>
							);
							return fieldset;
						}, [] as JSX.Element[])
					}</tbody>
				</table>
			}
			<Button block disabled={!place} ref={buttonRef} onClick={_onPlaceSelected}>{translations.UseThisPlace}</Button>
			<DeleteButton block
				onClick={_onPlaceDeleted}
				disabled={deleting}
				glyphButton={false}
				confirm={true}
				confirmStyle={"browser"}
				translations={translations}>
				{translations.Remove} {deleting && <Spinner />}
			</DeleteButton>
		</div>
	);
});
