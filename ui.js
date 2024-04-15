import {makeSVG} from "./makesvg.js";
import {Model} from "./model.js";

export {UI};

class UI {
    
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.griddiv = document.getElementById("griddiv");
        this.overlay = document.getElementById('overlay');
        this.winner = document.getElementById('winner');
        this.newpuzzle = document.getElementById('newpuzzle');
        this.wordbutton = document.getElementById('wordbutton');
        this.hint = document.getElementById('hint');
        this.controls = document.getElementById('controls');

        this.makeNewPuzzle();

        this.wordbutton.addEventListener('click', ()=>this.submitWord());
        this.newpuzzle.addEventListener('click', ()=>this.makeNewPuzzle());
        this.hint.addEventListener('click', ()=>this.showHint());
    }

    makeNewPuzzle() {
        this.griddiv.innerHTML = "";
        this.model = new Model(this.width, this.height);
        this.selection = [];
        this.mode = "none"
        this.regionRemove = false;
        this.usedRegions = new Set([]);
        this.nextColor = "#abc";
        this.validWordTimeout = null;
        this.selectionValid = false;
        this.activex = undefined;
        this.activey = undefined;
        this.winner.classList.add("hidden");
        this.overlay.classList.remove("hidden");
        this.controls.style.display="none";
        let genStep = ()=>{
            let res = this.model.generatePuzzleStepByStep();
            if (!this.model.validPuzzle) {
                this.overlay.innerText = `${res['task']} at ${Math.round(res['completion']*100,2)}%`;
                setTimeout(genStep, 100);
            } else {
                this.overlay.classList.add("hidden");
                this.initGrid();
                this.showRegions();
                this.controls.style.display="flex";
                this.wordbutton.innerText = "Wort auswählen";
            }
        }
        genStep();
    } 


    // mode is one of "none", "adding" and "removing". Ending a drag resets the mode to "none".
    // selecting an empty cell starts ADDING, clears the selection if not connected
    // selecting an selected cell starts REMOVING
    // selecting an existing word converts it into the SELECTION and set mode to "none"
    // ADDING: adds the selected empty cell to the SELECTION, if the cell belongs to an existing word, turn merge it to the SELECTION
    // REMOVING: removes the selected cell from the SELECTION, if the cell belongs to en existing word, merge it to the SELECTION, continue to REMOVE

    removeWrongWords() {
        let change = false;
        for (let r of this.usedRegions) {
            outerloop: for (let y=0; y<this.height; y++) {
                for (let x=0; x<this.width; x++) {
                    if (Number(this.divs[x][y].getAttribute('region'))==r) {
                        //console.log(`checking at ${x},${y} for region ${r}`);
                        let otherRegion = this.model.regionNumber[x][y];
                        for (let yy=0; yy<this.height; yy++) {
                            for (let xx=0; xx<this.width; xx++) {
                                let ownRegion = (Number(this.divs[xx][yy].getAttribute('region'))==r);
                                let modelRegion = (this.model.regionNumber[xx][yy]==otherRegion);
                                if (ownRegion!=modelRegion) { // logical XOR ;-)
                                    this.removeRegion(r);
                                    change = true;
                                    break outerloop;
                                }
                            }
                        }
                    }
                }
            }
        }
        return change;
    }

    addCorrectWord() {
        this.clearSelection();
        correctWordLoops: for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                if (Number(this.divs[x][y].getAttribute('region'))==-1) {
                    let r = this.model.regionNumber[x][y];
                    for (let yy=0; yy<this.height; yy++) {
                        for (let xx=0; xx<this.width; xx++) {
                            if (this.model.regionNumber[xx][yy]==r) {
                                this.addToSelection(xx,yy);
                            }
                        }
                    }
                    break correctWordLoops;
                }
            }
        }
        this.setRegion();
    }

    showHint() {
        if (!this.removeWrongWords()) {
            this.addCorrectWord();
        }
        if (this.isComplete()) {
            this.winner.classList.remove("hidden");
        }
        this.showRegions();
    }

    // Submits a word (missing or correct) for later
    // inclusion or rejection into or from the wordlist
    submitWord() {
        let word = document.getElementById('wordbutton').innerText.toLowerCase();
        console.log(`word=${word} length=${word.length} `);
        if (word.length>=this.model.minchars && word.length<=this.model.maxchars) {            
            let url=`words.php?word=${word}&type=${this.selectionValid?"bad":"good"}`;
            console.log(url);
            let xmlHttp = new XMLHttpRequest();
            xmlHttp.onreadystatechange = function() { 
                if (xmlHttp.readyState == 4)
                    console.log(xmlHttp.responseText);
            }
            xmlHttp.open("GET", url, true); // true for asynchronous 
            xmlHttp.send(null);
        }
    }

    // Next free region number
    nextRegionNumber() {
        let r = 0;
        while (this.usedRegions.has(r)) r++; 
        return r;
    }

    // Computes the region based on its number
    colorForRegion(r) {
        let phi = (Math.sqrt(5)-1)/2;
        let hue = (0.8*((phi*r)%1) + 0.1)*360;
        return `hsl(${hue} 100% 50%)`; 
    }

    // Computes the next region color
    setNextColor() {
        let r = this.nextRegionNumber();
        this.nextColor = this.colorForRegion(r);
        return this.nextColor;
    }

    // Builds the word from the current selection
    getWordFromSelection() {
        this.selection.sort((a,b)=>{
            //console.log(`(${a})-(${b}) = ${a[0]+a[1]*this.width}-${b[0]+b[1]*this.width}=${a[0]+a[1]*this.width - (b[0]+b[1]*this.width)}`);
            return a[0]+a[1]*this.width - (b[0]+b[1]*this.width);
        });
        let word = "";
        for (let s of this.selection) {
            word += this.divs[s[0]][s[1]].innerText.toLowerCase();
        }
        let text = word.toUpperCase();
        if (word.length<this.model.minchars) {
            text = "Wort zu kurz";
        }
        if (word.length>this.model.maxchars) {
            text = "Wort zu lang";
        }
        document.getElementById('wordbutton').innerText = text;
        return word;
    }

    // Checks if the current selection is a valid word
    isSelectionWord() {
        if (this.model.connected(this.selection)) {
            return this.model.wordlist.valid(this.getWordFromSelection());
        }
        return false;
    }

    // Clears the automarking of valid words
    cancelValidWordTimeout() {
        if (this.validWordTimeout) {
            clearTimeout(this.validWordTimeout);
            this.validWordTimeout = null;
        }
    }

    // Adds a valid word as a definitve region after a timeout
    setValidWordTimeout(ms=2000) {
        this.cancelValidWordTimeout();
        this.validWordTimeout = setTimeout(()=>{
            if (this.selectionValid) {
                this.setRegion();
                this.showRegions();
                this.validWordTimeout = null;
            }
        },ms);
    }

    // Checks if all fields are part of a region (and thus the puzzle is solved)
    isComplete() {
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                if (Number(this.divs[x][y].getAttribute('region'))==-1) {
                    return false;
                }
            }
        }
        return true;
    }

    // Checks validity and shows it (plus winning, if so)
    showValidWord() {
        this.selectionValid = this.isSelectionWord();
        if (this.selectionValid) {
            if (this.isComplete()) {
                this.setValidWordTimeout(10);
                setTimeout(()=>this.winner.classList.remove("hidden"), 50);
            } else {
                this.setValidWordTimeout();
            }
        } else {
            this.cancelValidWordTimeout();
        }
    }

    // Return the index of the field at x,y
    // in the selection array (or -1, it no such entry exists)
    inSelection(x,y) {
        let res = -1;
        this.selection.forEach((s,i)=>{
            if (s[0]==x && s[1]==y) {
                res = i;
            }
        });
        return res;
    }

    // Removes a field from the selection array
    removeFromSelection(x,y, region=-1) {
        let i = this.inSelection(x,y);
        //console.log(`remove ${x},${y} at index ${i}, this.selection=${this.selection}`)
        if (i>=0) {
            // change element
            let el = this.divs[x][y];
            el.setAttribute('region', region);
            this.selection.splice(i,1);
        }
    }

    // adds a cell x,y to the selection (if not already in there)
    addToSelection(x,y) {
        x = Number(x);
        y = Number(y);
        if (this.inSelection(x,y)==-1) {
            this.selection.push([x,y]);
            let el = this.divs[x][y];
            el.setAttribute('region', -2);
            el.classList.add('selected');
            el.classList.remove("realWord");
        }
    }

    // Make unselected (or mark as region with given number)
    clearSelection(region=-1) {
        while (this.selection.length>0) {
            let [x,y] = this.selection[0];
            this.removeFromSelection(x,y, region);
        }
    }

    // removes a region and adds it to the current selection
    regionToSelection(region) {
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                if (Number(this.divs[x][y].getAttribute('region'))==region) {
                    this.addToSelection(x,y);
                }
            }
        }
        this.usedRegions.delete(region);
    }

    getRegionList(region) {
        let list = [];
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                if (Number(this.divs[x][y].getAttribute('region'))==region) {
                    list.push([x,y]);
                }
            }
        }
        return list;
    }

    // takes the current selection and makes it into a region
    setRegion() {
        let r = this.nextRegionNumber();
        this.usedRegions.add(r);
        this.clearSelection(r);
    }

    // Removes a region completely
    removeRegion(r) {
        this.regionToSelection(r);
        this.clearSelection();
    }

    // Unselects all cells from selection not reachable from (x,y)
    removeUnrechables(x,y) {
        let ok = new Array(this.selection.length).fill(false);
        let i = this.inSelection(x,y);
        if (i==-1) {
            this.clearSelection();
            return;
        }
        ok[i] = true;
        let todo = [i];
        while (todo.length>0) {
            let i = todo.pop()
            for (let j=0; j<this.selection.length; j++) {
                if (!ok[j] && Math.abs(this.selection[i][0]-this.selection[j][0])+Math.abs(this.selection[i][1]-this.selection[j][1]) == 1) {
                    ok[j] = true;
                    todo.push(j);
                }
            }
        }
        //console.log(`removeUnreachables at ${x},${y} with ok=${ok} and selection=${this.selection}`);
        this.selection.filter((v,i)=>!ok[i]).forEach((coord)=>{
            this.removeFromSelection(coord[0], coord[1]);
        });
    }


    activate(el) {
        let x = Number(el.getAttribute('x'));
        let y = Number(el.getAttribute('y'));
        let region = Number(el.getAttribute('region'));
        //console.log(`activate at ${x},${y} with region==${region} in mode=${this.mode}, remove=${this.regionRemove} and selection=${this.selection}`);
        if (this.mode=="none") {
            if (region==-1) { // empty cell
                this.mode = "adding";
                if (this.selectionValid) { // current selection is valid
                    if (this.model.connected([[x,y]].concat(this.selection))) { // connected
                        this.addToSelection(x,y);
                        this.showValidWord();
                    } else { // Not connected
                        if (this.regionRemove) {
                            this.clearSelection();
                            this.addToSelection(x,y);
                            this.showValidWord();
                        } else {
                            this.setRegion();
                            this.addToSelection(x,y);
                            this.showValidWord();
                        }
                    }
                } else { //current selection is not valid
                    this.addToSelection(x,y);
                    this.removeUnrechables(x,y);
                    this.showValidWord();
                }
                this.regionRemove = false;
            } else if (region==-2) { // current selection
                this.mode = "removing";
                this.removeFromSelection(x,y);
                this.showValidWord();
                this.regionRemove = false;
            } else if (region>=0) { // existing word
                if (this.selectionValid) {
                    if (this.regionRemove) {
                        this.clearSelection();
                    } else {
                        this.setRegion();
                    }
                }
                if (this.selection.length==0) {
                    this.regionRemove = true;
                }
                if (!this.model.connected(this.selection.concat(this.getRegionList(region)))) {
                    this.clearSelection();
                    this.regionRemove = true;
                }
                this.regionToSelection(region);
                this.showValidWord();
            }
        } else if (this.mode=="adding") {
            if (region>=0) {
                this.regionToSelection(region);
            }
            this.addToSelection(x,y);
            this.showValidWord();
        } else if (this.mode=="removing") {
            if (region==-2) {
                this.removeFromSelection(x,y);
                this.showValidWord();
            }
        }
        this.showRegions();
    };

    ev(el) {
        if (el===undefined) {
            this.activex = undefined;
            this.activey = undefined;
            this.mode = "none";
        } else {
            let x = Number(el.getAttribute('x'));
            let y = Number(el.getAttribute('y'));
            
            if (this.activex===undefined || this.activex!=x || this.activey!=y) {
                this.activex = x;
                this.activey = y;
                this.activate(el);
            }
        }
    };

    startInteraction(e, touchMove=false) {
        e.preventDefault();            
        this.ev(e.srcElement);
    }
    dragInteraction(e, touchMove=false) {
        let el;
        if (touchMove) {
            var xPos = e.targetTouches[0].pageX;
            var yPos = e.targetTouches[0].pageY;
            el = document.elementFromPoint(xPos, yPos);
        } else {
            if (e.buttons==0) return;
            el = e.srcElement;
        }
        this.ev(el);
    }
    stopInteraction(e) {
        e.preventDefault();
        this.ev(undefined);
    }

    initEventHandlers(el) {
        let that = this;
        el.addEventListener("touchstart", (e)=>that.startInteraction(e), false);
        el.addEventListener("mousedown", (e)=>that.startInteraction(e), false);
        el.addEventListener("touchmove", (e)=>that.dragInteraction(e, true), false);
        el.addEventListener("mousemove", (e)=>that.dragInteraction(e, false), false);
        el.addEventListener("touchend", (e)=>that.stopInteraction(e), false);
        el.addEventListener("touchcancel", (e)=>that.stopInteraction(e), false);
        el.addEventListener("touchleave", (e)=>that.stopInteraction(e), false);
        el.addEventListener("mouseup", (e)=>that.stopInteraction(e), false);

    }


    initGrid() {
        document.body.style.setProperty("--spalten", this.width);
        this.griddiv.innerHTML = "";  // Clear grid
        // Generate new divs in a two dimensional array
        this.divs = new Array(this.width).fill(0).map((e) => (new Array(this.height)).fill(0).map((e,i)=>{
            let d = document.createElement('div');
            
            this.initEventHandlers(d);
            return d;
        }));
        // Append the divs in the right order and assign letters
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                this.divs[x][y].setAttribute('x', x);
                this.divs[x][y].setAttribute('y', y);
                this.divs[x][y].setAttribute('region', -1);
                this.divs[x][y].innerText = this.model.letters[x][y].toUpperCase();
                this.griddiv.appendChild(this.divs[x][y]);
            }
        }
    }

    makeNbrList(x,y) {
        let nbrs = [[false, false, false], [false, false, false], [false, false, false]];
        let region = Number(this.divs[x][y].getAttribute('region'));
        if (region==-1) return nbrs;
        for (let dx=-1; dx<2; dx++) {
            for (let dy=-1; dy<2; dy++) {
                let a = x+dx;
                let b = y+dy;
                if (a>=0 && b>=0 && a<this.width && b<this.height) {
                    nbrs[dx+1][dy+1] = (Number(this.divs[a][b].getAttribute('region'))==region);
                }
            }
        }
        return nbrs;
    }

    showRegions() {
        let updated = false;
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {                
                let nbrs = this.makeNbrList(x,y);
                let region = Number(this.divs[x][y].getAttribute('region'));
                let color = "#aaaaaa";
                if (region==-2) {
                    color = this.selectionValid ? this.setNextColor() : "#aa8888";
                }
                if (region>=0) {
                    color = this.colorForRegion(region);
                }
                let svg = makeSVG(region==-2, this.selectionValid, color, nbrs);
                let update = function(url, div) {
                    if (div.style.backgroundImage!=`url('${url}')`) { // only if image changed
                        let i = new Image();
                        i.addEventListener('load', ()=>{
                            div.style.backgroundImage = `url('${url}')`;
                        }, {once:true});
                        i.src = url;
                        updated = true;
                    }
                };
                update(svg, this.divs[x][y]);
            }
        }
        this.model.save();
    }

}