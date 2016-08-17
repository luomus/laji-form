# README #

LajiForm is a React module, that can be installed as a npm dependency. LajiForm is a wrapper for [react-jsonschema-form](https://github.com/mozilla-services/react-jsonschema-form).

# Installing #

Install as a git dependency:

```
npm install git+https://git@bitbucket.org:luomus/laji-form.js.git --save
```

```react``` and ```react-addons-css-transition-group``` are peer-dependencies, so they must also be installed. Npm doesn't install peer-dependencies automatically.

# Usage #

LajiForm passes all its properties to <Form />.

```
import React from "react";
import { render } from "react-dom";
import LajiForm from "laji-form";

render(<LajiForm schema={...} uiSchema={...} formData={...} />, document.getElementById("app"));
```

## API Client ##

In addition to properties you would pass to <Form />, you must pass an api client implementation, if you need to use fields that use lajitest.api.fi. The api client implementation must have ```fetch()``` -method, which **returns a Promise**.

```fetch(path, query)``` parameters are as follows:

* **path:** URL path for GET.
* **query:** Object, where keys are param names and values are param values.

See the example implementation in [src/playground/ApiClientImplementation.js](https://bitbucket.org/luomus/laji-form.js/src/HEAD/playground/ApiClientImplementation.js).

Pass the implementation to LajiForm like so:

```
<LajiForm apiClient={new ApiClientImplementation()} ... />
```

## Styles ##

### The usual way ###

Styles can be found at  ```dist/styles.css```.

### The webpack way ###

Styles can be imported with webpack loaders:

```
import "laji-form/lib/styles";
```

Webpack configuration for styles:
```
...
loaders: [
	{ test: /\.css$/,  loader: "style-loader!css-loader" },
	{ test: /\.less$/, loader: "style-loader!css-loader!less-loader" },
	{ test: /\.gif$/, loader: "url-loader?mimetype=image/png" },
	{ test: /\.woff(2)?(\?v=[0-9].[0-9].[0-9])?$/, loader: "url-loader?mimetype=application/font-woff" },
	{ test: /\.(ttf|eot|svg)(\?v=[0-9].[0-9].[0-9])?$/, loader: "file-loader?name=[name].[ext]" },
]
...
```

Npm packages needed for webpack style injections:
```
npm install less less-loader style-loader css-loader file-loader url-loader --save
```


# Development #

You need to configure your personal apitest.laji.fi access token. Get the key to you email:

```
curl -X POST --header "Content-Type: application/json" --header "Accept: application/json" -d "{\
  \"email\": \"<YOUR EMAIL ADDRESS>\"\
  }" "http://apitest.laji.fi/v0/api-token"
```

Copy settings template file:

```
cp properties.json.example properties.json
```

Then put the API access token you got in your email to ```properties.json```. Put also your user access token there.