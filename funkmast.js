import { Model } from "./model.js";
import { WordList } from "./wordlist.js";

window.addEventListener('load', function() {
    let wordlist = new WordList();
    let model = new Model(7, 12);
    console.log(`Random word: ${wordlist.randomWord()}`);
    for (let i=4; i<9; i++) {
        console.log(`Random word with ${i} letters: ${wordlist.randomWord(i)}`);
    }
    model.randomRegions();
    model.showRegions();
})
