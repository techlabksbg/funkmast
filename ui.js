

export class UI {
    
    constructor(model) {
        this.griddiv = document.getElementById("griddiv");
        this.model = model;
        this.width = model.width;
        this.height = model.height;
        this.initGrid();
    }

    initGrid() {
        document.body.style.setProperty("--spalten", this.width);
        this.griddiv.innerHTML = "";  // Clear grid
        // Generate new divs in a two dimensional array
        this.divs = new Array(this.width).fill(0).map((e) => (new Array(this.height)).fill(0).map((e,i)=>{
            let d = document.createElement('div');
            return d;
        }));
        // Append the divs in the right order and assign letters
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                this.divs[x][y].innerText = this.model.letters[x][y].toUpperCase();
                this.griddiv.appendChild(this.divs[x][y]);
            }
        }
    }
    showRegions(clear = false) {
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                let color = clear ? "white" : `hsl(${360/this.model.numRegions*this.model.regionNumber[x][y]} 100% 50%)`;
                this.divs[x][y].style.backgroundColor=color;
            }
        }
    }

}