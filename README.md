# README #

This is a React module, that can be installed as a npm dependency and bolted to DOM with few lines.

# Installing #

Install as a git dependency:

```
npm install git+ssh://git@bitbucket.org:luomus/laji-form.js.git --save
```

# Usage #

LajiForm is a react-jsonschema-form wrapper. It passes all its properties to <Form />.

```
import React from "react";
import { render } from "react-dom";
import LajiForm from "laji-form";

render(<LajiForm schema={...} uiSchema={...} formData={...} />, document.getElementById("app"));
```

Styles must be imported separately. The styles are in lib/
```
import from "laji-form/lib/styles";
```

Webpack configuration:
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

Then write the API key you got in your email to ```properties.json```.
