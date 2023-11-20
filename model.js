import { WordList } from "./wordlist.js";

export class Model {

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.minchars = 4;
        this.maxchars = 8;
        this.wordlist = new WordList();

        // Two-dimensional Array letters[x][y], x is the column, y the row
        this.letters = new Array(this.width).fill(0).map((e) => (new Array(this.height)).fill(""));

        // Two-dimensional Array indicating the region number of a field (for one single big region)
        this.regionNumber = new Array(this.width).fill(0).map((e) => (new Array(this.height)).fill(0));
        // Number of regions
        this.numRegions = 1;

        let minutes = Math.floor(new Date().getTime() / 120000);  // new puzzle every 2 minutes
        this.random = this.mulberry32(minutes | 1);
        console.log(`minutes = ${minutes} this.random()=${this.random()}`);
        this.randomRegions();
        while (true) {
            this.fillRegions();
            if (this.solve()==1) {
                break;
            }
        }
    }

    // From https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
    mulberry32(a) {
        return function() {
          var t = a += 0x6D2B79F5;
          t = Math.imul(t ^ t >>> 15, t | 1);
          t ^= t + Math.imul(t ^ t >>> 7, t | 61);
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
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


    regionsToString(regions) {
        let str = "";
        for (let y=0; y<this.height; y++) {
            for (let x=0; x<this.width; x++) {
                str+= "+";
                if (y==0 || regions[x][y]!=regions[x][y-1]) {
                    str += "---"
                } else {
                    str += "   "
                }
            }
            str+="\n"
            for (let x=0; x<this.width; x++) {
                if (x==0 || regions[x][y]!=regions[x-1][y]) {
                    str += `| ${this.letters[x][y]} `
                } else {
                    str += `  ${this.letters[x][y]} `
                }
            }
            str+="\n";
        }
        return str;
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
        let bailout = 100;
        while (!this.maybeRandomRegions()) {
            bailout--;
            if (bailout<=0) {
                throw "Could not partition in to regions"
            }
        }
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
            let i = Math.floor(this.random()*edges.length);
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
        let bailout = n;
        while (Math.max(...sizes)>this.maxchars) {
            bailout--;
            if (bailout<=0) return false;
            //console.log(sizes);
            //console.log(Math.max(...sizes));
            let e = Math.floor(this.random()*tree.length);
            let starte = e;
            while (true) {
                let [u,v] = tree[e];
                let su = this.getTreeSize(nbrs, u, v);
                let sv = this.getTreeSize(nbrs, v, u);
                //console.log(`Splitting at edge e=${e} nodes ${u},${v}, sizes ${sv} and ${su}`);
                if (su>=this.minchars && sv>=this.minchars) {
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
                    // console.log("No way!");
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


    fillRegions() {
        let numPerLength = new Array(this.maxchars+1).fill(0);
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
        let lenlist = this.wordlist.randomCollection(numPerLength, this.random);
        for (let r=0; r<this.numRegions; r++) {
            let word = lenlist[numLettersPerRegion[r]].splice(0,1)[0];
            let numLetters = 0;
            for (let y=0; y<this.height; y++) {
                for (let x=0; x<this.width; x++) {
                    if (this.regionNumber[x][y]==r) {
                        let c = word[numLetters];
                        this.letters[x][y] = c;
                        numLetters++;
                    }
                }
            }
        }
    }

    // check if the cells denoted by the coordinates in the array coords are all connected
    connected(coords) {
        let ok = new Array(coords.length).fill(false);
        ok[0] = true;
        let okCount = 1;
        let todo = [0];
        while (todo.length>0) {
            let i = todo.pop()
            for (let j=0; j<coords.length; j++) {
                if (!ok[j] && Math.abs(coords[i][0]-coords[j][0])+Math.abs(coords[i][1]-coords[j][1]) == 1) {
                    ok[j] = true;
                    okCount++;
                    todo.push(j);
                }
            }
        }
        return okCount==coords.length
    }

    getWordFound(curUsed) {
        let word = "";
        for (let i=0; i<curUsed.length; i++) {
            word += this.letters[curUsed[i][0]][curUsed[i][1]];
        }
        return word;
    }

    // used[x][y]==-1 for unused cells
    // curUsed is an Array of [x,y] coordinates, denoting the cells chosen for a word
    // pft is the current prefix tree.
    //
    //  TODO: optimize this for obviously non-connected regions
    //
    tryNextLetter(used, curUsed, pft) {
        let found = [];
        for (let letter in pft) {
            if (letter=='_') {
                if (this.connected(curUsed)) {
                    //console.log(`Found word ${this.getWordFound(curUsed)}`);
                    found.push(curUsed.map((e)=>e));
                }
            }
            let [x,y] = curUsed[curUsed.length-1];
            let starty = y;
            //console.log(`Trying ${letter} at ${x},${y}, word so far: ${this.getWordFound(curUsed)}`);
            while (true) {
                x+=1;
                if (x>=this.width) {
                    x = 0;
                    y++;
                    if (y>=this.height || y>starty+1) {
                        break;
                    }
                }
                if (used[x][y]==-1 && this.letters[x][y]==letter) {
                    curUsed.push([x,y])
                    found = found.concat(this.tryNextLetter(used, curUsed, pft[letter]));
                    curUsed.pop()
                }
            }
        }
        return found;
    }

    // Work in progress: Attempt to solve a puzzle
    // used[x][y] denotes already used places
    // returns 0 if no word can be placed
    // or the number of solutions (will bail after 2 solutions found)
    placeNextWord(used, pft, curRegion=0) {
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
        // all full? So this is one solution, so return it.
        if (firstempty==-1) {
            //console.log(this.regionsToString(used));
            return 1;      
        }
        let [x,y] = firstempty;
        let curUsed = [[x,y]];
        let numSol = 0;
        //console.log(`Attempt to place at ${x},${y} with letter ${this.letters[x][y]}`);
        if (this.letters[x][y] in pft) {
            let words = this.tryNextLetter(used, curUsed, pft[this.letters[x][y]]);
            if (words.length>0) {
                this.wordCountSum += words.length;
                this.numWordcounts++;
            }
            for (let word of words) {
                for (let p of word) {
                    used[p[0]][p[1]] = curRegion
                }
                //console.log(this.regionsToString(used));
                numSol += this.placeNextWord(used, pft, curRegion+1);
                if (numSol>1) return numSol; // Bail if two solutions have been found
                for (let p of word) {
                    used[p[0]][p[1]] = -1;
                }
            }
            return numSol;
        } else {
            //console.log("I have no words...")
            return 0;
        }
    }


    // Work in progress: Attempt to solve a puzzle
    solve() {
        let prefixtree = {};
        for (let word of this.wordlist.list) {
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
        this.numWordcounts = 0;
        this.wordCountSum = 0;
        let n = this.placeNextWord(used, prefixtree);
        //console.log(`Total of ${n} solutions, total Wordcount=${this.wordCountSum}, mean wordcount=${this.wordCountSum/this.numWordcounts}`);
        return n;
    }

};
