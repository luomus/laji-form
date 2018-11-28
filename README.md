# README #

LajiForm is a dynamic form built on React. It can be used as a standalone library or as a React component. LajiForm is a wrapper for [react-jsonschema-form](https://github.com/mozilla-services/react-jsonschema-form).

# Installing #

```
npm install laji-form --save
```

# Usage as a library #

LajiForm passes all its properties to react-jsonschema-form. Read the documentation for react-jsonschema-form.

## Usage as a standalone library ##

```
import LajiForm from "laji-form";

new LajiForm({
  schema: schema,
  uiSchema: uiSchema, formData: formData,
  rootElem: document.getElementById("app")
});
```

You can update the properties with ```setState(props)```. You need to pass only the properties that you are changing, since it just calls the React component's ```setState(props)```.

You can unmount the component with ```unmount()```.

## Usage as a React component ##

```
import React from "react";
import { render } from "react-dom";
import LajiForm from "laji-form/lib/components/LajiForm";

render(<LajiForm
    schema={...}
    uiSchema={...}
    formData={...} />,
  document.getElementById("app"));
```

## API Client ##

In addition to properties you would pass to <Form />, you must pass an api client implementation, if you need to use fields that use lajitest.api.fi. The api client implementation must have ```fetch()``` -method, which **returns a Promise**.

```fetch(path, query, options)``` parameters are as follows:

* **path:** URL path for GET.
* **query:** Object, where keys are param names and values are param values.
* **options:** Object containing options for request.

See the example implementation in [src/playground/ApiClientImplementation.js](https://bitbucket.org/luomus/laji-form.js/src/HEAD/playground/ApiClientImplementation.js).

Pass the implementation to LajiForm like so:

```
<LajiForm apiClient={new ApiClientImplementation()} ... />
```

## Notifications ##

LajiForm expects a notification implementation as a paratemer `notifier`. The `notifier` object must implement the interface below:

```
{
	success: message => (),
	warning: message => (),
	info: message => (),
	error: message => (),
}
```

## Styles ##

Styles can be found at  ```dist/styles.css```.

# Development #

Run `yarn install` to install the dependencies and `yarn start` to start the app.

Before running, you'll need to configure your personal apitest.laji.fi access token. Get the key to your email:

```
curl -X POST --header "Content-Type: application/json" --header "Accept: application/json" -d "{\
  \"email\": \"<YOUR EMAIL ADDRESS>\"\
  }" "http://apitest.laji.fi/v0/api-token"
```

Copy settings template file:

```
cp properties.json.example properties.json
```

Then put the API access token you got in your email to ```properties.json```. Put also your user access token & user ID there. Google API key is needed only for using the reverse geo location for foreign locations.

Try to keep the code style consistent - ```npm run lint``` should pass without errors.

## Developing different forms ##

Start the server and navigate to the local playground http://localhost:8083?id={form_id}

### Playground query parameters ###

Option        | Default | Description
--------------|---------|-----------------------------------------------------------------------------------------------
id            | -       | Form id to use. If empty, `playground/schemas.json` will be used for form schemas.
local         | `false` | Use local schemas under `forms/` instead of fetching from apitest.laji.fi.
localFormData | `false` | Use local formData under `forms/${id}.formData.json` instead of form's `prepopulatedDocument`.
settings      | `true`  | Use local settings defined in `playground/schemas`.
lang          | `fi`    | Language of the form. Doesn't affect local forms.
readonly      | `false` | Sets the form readonly.

### Examples ###

http://localhost:8083?id=JX.519 Trip report form with empty `formData`.

http://localhost:8083?id=MHL.1&localFormData=true Line transect form with local `formData`.

## Tests ##

Install protractor with: 

```
npm i -g protractor
webdriver-manager update
```

The playground server and the Selenium server must be running before running the tests. Start the Selenium server with:

```
webdriver-manager start
```

Then run the tests with `yarn run test`.

### Test parameters ###

Parameters are given as envirnment variables, i.e. `TEST_BROWSER=chrome yarn test`

Option         | Default | Description
---------------|---------|-----------------------------------------------------------------------------------------------
TEST_BROWSER   | -       | `chrome` or `firefox`. Tests are run for both by default.
NO_HEADLESS    | `false` | Run the tests in a visible browser window if `true`.
