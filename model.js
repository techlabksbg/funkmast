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

        // Two-dimensional Array indicating the region number of a field (for one single big region)
        this.regionNumber = new Array(this.width).fill(0).map((e) => (new Array(this.height)).fill(0));
        // Number of regions
        this.numRegions = 1;
        this.initGrid();
    }

    initGrid() {
        this.griddiv.innerHTML = "";  // Clear grid
        // Generate new divs in a two dimensional array
        this.divs = new Array(this.width).fill(0).map((e) => (new Array(this.height)).fill(0).map((e,i)=>{
            let d = document.createElement('div');
            return d;
        }));
        // Append the divs in the right order
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                this.griddiv.appendChild(this.divs[x][y]);
            }
        }
    }

    // Gets the size of tree at node cur, when ignoring the edge between cur and prev
    getTreeSize(nbrs, cur, prev) {
        let size = 1;
        nbrs[cur].forEach((next)=>{
            if (next!=prev) {
                size+=this.getTreeSize(nbrs, next, cur);
            }
        });
        return size;
    }

    // marks all labels with label in the tree containing start
    markTree(nbrs, start, labels, label) {
        labels[start] = label;
        nbrs[start].forEach((nbr)=>{
            if (labels[nbr]!=label) {
                this.markTree(nbrs, nbr, labels, label)
            }
        });
    }

    nbrsToString(nbrs) {
        let str = "";
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                let v = x+this.width*y;
                str+= "+";
                if (nbrs[v].includes(v+1)) {
                    str += "---"
                } else {
                    str += "   "
                }
            }
            str+="\n"
            for (let x=0; x<this.width; x++) {
                let v = x+this.width*y;
                if (nbrs[v].includes(v+this.width)) {
                    str += "|   "
                } else {
                    str += "    "
                }
            }
            str+="\n";
        }
        return str;
    }

    randomRegions() {
        while (!this.maybeRandomRegions());
    }

    // Generates random, connected regions of minimal size 4 and
    // maximum size 8
    maybeRandomRegions() {
        let n = this.width*this.height;
        let components = new Array(n).fill(0).map((e,i)=>i);
        let edges=[];
        let tree = [];
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                let v = x+this.width*y;
                if (x<this.width-1) {
                    edges.push([v,v+1]);
                }
                if (y<this.height-1) {
                    edges.push([v,v+this.width]);
                }
            }
        }
        while (edges.length>0) {
            let i = Math.floor(Math.random()*edges.length);
            let e = edges.splice(i,1)[0];
            let c0 = components[e[0]];
            let c1 = components[e[1]];
            if (c0!=c1) {
                components = components.map((c)=>c==c1 ? c0 : c);
                tree.push(e);
            }
        }
        let nbrs = new Array(n).fill(0).map(e=>[]);
        tree.forEach(e=>{
            nbrs[e[0]].push(e[1]);
            nbrs[e[1]].push(e[0]);
        });
        //console.log(this.nbrsToString(nbrs));
        let regnum = new Array(n).fill(0); // Single component
        this.numRegions = 1;
        let sizes = [n];
        let bailout = 20;
        while (Math.max(...sizes)>8) {
            bailout--;
            if (bailout<=0) break;
            //console.log(sizes);
            //console.log(Math.max(...sizes));
            let e = Math.floor(Math.random()*tree.length);
            let starte = e;
            while (true) {
                let [u,v] = tree[e];
                let su = this.getTreeSize(nbrs, u, v);
                let sv = this.getTreeSize(nbrs, v, u);
                //console.log(`Splitting at edge e=${e} nodes ${u},${v}, sizes ${sv} and ${su}`);
                if (su>3 && sv>3) {
                    // Remove edge from tree
                    tree.splice(e,1);
                    // Remove edge from neighbors
                    //console.log(`before nbrs[u]=${nbrs[u]}, nbrs[v]=${nbrs[v]}`);
                    nbrs[u] = nbrs[u].filter((nbr)=>nbr!=v);
                    nbrs[v] = nbrs[v].filter((nbr)=>nbr!=u);
                    //console.log(`after  nbrs[u]=${nbrs[u]}, nbrs[v]=${nbrs[v]}`);
                    // Mark the second component
                    //console.log(regnum);
                    this.markTree(nbrs, v, regnum, this.numRegions);
                    this.numRegions++;
                    //console.log(regnum);
                    sizes[regnum[u]]=su;
                    sizes[regnum[v]]=sv;
                    //console.log(sizes);
                    //console.log(this.nbrsToString(nbrs));
                    break;
                }
                e = (e+1) % tree.length;
                if (starte==e) {
                    console.log("No way!");
                    return false;
                }
            }
            //console.log(`hello max = ${Math.max(...sizes)}, sizes=${sizes}`)
        }
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                let v = x+this.width*y;
                this.regionNumber[x][y]=regnum[v];
            }
        }
        return true;
    }

    showRegions(clear = false) {
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                let color = clear ? "white" : `hsl(${360/this.numRegions*this.regionNumber[x][y]} 100% 50%)`;
                this.divs[x][y].style.backgroundColor=color;
            }
        }
    }



    fillRegions(wordlist) {
        let numPerLength = new Array(9).fill(0);
        let numLettersPerRegion = [];
        for (let r=0; r<this.numRegions; r++) {
            let numLetters=0;
            for (let y=0; y<this.height; y++) {
                for (let x=0; x<this.width; x++) {
                    if (this.regionNumber[x][y]==r) {
                        numLetters++;
                    }
                }
            }
            numLettersPerRegion[r] = numLetters;
            numPerLength[numLetters]++;
        }
        let lenlist = wordlist.randomCollection(numPerLength);
        console.log(numPerLength);
        console.log(lenlist);
        for (let r=0; r<this.numRegions; r++) {
            console.log(`Take one of ${lenlist[numLettersPerRegion[r]]}`);
            let word = lenlist[numLettersPerRegion[r]].splice(0,1)[0];
            console.log(word);
            let numLetters = 0;
            for (let y=0; y<this.height; y++) {
                for (let x=0; x<this.width; x++) {
                    if (this.regionNumber[x][y]==r) {
                        let c = word[numLetters].toUpperCase();
                        this.letters[x][y] = c;
                        this.divs[x][y].innerText = c;
                        numLetters++;
                    }
                }
            }
        }
    }

    // Work in progress: Attempt to solve a puzzle
    placeNextWord(used, nr) {
        let firstempty = -1;
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                if (used[x][y]==-1) {
                    firstempty = [x,y];
                    break;
                }
            }
            if (firstempty!=-1) break;
        }
        
    }


    // Work in progress: Attempt to solve a puzzle
    solve(wordlist) {
        let prefixtree = {};
        for (let word of wordlist.list) {
            let t = prefixtree;
            for (const c of word) {
                if (!(c in t)) {
                    t[c] = {};
                } 
                t=t[c];
            }
            t['_']=0;
        }
        let used = new Array(this.width).fill(0).map((e)=> new Array(this.height).fill(-1));

    }

};
