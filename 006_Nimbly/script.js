(function () {
    "use strict";

    const mcts = require("mcts")

    const cardgame = require("nimbly")

    let game = null;
    let ai = null;

    var maxTrials = 1000
    var maxTime = 5000
    var timer

    let player_num = 4
    const RANK = 0

    // always stop at human_id
    const human_id = 4-1

    // no need after human click pick involved
    let pick_count = 0

    let player_idx = -1
    let human_turn = false

    const msgP = document.getElementById("msg");
    var searchData = document.querySelectorAll("[id^='searchdata-']")

    var center_piles = document.getElementById("center-piles")
    var pick = document.getElementById("pick")
    
    var result = document.getElementById("result")
    var current_plays = document.getElementById("current-plays")
    var collect_hands = document.getElementById("collect-hands")

    var prevSearchDataTurn = 0;
    var prevSearchData = "";
    var currSearchData = "";

    // just test, ismcts search datas in future
    for(let i=0; i<player_num; i++){
        searchData[i].innerHTML = `${i}, data${i} here`
    }

    function computerMove_continue(state, player_idx) {
        var now = Date.now();
        if (now-state.startTime < maxTime && ai.continueThinking(state, 1000)) {
            //$("#msg").text("Thinking... ("+Math.ceil((maxTime-(now-state.startTime))/1000)+"s)");
            msgP.textContent = "Thinking... ("+Math.ceil((maxTime-(now-state.startTime))/1000)+"s)";
            timer = window.setTimeout(function() {
            computerMove_continue(state, player_idx)
            }, 0);
            return;
        }

        let ai_action = ai.stopThinking(state);
        game.doAction(ai_action)

        // post processing
        current_plays.innerHTML += `player${player_idx+1} pick: ${ai_action}||<br>`
        // collect_hands
        collect_hands.innerHTML += game.getPlayerCollects(player_idx)
        pick_count ++

        // next oneCard
        // currentPlayer updated after doAction
        let new_player_idx = game.currentPlayer - 1
        oneCard(new_player_idx)
    }

    function computerMove(player_idx){
        var state = ai.startThinking(game);
        state.startTime = Date.now();
        computerMove_continue(state, player_idx)
    }

    // large recursive
    function oneCard(player_idx) {
        // stop criteria
        //if(player_idx == human_id){
        if(pick_count >= player_num){
            result.innerHTML += structuredClone(current_plays.innerHTML) + `<br>`

            if(game.isGameOver()){
                result.innerHTML += `final scores: ${game.scores}, winner: ${game.winner_arr}`
            }
            // activate human pick
            return ;
        }


        computerMove(player_idx)

    }

    
    function halfCycle() {
        // maybe human_turn no need?
        if(!game.isGameOver() && !human_turn){
            current_plays.innerHTML = ""
            collect_hands.innerHTML = ""

            // to get which player is playing now
            // before first cycle, random pick when constructing nimbly obj
            player_idx = game.currentPlayer - 1
            pick_count = player_idx// remove after human pick involved

            oneCard(player_idx)
        }
        else{
            msgP.textContent = `something wrong, gameover? ${game.isGameOver()}, human_turn? ${human_turn}`
        }
    }

    pick.addEventListener("click", halfCycle)

    // function connect to game Nimbly, check if cilck valid
    // try regular div, not button

    function layoutTable(game) {
        let table_piles = game.table_piles[RANK]

        for(let i=0; i<table_piles.length; i++){
            let pile_i = table_piles[i]

            for(let j=0; j<pile_i.length; j++){
                let cards_letter = game.pickCard(i, j)
                let card_ele = document.createElement("div");
                card_ele.textContent = cards_letter
                center_piles.appendChild(card_ele)
            }
        }
    }


    function newGame() {
        game = new cardgame.Game()

        layoutTable(game)

        ai = new mcts.MCTSPlayer({ nTrials: maxTrials, rewardsFunc: game.rewardsFunc });


        prevSearchDataTurn = 0;
        prevSearchData = "";
        currSearchData = "";
        ai.searchCallback = function(state) {
            var data = "["+state.root.count+" trials; "+state.time+" msecs]\n";
            for (var i = 0; i < state.root.children.length; i++) {
                var n = state.root.children[i];
                data += (n === state.best?"*":" ")+" "+n.toString()+"\n";
            }
            if (state.best) {
                data += "avgSearchDepth "+state.avgSearchDepth.toFixed(4)+
                        "\navgGameDepth "+state.avgGameDepth.toFixed(4)+
                        "\navgBranchingFactor "+state.avgBranchingFactor.toFixed(4)+
                        "\n";
            }
            currSearchData = data;

            searchData[game.currentPlayer-1].innerHTML = "<pre>"+prevSearchData+currSearchData+"</pre>";
        }
    }


    newGame()

    // just for test
    // set player collect
    /*
    game.player_collects = [
                                [0, 2, 9, 20, 27, 29, 32, 33, 35],
                                [1, 16, 18, 19, 22, 23, 25, 26, 28],
                                [3, 8, 11, 12, 13, 15, 17, 21, 31],
                                [4, 5, 6, 7, 10, 14, 24, 30, 34 ]
                            ]
    // run endGame
    console.log("game end: ", game.endGame())
    */

})();