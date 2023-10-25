import { WordList } from "./wordlist.js";

export class Model {

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.wordlist = new WordList();
        this.griddiv = document.getElementById("griddiv");

        // Two-dimensional Array letters[x][y], x is the column, y the row
        this.letters = new Array(this.width).fill(0).map((e) => (new Array(this.height)).fill(""));
        console.log(this.letters);

        this.regionNumber = new Array(this.width).fill(0).map((e) => (new Array(this.height)).fill(0));
        this.numRegions = 1;
        this.initGrid();
    }

    initGrid() {
        this.griddiv.innerHTML = "";  // Clear grid
        // Generate new divs in a two dimensional array
        this.divs = new Array(this.width).fill(0).map((e) => (new Array(this.height)).fill(0).map((e,i)=>{
            let d = document.createElement('div');
            this.griddiv.appendChild(d);
            return d;
        }));
    }

    // Generates random, connected regions of minimal size 4 and
    // maximum size 8
    randomRegions(numregions) {
        this.numRegions = 8;
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                this.regionNumber[x][y]=Math.floor(Math.random()*this.numRegions);
            }
        }
    }

    showRegions() {
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                let color = `hsl(${360/this.numRegions*this.regionNumber[x][y]} 100% 50%)`;
                console.log(color);
                this.divs[x][y].style.backgroundColor=color;
            }
        }
    }

};
