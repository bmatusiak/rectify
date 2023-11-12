
export const consumes = [];

export const provides = ["hello"];


export function setup(imports, register) {

    register(null, {
        hello:{
            test:function(){
                console.log("Test")
            }
        }
    })
}

