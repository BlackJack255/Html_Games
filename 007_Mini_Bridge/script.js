(function () {
    "use strict";
    const ismcts = require("ismcts")

    const cardgame = require("miniBridge")

    let game = null;
    let ai = null;

    var maxTrials = 10000
    var maxTime = 10000
    var timer

    let player_num = 4

    const real_play = true

    const human_id = 4-1
    const human_partner = 2-1
    let dummy_id = -1
    const dummy_reveal_turn = 2

    let dummy_cardMap = null

    const playerMap = new Map()
    playerMap.set(1, "West")
    playerMap.set(2, "North")
    playerMap.set(3, "East")
    playerMap.set(4, "South")

    const suitMap = new Map()
    suitMap.set(0, "S")
    suitMap.set(1, "H")
    suitMap.set(2, "D")
    suitMap.set(3, "C")

    // have card
    const USED = 1
    const VALID = 0

    let start_idx = -1
    let human_turn = false

    var nextTrick = document.getElementById("next-trick")


    const msgP = document.getElementById("msg");
    var searchData = document.querySelectorAll("[id^='searchdata-']")

    var hcp_info = document.getElementById("hcp-info")
    var contract_info = document.getElementById("contract-info")

    var dummy_hands = document.getElementById("dummy-hands")
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

        // if ai game.dummy played, disable button
        // dummy not human, nor partnor
        if((dummy_id <0) && (game.previousPlayer==game.dummy) && (game.dummy-1!=human_partner) && (game.dummy-1!=human_id) ){
            if(dummy_cardMap==null){
                console.log(`Since dummy is opponent, dummy_cardMap should be prepared, but null`)
            }
            // cardMap
            let rank = ai_action.card_rank
            let idx = dummy_cardMap.get(rank)
            let card_i = dummy_hands.children[idx]
            card_i.disabled = true
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

        if(game.currentTurn == dummy_reveal_turn){
            dummyReveal()
        }

        // change this to stop at human id
        // also stop if dummy is human_partner
        if(card_count >= player_num || player_idx==human_id || player_idx==dummy_id){

            // post processing trick if all players played
            // do all played case only and skip human if card_count reached max
            if(card_count >= player_num){
                dealTrick()
                nextTrick.removeAttribute("disabled")
            }
            else if(player_idx==human_id || player_idx==dummy_id){
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

            // also check game.currentPlayer
            if(Number(event.target.dataset.player_id) == game.currentPlayer){
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
                    let card_count = game.previousPlayer-1 - start_idx
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
                msgP.textContent = `seems not player's turn, player ${event.target.dataset.player_id} wants to play but currentPlayer is ${game.currentPlayer}`
            }
        }
        else{
            msgP.textContent = `human_turn? ${human_turn}, consider click Next Trick first`
        }
    }
    function dummyWarn() {
        msgP.textContent = `Dummy is not your partner under this contract`
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
            let trick_str = ""
            let win_str = ""
            for(let i=0; i<game.winner_arr.length; i++){
                trick_str += String(game.trick_count[i]) + "| "
                win_str += String(game.winner_arr[i]) + "| "
            }
            result.innerHTML += `tricks: ${trick_str}, final: ${win_str}`
        }

        console.log("----------------------------------------------------")
    }

    function dummyReveal() {
        if(game.currentTurn == dummy_reveal_turn){
            game.revealDummy()

            // card button
            // also listen afterMove
            let dummy_pos = game.dummy-1
            // force dummy be North if dummy is human_id
            if(dummy_pos == human_id){
                dummy_pos = human_partner
            }
            let dummy_card_arr = game.hand_table[dummy_pos]
            let card_count = 0
            for(let i=0; i<dummy_card_arr.length; i++){
                if(dummy_card_arr[i] == VALID){
                    var card_i = document.createElement('button')
                    let card_rank = i
                    let letter = game.num2Letter(card_rank)

                    card_i.textContent = letter
                    card_i.style.width = "auto";  // Or dynamicButton.style.width = "";
                    card_i.style.height = "auto";
                    card_i.value = card_rank
                    card_i.dataset.player_id = String(game.currentPlayer)

                    // add listener
                    if(game.currentPlayer-1 == human_partner || (game.currentPlayer-1 == human_id)){
                        card_i.addEventListener("click", (event) => afterMove(event))
                    }
                    else{
                        dummy_cardMap.set(card_rank, card_count)
                        card_i.addEventListener("click", () => dummyWarn())
                    }
                    card_count++

                    dummy_hands.appendChild(card_i)
                }
            }
        }

    }

    function replayAgain() {
        if(game!=null){
            game.replay()

            let cards_array = human_hands.children
            for(let i=0; i<cards_array.length; i++){
                cards_array[i].removeAttribute("disabled")
            }

            if(dummy_cardMap){
                dummy_cardMap.clear()
            }
            dummy_hands.replaceChildren()

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

        let deal_done = false
        while(!deal_done)
        {
            game.deal()
            deal_done = game.bidding()
        }

        let hcp_str = `HCP: `
        for(let i=0; i<player_num; i++){
            hcp_str += `${playerMap.get(i+1)}: ${game.hcp_got[i]}, `
        }
        hcp_info.innerHTML = hcp_str

        let contract_str = `Contract: `
        // temporary fix base contract level as 6
        contract_str += `${playerMap.get(game.declarer)}  ${game.contract_level-6}${suitMap.get(game.trump)}`
        contract_info.innerHTML = contract_str

        // no matter declarer is South(human) or North(partner), force North be dummy
        if(game.dummy-1 == human_partner || game.dummy-1 == human_id){
            dummy_id = human_partner
            dummy_cardMap = null
        }
        else{
            dummy_id = -1
            dummy_cardMap = new Map()
        }


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
                card_i.dataset.player_id = String(human_id+1)

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