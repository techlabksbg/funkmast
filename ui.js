

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

    // nbrs is 3x3-Array with true/false if nbrs are present or not
    // selected is true/false
    makeSVG(selected, color, nbrs = [[false, false, false],[false, true, false], [false, false, false]]) {

        const top = nbrs[1][0],
            bottom = nbrs[1][2],
            left = nbrs[0][1],
            right = nbrs[2][1],
            topleft = nbrs[0][0],
            topright = nbrs[2][0],
            bottomleft = nbrs[0][2],
            bottomright = nbrs[2][2];

        // From https://stackoverflow.com/questions/13069446/simple-fill-pattern-in-svg-diagonal-hatching
        let filldef = !selected ? "" : '<pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="25" height="25"><rect x="-1" y="-1" width="27" height="27" fill="'+color+'" fill-rule="evenodd"/><path d="M-5,5 l10,-10 M-5,30 l35,-35 M20,30 l10,-10" style="stroke:#ffffff88; stroke-width:8" /> </pattern>';
        let fillUse = !selected ? color : "url(#diagonalHatch)"

        const margin = 10;


        let path = [];

        //////////////////////////////////////
        // Foreign code, license unclear
        // shamelessly copied from https://www.andrewt.net/puzzles/cell-tower/player/common/blob-svg.js
        ////////////////////////////////////////////

        // start in top left
        if (top) path.push(`M ${left ? -margin : margin} ${-margin}`);
        else path.push(`M ${left ? -margin : margin * 2} ${margin}`);

        // draw top edge and top right corner
        if (top && right && !topright) path.push(
            `L ${100 - margin} ${-margin}`,
            `L ${100 - margin} 0`,
            `A ${margin} ${margin} 0 0 0 100 ${margin}`,
            `L ${100 + margin} ${margin}`,
        );
        else if (right) path.push(`L ${100 + margin} ${top ? -margin : margin}`);
        else if (top) path.push(`L ${100 - margin} ${-margin}`);
        else path.push(
            `L ${100 - margin * 2} ${margin}`,
            `A ${margin} ${margin} 0 0 1 ${100 - margin} ${margin * 2}`
        );

        // draw right edge and bottom right corner
        if (bottom && right && !bottomright) path.push(
            `L ${100 + margin} ${100 - margin}`,
            `L 100 ${100 - margin}`,
            `A ${margin} ${margin} 0 0 0 ${100 - margin} 100`,
            `L ${100 - margin} ${100 + margin}`,
        );
        else if (bottom) path.push(`L ${right ? 100 + margin : 100 - margin} ${100 + margin}`);
        else if (right) path.push(`L ${100 + margin} ${100 - margin}`);
        else path.push(
            `L ${100 - margin} ${100 - margin * 2}`,
            `A ${margin} ${margin} 0 0 1 ${100 - margin * 2} ${100 - margin}`
        );

        // draw bottom edge and bottom left corner
        if (bottom && left && !bottomleft) path.push(
            `L ${margin} ${100 + margin}`,
            `L ${margin} 100`,
            `A ${margin} ${margin} 0 0 0 0 ${100 - margin}`,
            `L ${-margin} ${100 - margin}`,
        );
        else if (left) path.push(`L ${-margin} ${bottom ? 100 + margin : 100 - margin}`);
        else if (bottom) path.push(`L ${margin} ${100 + margin}`);
        else path.push(
            `L ${margin * 2} ${100 - margin}`,
            `A ${margin} ${margin} 0 0 1 ${margin} ${100 - margin * 2}`
        );

        // draw left edge and top left corner
        if (top && left && !topleft) path.push(
            `L ${-margin} ${margin}`,
            `L 0 ${margin}`,
            `A ${margin} ${margin} 0 0 0 ${margin} 0`,
            `L ${margin} ${-margin}`,
        );
        else if (top || left) path.push(`Z`);
        else path.push(
            `L ${margin} ${margin * 2}`,
            `A ${margin} ${margin} 0 0 1 ${margin * 2} ${margin}`
        );

        let svg = `<svg viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
        ${filldef}
		<g stroke="none" fill="#000000" fill-rule="evenodd">
			<rect x="-5" y="-5" width="110" height="110"></rect>
		</g>
		<path
			stroke="none"
			fill="${fillUse}" fill-rule="evenodd"
			d="${path.join(' ')}"
		/>
        </svg>`;
        ///////////////////////////////////////////
        // End of foreign code
        //////////////////////////////////////////
        return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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
            this.selectionValid = isSelectionWord();
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
            let x = Number(el.getAttribute('x'));
            let y = Number(el.getAttribute('y'));
            let region = el.getAttribute('region');
            console.log(`activate at ${x},${y} with region==${region} in mode=${this.mode}, remove=${this.regionRemove} and selection=${this.selection}`);
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
                    if (this.selectionValid) {
                        if (this.regionRemove) {
                            clearSelection();
                        } else {
                            setRegion();
                        }
                    }
                    if (this.selection.length==0) {
                        this.regionRemove = true;
                    }
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
            this.showRegions();
        };

        let ev = (el)=>{
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
                this.divs[x][y].style.backgroundImage = this.makeSVG(false, "#aaaaaa");
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
                    color = this.selectionValid ? "#00ff00" : "#ff0000";
                }
                if (region>=0) {
                    color = `hsl(${360/10*region+20} 100% 50%)`;
                }
                console.log(`${x},${y} color=${color}, nbrs=${nbrs}`);
                let svg = this.makeSVG(region==-2, color, nbrs);
                let update = function(url, div) {
                    let i = new Image();
                    i.addEventListener('load', ()=>{
                        div.style.backgroundImage = `url('${url}')`;
                    }, {once:true});
                    i.src = url;
                };
                update(svg, this.divs[x][y]);
            }
        }
    }

}