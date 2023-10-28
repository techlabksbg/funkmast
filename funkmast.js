import { Model } from "./model.js";
import { WordList } from "./wordlist.js";

window.addEventListener('load', function() {
    let wordlist = new WordList();
    let model = new Model(7, 12);
    model.randomRegions();
    model.fillRegions(wordlist);
    model.showRegions();
})
