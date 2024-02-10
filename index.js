import events from "events";
const EventEmitter = events.EventEmitter;

function objHas(obj, name) { return Object.prototype.hasOwnProperty.call(obj, name); }

// Check a plugin config list for bad dependencies and throw on error
function checkConfig(config) {

    // Check for the required fields in each plugin.
    config.forEach(function (plugin) {
        if (plugin.checked) { return; }

        if (!objHas(plugin, "setup") && typeof plugin == "function")
            plugin.setup = plugin;

        if (!objHas(plugin, "setup") && typeof plugin.default == "function")
            plugin.setup = plugin.default;

        if (!objHas(plugin, "setup")) {
            throw new Error("Plugin is missing the setup function " + JSON.stringify(plugin));
        }
        if (!objHas(plugin, "provides")) {
            throw new Error("Plugin is missing the provides array " + JSON.stringify(plugin));
        }
        if (!objHas(plugin, "consumes")) {
            throw new Error("Plugin is missing the consumes array " + JSON.stringify(plugin));
        }
    });

    return checkCycles(config);
}

function checkCycles(config) {
    var plugins = [];
    config.forEach(function (pluginConfig, index) {
        plugins.push({
            packagePath: pluginConfig.packagePath,
            provides: pluginConfig.provides.concat(),
            consumes: pluginConfig.consumes.concat(),
            i: index
        });
    });

    var resolved = {
        app: true
    };
    var changed = true;
    var sorted = [];

    while (plugins.length && changed) {
        changed = false;

        plugins.concat().forEach(function (plugin) {
            var consumes = plugin.consumes.concat();

            var resolvedAll = true;
            for (var i = 0; i < consumes.length; i++) {
                var service = consumes[i];
                if (!resolved[service]) {
                    resolvedAll = false;
                } else {
                    plugin.consumes.splice(plugin.consumes.indexOf(service), 1);
                }
            }

            if (!resolvedAll)
                return;

            plugins.splice(plugins.indexOf(plugin), 1);
            plugin.provides.forEach(function (service) {
                resolved[service] = true;
            });
            sorted.push(config[plugin.i]);
            changed = true;
        });
    }

    if (plugins.length) {
        var unresolved = {};
        plugins.forEach(function (plugin) {
            delete plugin.config;
            plugin.consumes.forEach(function (name) {
                if (unresolved[name] == false)
                    return;
                if (!unresolved[name])
                    unresolved[name] = [];
                unresolved[name].push(plugin.packagePath);
            });
            plugin.provides.forEach(function (name) {
                unresolved[name] = false;
            });
        });

        Object.keys(unresolved).forEach(function (name) {
            if (unresolved[name] == false)
                delete unresolved[name];
        });

        console.error("Could not resolve dependencies of these plugins:", plugins);
        console.error("Resolved services:", Object.keys(resolved));
        console.error("Missing services:", unresolved);
        throw new Error("Could not resolve dependencies");
    }

    return sorted;
}

class Rectify extends EventEmitter {
    constructor(config) {
        super();//setup emitter
        var app = this;
        app.config = config;
        var services = app.services = {
            app: {
                EventEmitter: EventEmitter,
                window: window || global,
                on: function (name, callback) {
                    if (typeof (callback) == "function") callback = callback.bind(app);
                    app.on(name, callback);
                }
            }
        };

        // Check the config
        var sortedPlugins = checkConfig(config);

        var destructors = [];

        app.start = function (callback) {
            if (callback) app.on("ready", callback);
            var plugin = sortedPlugins.shift();
            if (!plugin)
                return app.emit("ready", app);

            var imports = {};
            if (plugin.consumes) {
                plugin.consumes.forEach(function (name) {
                    imports[name] = services[name];
                });
            }

            try {
                plugin.setup(imports, register);
            } catch (e) {
                return app.emit("error", e);
            }

            function register(err, provided) {
                if (err) { return app.emit("error", err); }
                plugin.provides.forEach(function (name) {
                    if (!objHas(provided, name)) {
                        var err = new Error("Plugin failed to provide " + name + " service. " + JSON.stringify(plugin));
                        return app.emit("error", err);
                    }
                    services[name] = provided[name];

                    // if (typeof provided[name] != "function")
                    //     provided[name].name = name;

                    app.emit("service", name, services[name]);
                });
                if (provided && objHas(provided, "onDestroy"))
                    destructors.push(provided.onDestroy);

                app.emit("plugin", plugin);
                app.start();
            }
        };

        // Give createApp some time to subscribe to our "ready" event
        // (typeof process === "object" ? process.nextTick : setTimeout)(app.start);
    }
}

Rectify.build = function (config, callback) {
    var app;
    try {
        app = new Rectify(config);
    } catch (err) {
        if (!callback) throw err;
        return callback(err, app);
    }
    if (callback) {
        app.on("error", done);
        app.on("ready", onReady);
    }
    return app;

    function onReady() {
        done();
    }

    function done(err) {
        if (err) {
            app.destroy();
        }
        app.removeListener("error", done);
        app.removeListener("ready", onReady);
        callback(err, app);
    }
};

export default Rectify;