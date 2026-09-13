// create object, store at this.exports_sth
(function(exports, require){

// input: exports, means this.exports_isMcts, see // check name

// mcts: means this.exports_mcts
const mcts = require('mcts');


// wrong, changed reference, so this.exports_isMcts lost
//exports = mcts

// try add properties into exportss
// as inherit?
// preserve exports as this.exports_isMcts
// assign is shallow copy, here ok
// if deep copy, then assign(exports, structuredClone(mcts))
Object.assign(exports, mcts)






// override
// only determinized actions allow, subset of all determinized combinations
// deal with non-root, not-currentPlayer nodes
// but including root, currentPlayer, easier to implement logic
// since stopThinking also using, so need preverve perfect information mode, default_para null
exports.MCTSNode.prototype.selectChild = function(c, determinedActions=null) {
    var sa = null;
    var sv;
    for (var i = 0; i < this.children.length; i++) {
        var a = this.children[i];
        var v = (1.0*a.values[a.player-1])/(1+a.count)
            + c*Math.sqrt(Math.log(1+this.count)/(1+a.count))
            + Math.random()*1e-6;
        if (sa == null || v > sv) {
            sa = a;
            sv = v;
        }
    }
    return sa;
};

// override
exports.MCTSPlayer.prototype.startThinking = function(g) {
    var state = { game: g, turn: g.currentTurn, root: new exports.MCTSNode(g, null), best: null, time: 0, avgSearchDepth: 0, avgGameDepth: 0, avgBranchingFactor: 0 };
    var root = state.root;
    root.cumSearchDepth = 0;
    root.cumGameDepth = 0;
    root.parentNodeCount = 0;
    root.totalNodeCount = 1;
    if (!root.children) {
        root.children = g.allActions().map(function (a) { return new exports.MCTSNode(g, a) });
        root.parentNodeCount += 1;
        root.totalNodeCount += root.children.length;
    }
    if (this.searchCallback) {
        this.searchCallback(state);
    }
    return state;
}

// override
exports.MCTSPlayer.prototype.continueThinking = function(state, nt) {
    var g = state.game;
    var root = state.root;
    if (root.children.length <= 1 || root.count >= this.nTrials) {
        return false;
    }
    var t0 = root.count;
    var t1 = Math.min(this.nTrials, root.count+nt);
    var time0 = Date.now();
    for (var t = t0; t < t1; t++) {
        var tg; // copy current game state for new trial
        if (g.nondeterministic && this.nTrialsPerSeed) {
            // use determinization, running nTrialsPerSeed with the same PRNG seed
            if (root.count % this.nTrialsPerSeed == 0) {
                state.seed = new exports.PRNGSeed();
                if (root.children) {
                    // subtree node states potentially change with each seed, so we
                    // clear the children of the top-level actions on seed change
                    // (top-level values will be an average over all trials)
                    for (var i = 0; i < root.children.length; i++) {
                        root.children[i].children = null;
                    }
                }
            }
            tg = g.copyGame(new exports.PRNG(state.seed));
        } else {
            tg = g.copyGame();
        }
        var vns = [root]; // track visited nodes
        // select next child to explore
        var n = root.selectChild(this.c);
        vns.push(n);
        tg.doAction(n.action);
        var depth = 1;
        // repeat to frontier of explored game tree
        while (!tg.isGameOver() && n.children) {
            n = n.selectChild(this.c);
            vns.push(n);
            tg.doAction(n.action);
            depth += 1;
        }
        // if game isn't over, expand frontier node and select a child to explore
        if (!tg.isGameOver()) {
            n.children = tg.allActions().map(function (a) { return new exports.MCTSNode(tg, a) });
            root.parentNodeCount += 1;
            root.totalNodeCount += n.children.length;
            n = n.selectChild(this.c);
            vns.push(n);
            tg.doAction(n.action);
            depth += 1;
        }
        var searchDepth = depth;
        // random playout to end of game
        while (!tg.isGameOver()) {
            var rp_as = tg.allActions();
            root.parentNodeCount += 1;
            root.totalNodeCount += rp_as.length;
            var rp_a = rp_as[Math.floor(Math.random()*rp_as.length)];
            tg.doAction(rp_a);
            depth += 1;
        }
        var gameDepth = depth;
        // apply rewards to visited nodes
        var rewards = this.rewardsFunc(tg);
        for (var i = 0; i < vns.length; i++) {
            vns[i].updateValues(rewards);
        }
        root.cumSearchDepth += searchDepth;
        root.cumGameDepth += gameDepth;
    }
    state.time += Date.now()-time0;
    if (root.count > 0) {
        state.avgSearchDepth = (1.0*root.cumSearchDepth/root.count);
        state.avgGameDepth = (1.0*root.cumGameDepth/root.count);
        state.avgBranchingFactor = 1.0*(root.totalNodeCount-1)/root.parentNodeCount;
    }
    if (this.searchCallback) {
        this.searchCallback(state);
    }
    return (root.count < this.nTrials);
};


// stopThinking using root to get children, should same as perfect information case


// check names
}(typeof exports === 'undefined' ? this.exports_ismcts = {} : exports, typeof exports === 'undefined' ? function(m) { return this['exports_'+m] } : require));
// function(i, j){ //sth }(i, j) means execute after including thin js)