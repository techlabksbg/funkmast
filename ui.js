import {makeSVG} from "./makesvg.js"

// TODO
// submit missing and bad words
//
export class UI {
    
    constructor(model) {
        this.griddiv = document.getElementById("griddiv");
        this.model = model;
        this.width = model.width;
        this.height = model.height;
        this.initGrid();
        this.selection = [];
        this.mode = "none"
        this.regionRemove = false;
        this.usedRegions = new Set([]);
        this.nextColor = "#abc";
        this.validWordTimeout = null;
        this.selectionValid = false;
        this.activex = undefined;
        this.activey = undefined;
    }


    // mode is one of "none", "adding" and "removing". Ending a drag resets the mode to "none".
    // selecting an empty cell starts ADDING, clears the selection if not connected
    // selecting an selected cell starts REMOVING
    // selecting an existing word converts it into the SELECTION and set mode to "none"
    // ADDING: adds the selected empty cell to the SELECTION, if the cell belongs to an existing word, turn merge it to the SELECTION
    // REMOVING: removes the selected cell from the SELECTION, if the cell belongs to en existing word, merge it to the SELECTION, continue to REMOVE


    nextRegionNumber() {
        let r = 0;
        while (this.usedRegions.has(r)) r++; 
        return r;
    }

    colorForRegion(r) {
        let phi = (1+Math.sqrt(5))/2;
        let hue = (0.8*(phi*r) % 1 + 0.1)*360;
        return `hsl(${hue} 100% 50%)`; 
    }

    setNextColor() {
        let r = this.nextRegionNumber();
        this.nextColor = this.colorForRegion(r);
        return this.nextColor;
    }

    getWordFromSelection() {
        this.selection.sort((a,b)=>{
            //console.log(`(${a})-(${b}) = ${a[0]+a[1]*this.width}-${b[0]+b[1]*this.width}=${a[0]+a[1]*this.width - (b[0]+b[1]*this.width)}`);
            return a[0]+a[1]*this.width - (b[0]+b[1]*this.width);
        });
        let word = "";
        for (let s of this.selection) {
            word += this.divs[s[0]][s[1]].innerText.toLowerCase();
        }
        console.log(word);
        return word;
    }

    isSelectionWord() {
        if (this.model.connected(this.selection)) {
            return this.model.wordlist.valid(this.getWordFromSelection());
        }
        return false;
    }

    cancelValidWordTimeout() {
        if (this.validWordTimeout) {
            clearTimeout(this.validWordTimeout);
            this.validWordTimeout = null;
        }
    }

    setValidWordTimeout() {
        this.cancelValidWordTimeout();
        console.log("Timeout set");
        this.validWordTimeout = setTimeout(()=>{
            console.log("Timeout fired")
            if (this.selectionValid) {
                console.log("calling setRegion()");
                this.setRegion();
                this.showRegions();
                this.validWordTimeout = null;
            }
        },2000);
    }

    showValidWord() {
        this.selectionValid = this.isSelectionWord();
        if (this.selectionValid) {
            this.setValidWordTimeout();
        } else {
            this.cancelValidWordTimeout();
        }
    }

    // Return the index of the entry (or -1, it no such entry exists)
    inSelection(x,y) {
        let res = -1;
        this.selection.forEach((s,i)=>{
            if (s[0]==x && s[1]==y) {
                res = i;
            }
        });
        return res;
    }

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
                if (this.divs[x][y].getAttribute('region')==region) {
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
                if (this.divs[x][y].getAttribute('region')==region) {
                    list.push([x,y]);
                }
            }
        }
        return list;
    }

    // takes the current selection and makes it into a region
    setRegion() {
        let r = 0;
        while (this.usedRegions.has(r)) r++;
        this.usedRegions.add(r);
        this.clearSelection(r);
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
        let region = el.getAttribute('region');
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
        let region = this.divs[x][y].getAttribute('region');
        if (region==-1) return nbrs;
        for (let dx=-1; dx<2; dx++) {
            for (let dy=-1; dy<2; dy++) {
                let a = x+dx;
                let b = y+dy;
                if (a>=0 && b>=0 && a<this.width && b<this.height) {
                    nbrs[dx+1][dy+1] = (this.divs[a][b].getAttribute('region')==region);
                }
            }
        }
        return nbrs;
    }

    showRegions() {
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {                
                let nbrs = this.makeNbrList(x,y);
                let region = this.divs[x][y].getAttribute('region');
                let color = "#aaaaaa";
                if (region==-2) {
                    color = this.selectionValid ? this.setNextColor() : "#aa0000";
                }
                if (region>=0) {
                    color = this.colorForRegion(region);
                }
                let svg = makeSVG(region==-2, color, nbrs);
                let update = function(url, div) {
                    if (div.style.backgroundImage!=`url('${url}')`) { // only if image changed
                        let i = new Image();
                        i.addEventListener('load', ()=>{
                            div.style.backgroundImage = `url('${url}')`;
                        }, {once:true});
                        i.src = url;
                    }
                };
                update(svg, this.divs[x][y]);
            }
        }
    }

}