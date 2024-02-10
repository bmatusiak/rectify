

setup.consumes = [];
setup.provides = ["hello"];

export default function setup(imports, register) {
    register(null, {
        hello:{
            test:function(){
                console.log("Test")
            }
        }
    })
}

