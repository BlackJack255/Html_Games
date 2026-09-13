(function () {
    "use strict";
    const ismcts = require("ismcts")

    const cardgame = require("fourjacks")

    let game = null;
    let ai = null;

    var maxTrials = 10000
    var maxTime = 10000
    var timer

    let player_num = 4

    const real_play = true

    const human_id = 4-1

    var nextTrick = document.getElementById("next-trick")


    const msgP = document.getElementById("msg");
    var searchData = document.querySelectorAll("[id^='searchdata-']")
    var current_plays = document.getElementById("current-plays")
    var result = document.getElementById("result")


    var prevSearchDataTurn = 0;
    var prevSearchData = "";
    var currSearchData = "";

    // just test, ismcts search datas in future
    for(let i=0; i<player_num; i++){
        searchData[i].innerHTML = `${i}, data${i} here`
    }




    // part recursive
    function computerMove_continue(state, card_count, start_idx) {
        var now = Date.now();
        if (now-state.startTime < maxTime && ai.continueThinking(state, 1000)) {
            //$("#msg").text("Thinking... ("+Math.ceil((maxTime-(now-state.startTime))/1000)+"s)");
            msgP.textContent = "Thinking... ("+Math.ceil((maxTime-(now-state.startTime))/1000)+"s)";
            timer = window.setTimeout(function() {
            computerMove_continue(state, card_count, start_idx)
            }, 0);
            return;
        }
        // all post processing here

        let ai_action = ai.stopThinking(state);

        game.doAction(ai_action, real_play)

        let card_rank = game.temp_card

        current_plays.innerHTML += `&nbsp; ${card_rank} &nbsp;||`

        if(game.currentPlayer == 1) {
            current_plays.innerHTML += `<br>`
        }

        // next oneCard
        oneCard(card_count+1, start_idx)

    }

    // part recursive
    function computerMove(card_count, start_idx) {
        var state = ai.startThinking(game);
        state.startTime = Date.now();
        computerMove_continue(state, card_count, start_idx)
        /*
        timer = window.setTimeout(function() {
            computerMove_continue(state)
        }, 0);
        */
    }

    // large recursive
    // oneCard -> computerMove -> computerMove_continue -> (loop)
    function oneCard(card_count, start_idx) {
        let player_idx = (start_idx+card_count) % player_num

        // change this to stop at human id
        if(card_count >= player_num){

            // post processing trick if all players played
            if(card_count >= player_num){
                dealTrick()
            }

            // left here empty if stop at human
            return ;
        }

        // maybe no need if_lead
        let if_lead = false
        if (card_count==0) {
            if_lead = true
        }

        // need to be last in function
        computerMove(card_count, start_idx)
    }


    // no more loop, be recursive like
    async function halfTrick() {

        if(!game.isGameOver()){
            // reset
            // maybe consider reset in afterMove?
            let card_count = 0
            current_plays.innerHTML = ""


            // to get which player is playing now
            // before first trick, random pick when constructing fourjack obj
            let start_idx = game.currentPlayer-1
            //player_idx = game.currentPlayer-1

            // for print html only
            for(let i=0; i<start_idx; i++){
                current_plays.innerHTML += `&nbsp;&nbsp; == &nbsp;&nbsp;||`
            }

            // stop at human_id in future
            /*
            while ( card_count<player_num && player_idx != human_id ) {
                // lead

                // contain computerMove, so need to be last in function
                //oneCard()
                
            }
            */
            oneCard(card_count, start_idx)

            // temporary still AI plays human_id
            /*
            if (card_count==0) {
                if_lead = true
            }

            oneCard()
            card_count += 1
            player_idx = (start_idx+card_count) % player_num
            if_lead = false
            */

            // temporary call afterMove here
            //afterMove()


            // determine who wins
            // check if played enough cards inside

        }


    }

    nextTrick.addEventListener("click", halfTrick)


    // maybe no need afterMove
    function afterMove() {
        // human_id + 1 to finish a trick
        // card_count continues
        // no more lead
        while(card_count < player_num){
            oneCard()
            card_count += 1
            player_idx = (start_idx+card_count) % player_num
        }
    }

    function dealTrick() {
        result.innerHTML += structuredClone(game.trick_str) + `<br>`

        game.showTable()

        //showPublic()


        if(game.isGameOver()){
            let win_str = ""
            for(let i=0; i<game.winner_arr.length; i++){
                win_str += String(game.winner_arr[i]) + "| "
            }
            result.innerHTML += `${win_str}`
        }

        console.log("----------------------------------------------------")
    }



    function newGame() {
        game = new cardgame.Game()

        ai = new ismcts.MCTSPlayer({ nTrials: maxTrials, rewardsFunc: game.rewardsFunc });


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
    game.showTable()

})();