

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
        this.selectionValid = false;
        this.activex = undefined;
        this.activey = undefined;
    }

    initEventHandlers(el) {



        // mode is one of "none", "adding" and "removing". Ending a drag resets the mode to "none".
        // selecting an empty cell starts ADDING, clears the selection if not connected
        // selecting an selected cell starts REMOVING
        // selecting an existing word converts it into the SELECTION and set mode to "none"
        // ADDING: adds the selected empty cell to the SELECTION, if the cell belongs to an existing word, turn merge it to the SELECTION
        // REMOVING: removes the selected cell from the SELECTION, if the cell belongs to en existing word, merge it to the SELECTION, continue to REMOVE

        let getWordFromSelection = ()=>{
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

        let isSelectionWord = ()=>{
            if (this.model.connected(this.selection)) {
                return this.model.wordlist.valid(getWordFromSelection());
            }
            return false;
        }

        let showValidWord = ()=>{
            for (let y=0; y<this.height; y++) {
                for (let x=0; x<this.width; x++) {
                    this.divs[x][y].classList.remove("isWord");
                }
            }
            this.selectionValid = isSelectionWord();
            if (this.selectionValid) {
                for (let s of this.selection) {
                    this.divs[s[0]][s[1]].classList.add("isWord");
                }
            }
        }

        // Return the index of the entry (or -1, it no such entry exists)
        let inSelection = (x,y)=>{
            let res = -1;
            this.selection.forEach((s,i)=>{
                if (s[0]==x && s[1]==y) {
                    res = i;
                }
            });
            return res;
        }

        let removeFromSelection = (x,y, region=-1)=>{
            let i = inSelection(x,y);
            console.log(`remove ${x},${y} at index ${i}, this.selection=${this.selection}`)
            if (i>=0) {
                // change element
                let el = this.divs[x][y];
                el.setAttribute('region', region);
                el.classList.remove('selected');
                if (region>=0) {
                    el.classList.add('realWord');
                }
                // remove from array
                this.selection.splice(i,1);
            }
        }

        let addToSelection = (x,y)=>{
            x = Number(x);
            y = Number(y);
            if (inSelection(x,y)==-1) {
                this.selection.push([x,y]);
                let el = this.divs[x][y];
                el.setAttribute('region', -2);
                el.classList.add('selected');
                el.classList.remove("realWord");
            }
        }

        let clearSelection = (region=-1)=>{
            while (this.selection.length>0) {
                let [x,y] = this.selection[0];
                removeFromSelection(x,y, region);
            }
        }

        let regionToSelection = (region)=>{
            for (let y=0; y<this.height; y++) {
                for (let x=0; x<this.width; x++) {
                    if (this.divs[x][y].getAttribute('region')==region) {
                        addToSelection(x,y);
                    }
                }
            }
            this.usedRegions.delete(region);
        }
        let getRegionList = (region)=>{
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

        let setRegion = ()=>{
            let r = 0;
            while (this.usedRegions.has(r)) r++;
            this.usedRegions.add(r);
            clearSelection(r);
        }

        // Unselects all cells from selection not reachable from (x,y)
        let removeUnrechables = (x,y)=>{
            let ok = new Array(this.selection.length).fill(false);
            let i = inSelection(x,y);
            if (i==-1) {
                clearSelection();
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
            console.log(`removeUnreachables at ${x},${y} with ok=${ok} and selection=${this.selection}`);
            this.selection.filter((v,i)=>!ok[i]).forEach((coord)=>{
                removeFromSelection(coord[0], coord[1]);
            });
        }


        let activate = (el)=>{
            let x = el.getAttribute('x');
            let y = el.getAttribute('y');
            let region = el.getAttribute('region');
            console.log(`activate at ${x},${y} with region==${region} in mode=${this.mode} and selection=${this.selection}`);
            if (this.mode=="none") {
                if (region==-1) { // empty cell
                    this.mode = "adding";
                    if (this.selectionValid) { // current selection is valid
                        if (this.model.connected([[x,y]].concat(this.selection))) { // connected
                            addToSelection(x,y);
                            showValidWord();
                        } else { // Not connected
                            if (this.regionRemove) {
                                clearSelection();
                                addToSelection(x,y);
                                showValidWord();
                            } else {
                                setRegion();
                                addToSelection(x,y);
                                showValidWord();
                            }
                        }
                    } else { //current selection is not valid
                        addToSelection(x,y);
                        removeUnrechables(x,y);
                        showValidWord();
                    }
                    this.regionRemove = false;
                } else if (region==-2) { // current selection
                    this.mode = "removing";
                    removeFromSelection(x,y);
                    showValidWord();
                    this.regionRemove = false;
                } else if (region>=0) { // existing word
                    if (!this.model.connected(this.selection.concat(getRegionList(region)))) {
                        clearSelection();
                        this.regionRemove = true;
                    }
                    regionToSelection(region);
                    showValidWord();
                }
            } else if (this.mode=="adding") {
                if (region>=0) {
                    regionToSelection(region);
                }
                addToSelection(x,y);
                showValidWord();
            } else if (this.mode=="removing") {
                if (region==-2) {
                    removeFromSelection(x,y);
                    showValidWord();
                }
            }
           
        };

        let ev = (el)=>{
            if (el===undefined) {
                this.activex = undefined;
                this.activey = undefined;
                this.mode = "none";
            } else {
                let x = el.getAttribute('x');
                let y = el.getAttribute('y');
                
                if (this.activex===undefined || this.activex!=x || this.activey!=y) {
                    this.activex = x;
                    this.activey = y;
                    activate(el);
                }
            }
        };

        function touchStart(e) {
            e.preventDefault();
            ev(e.srcElement);
        }
        function touchEnd(e) {
            e.preventDefault();
            ev(undefined);
        }
        function touchCancel(e) {
            e.preventDefault();
            ev(undefined);
        }
        function touchLeave(e) {
            e.preventDefault();
            ev(undefined);
        }
        function touchMove(e) {
            e.preventDefault();
            var xPos = e.targetTouches[0].pageX;
            var yPos = e.targetTouches[0].pageY;
            let el = document.elementFromPoint(xPos, yPos);
            ev(el);
        }
        function mouseDown(e) {
            e.preventDefault();
            ev(e.srcElement);
        }
        function mouseMove(e) {
            e.preventDefault();
            if (e.buttons>0) {
                ev(e.srcElement);
            }
        }
        function mouseUp(e) {
            e.preventDefault();
            ev(undefined);
        }

        el.addEventListener("touchstart", touchStart, false);
        el.addEventListener("touchend", touchEnd, false);
        el.addEventListener("touchcancel", touchCancel, false);
        el.addEventListener("touchleave", touchLeave, false);
        el.addEventListener("touchmove", touchMove, false);
        el.addEventListener("mousedown", mouseDown, false);
        el.addEventListener("mousemove", mouseMove, false);
        el.addEventListener("mouseup", mouseUp, false);

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

    showRegions(clear = false) {
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                if (clear) {
                    this.divs[x][y].style.backgroundColor="";
                } else {
                    let color = `hsl(${360/this.model.numRegions*this.model.regionNumber[x][y]} 100% 50%)`;
                    this.divs[x][y].style.backgroundColor=color;
                }
            }
        }
    }

}