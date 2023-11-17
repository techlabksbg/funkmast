

export class UI {
    
    constructor(model) {
        this.griddiv = document.getElementById("griddiv");
        this.model = model;
        this.width = model.width;
        this.height = model.height;
        this.initGrid();
        this.selected = [];
        this.activex = undefined;
        this.activey = undefined;
    }

    initEventHandlers(el) {

        let toggle = (el)=>{
            console.log(`toggle ${el.innerText}`);
            let x = el.getAttribute('x');
            let y = el.getAttribute('y');
            let region = el.getAttribute('region');
            if (region==-1) {
                el.setAttribute('region', -2);
                el.classList.add('selected');
            }
            if (region==-2) {
                el.setAttribute('region', -1);
                el.classList.remove('selected');
            }
        };

        let ev = (el)=>{
            if (el===undefined) {
                this.activex = undefined;
                this.activey = undefined;
            } else {
                let x = el.getAttribute('x');
                let y = el.getAttribute('y');
                
                if (this.activex===undefined || this.activex!=x || this.activey!=y) {
                    this.activex = x;
                    this.activey = y;
                    toggle(el);
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