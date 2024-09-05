

plugin.consumes = [];
plugin.provides = ["hello"];

function plugin(imports, register) {
    register(null, {
        hello:{
            test:function(){
                console.log("Test")
            }
        }
    })
}


module.exports = plugin;