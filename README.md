# Rectify

Rectify is a simple but powerful structure for JavaScript applications. Using Rectify,
you set up a simple configuration and tell Rectify which plugins you want to load. Each
plugin registers itself with Rectify, so other plugins can use its functions. Plugins can
be maintained as NPM packages so they can be dropped in to other Rectify apps.

Fork of https://github.com/c9/architect 

`c9/architect ` is no longer maintained,  this version services to be leaner version and to be used for es6 envirtonments

## Plugin Interface

index.js
```js
import * as pluginA from "./plugin_a/plugin.js";
import * as pluginB from "./plugin_b/plugin.js";
import rectify from "../index.js";

var config = [pluginA,pluginB];
var app = rectify.build(config);

app.start();
```

`./plugin_a/plugin.js`
```
export const consumes = ["hello"];
export const provides = [];
export function setup( imports, register) {
    var { hello } = imports;
    hello.test();
    register();
}
```

`./plugin_b/plugin.js`
```
export const consumes = [];
export const provides = ["hello"];
export function setup(imports, register) {
    register(null, {
        hello:{
            test:function(){
                console.log("Hello World")
            }
        }
    })
}
```

## Config Format

Notice that the config is a list of plugin config options.  If the only option in the config is `packagePath`, then a string can be used in place of the object.  If you want to pass other options to the plugin when it's being created, you can put arbitrary properties here.

The `plugin` section in each plugin's package.json is also merged in as a prototype to the main config.  This is where `provides` and `consumes` properties are usually set.

## Rectify main API

The Rectify module exposes one functions as it's main API.

### build(config, [callback])

This function starts an Rectify config.  The return value is an `Rectify` instance.  The optional callback will listen for both "error" and "ready" on the app object and report on which one happens first.

## Class: Rectify

Inherits from `EventEmitter`.

The `start` function returns an instance of `Rectify`.

### Event: "service" (name, service)

When a new service is registered, this event is emitted on the app.  Name is the short name for the service, and service is the actual object with functions.

### Event: "plugin" (plugin)

When a plugin registers, this event is emitted.

### Event: "ready" (app)

When all plugins are done, the "ready" event is emitted.  The value is the Rectify instance itself.

