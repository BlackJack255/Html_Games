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

    // have card
    const USED = 1
    const VALID = 0

    let start_idx = -1
    let human_turn = false

    var nextTrick = document.getElementById("next-trick")


    const msgP = document.getElementById("msg");
    var searchData = document.querySelectorAll("[id^='searchdata-']")

    var human_hands = document.getElementById("human-hands")
    var current_plays = document.getElementById("current-plays")
    var result = document.getElementById("result")

    var replay_again = document.getElementById("replay-again")


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
        game.afterAction()

        let card_rank = game.playedLetter

        current_plays.innerHTML += `&nbsp; ${card_rank} &nbsp;||`

        if(card_count<player_num-1 && game.currentPlayer == 1) {
            console.log(`currentPlayer: ${game.currentPlayer}`)
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
        if(card_count >= player_num || player_idx==human_id){

            // post processing trick if all players played
            // do all played case only and skip human if card_count reached max
            if(card_count >= player_num){
                dealTrick()
                nextTrick.removeAttribute("disabled")
            }
            else if(player_idx == human_id){
                // allow human play
                nextTrick.disabled = true
                human_turn = true
            }
            return ;
        }

        // maybe no need if_lead
        let if_lead = false
        if (card_count==0) {
            if_lead = true
        }

        // prepare final_table, for draw information sets
        game.prepareDraw()

        // need to be last in function
        computerMove(card_count, start_idx)
    }


    // no more loop, be recursive like
    function halfTrick() {

        if(!game.isGameOver() && !human_turn){
            // reset
            // maybe consider reset in afterMove?
            let card_count = 0
            current_plays.innerHTML = ""


            // to get which player is playing now
            // before first trick, random pick when constructing fourjack obj
            start_idx = game.currentPlayer-1
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
        else{
            msgP.textContent = `something wrong, gameover? ${game.isGameOver()}, human_turn? ${human_turn}`
        }


    }

    nextTrick.addEventListener("click", halfTrick)


    // maybe no need afterMove
    function afterMove(event) {
        if(human_turn){
            let card_rank = event.target.value

            // check if in allActions
            let human_allAct = game.humanActions()
            let allow = false
            for(let i=0; i<human_allAct.length && !allow ; i++){
                let card_i = human_allAct[i].card_rank
                if(card_rank == card_i){
                    allow = true
                }
            }
            if(allow){
                let human_action = new cardgame.Action(card_rank)
                game.doAction(human_action, real_play)
                game.afterAction()

                let card_letter = game.playedLetter

                // print on html
                current_plays.innerHTML += `&nbsp; ${card_letter} &nbsp;||`

                if(game.currentPlayer == 1) {
                    current_plays.innerHTML += `<br>`
                }

                // human_id + 1 to finish a trick
                // card_count continues
                // no more lead
                let card_count = human_id - start_idx
                if(card_count < 0){
                    card_count = card_count + player_num
                }

                human_turn = false
                event.target.disabled = true

                oneCard(card_count+1, start_idx)
            }
            else{
                msgP.textContent = `choose another card, need follow suit, see allAction: ${human_allAct}`
            }
        }
        else{
            msgP.textContent = `human_turn? ${human_turn}, consider click Next Trick first`
        }
    }

    function dealTrick() {
        // for print html only
        if(start_idx>0){
            for(let i=start_idx; i<player_num; i++){
                current_plays.innerHTML += ` &nbsp;&nbsp; == &nbsp;&nbsp;||`
            }
        }
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

    function replayAgain() {
        if(game!=null){
            game.replay()

            let cards_array = human_hands.children
            for(let i=0; i<cards_array.length; i++){
                cards_array[i].removeAttribute("disabled")
            }

            for(let i=0; i<player_num; i++){
                searchData[i].innerHTML = `${i}, data${i} here`
            }

            current_plays.innerHTML = ""
            result.innerHTML = `Result:<br>`

            nextTrick.removeAttribute("disabled")
            human_turn = false
        }
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


        // create human hand gui
        let human_card_arr = game.hand_table[human_id]
        for(let i=0; i<human_card_arr.length; i++){
            if(human_card_arr[i] == VALID){
                var card_i = document.createElement('button')
                let card_rank = i
                let letter = game.num2Letter(card_rank)

                card_i.textContent = letter
                card_i.style.width = "auto";  // Or dynamicButton.style.width = "";
                card_i.style.height = "auto";
                card_i.value = card_rank

                // add listener
                card_i.addEventListener("click", (event) => afterMove(event))


                human_hands.append(card_i)
            }
        }
        human_turn = false

        replay_again.addEventListener("click", () => replayAgain())

    }

    newGame()
    game.showTable()



    document.getElementById("maxtrials").addEventListener("change", (event) => {
        maxTrials = event.target.value;
        if(ai){
            ai.nTrials = maxTrials;
        }
    });

    document.getElementById("maxtime").addEventListener("change", (event) => {
        maxTime = event.target.value
    });

})();