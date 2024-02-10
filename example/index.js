import pluginA from "./plugin_a/plugin.js"
import pluginB from "./plugin_b/plugin.js"

import rectify from "../index.js"

var config = [pluginA,pluginB];

var app = rectify.build(config)

app.start()
