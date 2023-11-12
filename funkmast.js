import { Model } from "./model.js";
import { UI } from "./ui.js";


window.addEventListener('load', function() {

    let model = new Model(7, 12);
    model.randomRegions();
    while (true) {
        model.fillRegions();
        if (model.solve()==1) {
            break;
        }
    }
    let ui = new UI(model);
    ui.showRegions(true);
    
    this.document.getElementById('solve').addEventListener('click', ()=>{
        ui.showRegions(false);
    });

})
