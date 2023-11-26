import { Model } from "./model.js";
import { UI } from "./ui.js";


window.addEventListener('load', function() {

    let model = new Model(7, 12);
    let ui = new UI(model);
});
