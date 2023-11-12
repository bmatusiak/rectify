import * as pluginA from "./plugin_a/plugin.js"
import * as pluginB from "./plugin_b/plugin.js"

import rectify from "../index.js"


var config = [pluginA,pluginB];

var app = rectify.build(config)


app.start()