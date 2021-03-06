## 9.0.1
* Add `allowOnlyYear` option for `DateTimeWidget` & `DateWidget`

## 9.0.0
* Revert "Buttons don't use `primary` bs role by default & not strong text"

## 8.1.0
* Replace boolean switches with radio buttons

## 8.0.0
* Buttons don't use `primary` bs role by default & not strong text
* add `activeHeightOffset` to `SingleActiveArrayField` table

## 7.2.0
* Add `submitOnlySchemaValidations`

## 7.1.0
* Add `mediaMetadata` prop, which replaces `defaultImageMetadata` in settings (breaking change! Accidentally released as feature release)

## 7.0.0
* Globally interpreted `[test].injections` moved to `ui:injections`

## 6.1.0
* Add `tag` option to `PlainTextWidget`

## 6.0.0
* Exclude TypeScript declarations in `lib`
* Export tests to npm package

## 5.8.0
* Include TypeScript declarations in `lib`

## 5.7.3
* `InjectField` `fields` must begin with "/" if they are to be handled as JSON pointers properly

## 5.7.0
* `FakePropertyField`: add `skipIfEmpty` to field options
* `URLWidget`: add `template` option

## 5.6.0
* add `NumberWidget`

## 5.5.0
* `AutosuggestField`: added `suggestionValueParse` & `suggestionReceivers` support fallback field to use

## 5.4.0
* remove `getTaxonAutocompleteHTMLString` method from ApiClient

## 5.3.0
* add `getTaxonAutocompleteHTMLString` method for ApiClient

## 5.2.0
* Add named place removal

## 5.1.2
* Use upstream react-jsonschema-form instead of private fork

## 5.1.0
* Add `onValidationError` prop

## 5.0.0
* Remove `ConditionalAdditionalItemsArrayField` (can be implemented with `MultiArrayField`).
* Remove `SingleActiveArrayField` `split` renderer (can be implemented with `MultiArrayField`).

## 4.9.0
* Add `ToggleAdditionalArrayFieldsField`

## 4.8.0
* Add `InjectTaxonCensusFilterField`
* Add `MultiAnyToBooleanField`

## 4.7.0
* `ScopeField` doesn't remove props from `schema`, but hides them with `uiSchema`
* `LocationChooserField` allows JSON pointer for `geometryField`

## 4.6.0
* Add `FilterArrayField`
* uiSchema option `rules` allows `complement` option

## 4.5.0
* Add `FilterArrayField`
* uiSchema components that use `rules` allow `complement` option, which complements the rule result

## 4.4.0
* Add `AudioArrayField`

## 4.3.0
* add `autoFocus` root uiSchema option

## 4.2.0
* Add SectionArrayField & MultiArrayField

## 4.1.0
* Add `FakePropertyField`
* add `data` option to `MapField`
* InjectField works with proper JSON pointers

## 4.0.0
* `src/validation.js` default export function doesn't take in `liveErrors` or `liveWarnings` parameters any more

## 3.0.1
* add deprecation warning about utils `getUpdateObjectFromJSONPath` and `updateSafelyWithJSONPath` (renamed to 'JSONPointer')

## 3.0.0
* `validate()` signature has changed
* `onSubmit()` signature has changed, uses `formData` from `state`
* `submit()` signature has changed

## 2.2.0
* Label can be overridden through `fields` prop

## 2.1.2
* Upgrade RJSF to 2.0.0-alpha (got rid of private fork finally!), fixes computing array defaults etc

## 2.1.1
* Schema of type `number` or `integer` aren't rendered as number inputs

## 2.1.0
* Add showID option for person AutosuggestWidget (for admin only)
* Pass `formContext` from props to RJSF

## 2.0.9
* Add `sideEffects` options for ImageArrayField

## 2.0.5
* Pass `fields` and `widgets` from props to RJSF
* don't `src` in npm package

## 2.0.0
* Remove `TemplateArrayField`

## 1.2.6
* `lib` keeps src folder structure & doesn't include styles

## 1.2.5
* include `src` in npm package

## 1.2.4
* Fix 'main' in package.json

## 1.2.0
* Background jobs can be retried
* ImageArrayField sends DELETE request to API when image is removed

## 1.1.0
* Listen to keyboard events on HTML document level

## 1.0.0
* Started using semver
