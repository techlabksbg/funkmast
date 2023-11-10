import { Model } from "./model.js";
import { WordList } from "./wordlist.js";

window.addEventListener('load', function() {
    let wordlist = new WordList();

    //wordlist.setList(["head", "hair", "eyes", "nose", "mouth", "ears", "finger", "fingers", "arms", "hands", "hand", "ellbow", "legs", "toes", "foot", "feet", "knee", "knees", "body", "back", "shoulder"]);

    let model = new Model(7, 12);
    //let model = new Model(5, 7);
    model.randomRegions();
    while (true) {
        model.fillRegions(wordlist);
        if (model.solve(wordlist)==1) {
            break;
        }
    }
    model.showRegions(true);
    
    this.document.getElementById('solve').addEventListener('click', ()=>{
        model.showRegions(false);
    });

})
