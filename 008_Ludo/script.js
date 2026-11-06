(function () {
    "use strict";

    const mcts = require('mcts')
    const ludo = require('ludo')
    let game = null
    let ai = null

    var maxTrials = 1000
    var maxTime = 5000
    var timer

    const dice_max = 6

    // for 2D board initialization
    const default_player_num = 4
    // for game control
    let player_num = 4
    let human_num = 1
    let ai_num = 3

    let token_num = 4
    // home_col_len also base_diameters
    let home_col_len = 2
    let part_path_len = 2*home_col_len + 3
    let circuit_len = (part_path_len) * 4
    let board_cols = ((home_col_len+1)+1)*2 + 3

    const NONE = -1

    var board = document.getElementById("board")
    // map to div board grid, also 1-dim
    let path_map = new Map()
    let base_map = Array(default_player_num).fill(null).map(() => new Map())
    let home_map = Array(default_player_num).fill(null).map(() => new Map())

    // reference: https://symbl.cc/en/unicode-table/#geometric-shapes
    let icon_arr = ["⌺", "⌾", "◇", "▣", "◈", "◉", "☉"]
    let dice_arr = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"]
    let color_arr = ["red", "green", "yellow", "blue"]
    //let icon_color = ["rgb(235, 28, 36)", "rgb(2, 160, 75)", "rgb(224, 193, 29)", "rgb(17, 240, 206)"]
    var player_icon = [0, 1, 2, 3]
    var player_color = [0, 1, 2, 3]

    let clickable = false
    let action_i = null
    let from_sq = null
    let to_sq = null

    let roll_but = document.getElementById("roll")
    let roll_result = document.getElementById("roll-result")
    let pause_ms = 50

    let moves_info = document.getElementById("moves-info")

    var searchData = document.querySelectorAll("[id^='searchdata-']")
    var prevSearchDataTurn = 0;
    var prevSearchData = "";
    var currSearchData = "";
    // just test, ismcts search datas in future
    for(let i=0; i<player_num; i++){
        searchData[i].innerHTML = `${i+1}, data${i+1} here`
    }

    function pause(ms) {
        let promise_i = new Promise(resolve => setTimeout(resolve, ms));
        return promise_i
    }

    async function rollDice(){
        if(game.isGameOver()){
            moves_info.innerHTML = "Game over, see winner_arr: " + String(game.winner_arr)
        }
        else{
            let min_len = 12
            let max_len = 24
            let seq_len = Math.floor(Math.random() * (max_len-min_len)) + min_len
            // simulated sequences
            let seq = Array(seq_len).fill(-1)

            let rolling_str = "Rolling ... "

            for(let i=0; i<seq_len; i++){
                // shows from 1
                seq[i] = Math.floor(Math.random() * dice_max) + 1
                roll_result.innerHTML = rolling_str + String(seq[i])
                await pause(pause_ms)
            }

            rolling_str = "Rolled: "
            // then show result
            // in game, get human valid
            let {moves, if_valid, helped} = game.showRolled()

            roll_result.innerHTML = rolling_str + String(moves) + ", " + String(if_valid)
            
            moves_info.innerHTML = "player " + String(game.currentPlayer)

            if(helped){
                moves_info.innerHTML += " helps partner " + String(game.actualPlayer)
            }

            if(if_valid){
                // disable button
                

                // activate clickSquare, if it's human
                if(game.player_info[game.currentPlayer-1].if_human){
                    moves_info.innerHTML +=  ", choose a token to move"
                    console.log("human's turn")
                    clickable = true
                }
                else{
                    moves_info.innerHTML +=  ", ai moves"
                    computerMove()
                }
            }
            else{
                // change check logic
                if(game.reachSixMax()){
                    moves_info.innerHTML += ", consecutive rolled Six reached max, pass this turn"
                }
                else{
                    moves_info.innerHTML += ", no valid move, pass this turn"
                }
                game.pass()

                // still lock clickSquare
            }
        }
    }
    roll_but.addEventListener("click", ()=>rollDice())

    function computerMove() {
        var state = ai.startThinking(game);
        state.startTime = Date.now();
        timer = window.setTimeout(function() {
          computerMove_continue(state)
        }, 0);
    }

    function computerMove_continue(state) {
        var now = Date.now();
        if (now-state.startTime < maxTime && ai.continueThinking(state, 1000)) {
          //$("#msg").text("Thinking... ("+Math.ceil((maxTime-(now-state.startTime))/1000)+"s)");
          msgP.textContent = "Thinking... ("+Math.ceil((maxTime-(now-state.startTime))/1000)+"s)";
          timer = window.setTimeout(function() {
            computerMove_continue(state)
          }, 0);
          return;
        }
        var a = ai.stopThinking(state);
        console.log(`----- now ai stopped thinking -----`)

        let div_from = NONE
        let div_to = NONE
        if(a.from != NONE){
            if(a.if_home){
                div_from = home_map[game.actualPlayer-1].get(a.from)
                div_to = home_map[game.actualPlayer-1].get(a.to)
            }
            else{
                div_from = path_map.get(a.from)

                if(a.ready_home){
                    div_to = home_map[game.actualPlayer-1].get(a.to)
                }
                else{
                    div_to = path_map.get(a.to)
                }
            }
        }// token in base
        else{
            div_from = base_map[game.actualPlayer-1].get(a.token_id)
            div_to = path_map.get(a.to)
        }


        let from_square = board.children[div_from]
        from_square.classList.add("select")
        from_sq = from_square
        

        let target_sq = board.children[div_to]
        target_sq.classList.add("select")
        to_sq = target_sq
        

        updateAction(to_sq, a)
        // lock clickSquare until new dice roll
        clickable = false

        divPostProcess()
    }



    function updateSquareText(square) {
        let sq_type = square.dataset.type
        let home_i = Number(square.dataset.home_i)
        let ith = Number(square.dataset.ith)

        let sq_icon_arr = game.elementText(sq_type, home_i, ith)

        let block_type = game.blockedType(sq_type, ith)
        if(block_type=="blocked"){
            square.classList.add("block")
            square.classList.remove("semi-safe")
        }
        else if(block_type=="semi-safe"){
            square.classList.remove("block")
            square.classList.add("semi-safe")
        }
        else{
            square.classList.remove("block")
            square.classList.remove("semi-safe")
        }

        square.textContent = ""
        if(sq_icon_arr.length > 0){
            for(let i=0; i<sq_icon_arr.length; i++){
                let player_id = sq_icon_arr[i]
                square.textContent += icon_arr[player_icon[player_id]] + " "

                // temporary fixed
                if((i>0) && i%2 == 0){
                    square.textContent += "\n"
                }
            }
             
        }
    }
    // for both human and ai
    async function updateAction(to_square, action) {
        // doAction
        game.doAction(action)
        game.clearPrevious()
        

        // source from also remove class
        updateSquareText(from_sq)
        await pause(pause_ms*2)

        // animate?




        updateSquareText(to_square)
        await pause(pause_ms*2)
        

        
        let captured_player = game.capturedPlayer()
        if(captured_player >= 0){
            for(let i=0; i<token_num; i++){
                let sq_ith = base_map[captured_player].get(i)
                let base_sq = board.children[sq_ith]
                updateSquareText(base_sq)
            }
        }

        

        // check every token captured_player has

        // enable roll dice button
    }

    // ai process add class select on from_sq, to_sq
    function divPostProcess(square=null) {
        action_i = null
        game.clearSelect()

        // remove selects style
        if(square!=null){
            square.classList.remove("select")
        }
        if(from_sq!=null){
            from_sq.classList.remove("select")
        }
        if(to_sq!=null){
            to_sq.classList.remove("select")
        }
    }

    function clickSquare(square) {

        if(game.isGameOver()){
            moves_info.innerHTML = "Game over, see winner_arr: " + String(game.winner_arr)
        }
        else if(!clickable){
            moves_info.innerHTML = "Unable to click squares, maybe roll dice first"
        }
        else{
            let sq_type = square.dataset.type
            let home_i = Number(square.dataset.home_i)
            let ith = Number(square.dataset.ith)
            let valid = false
            console.log(`sq info: ${sq_type}, ${home_i}, ${ith}`)

            if(square.classList.contains("select")){
                // check if it's target square
                let fit_type = false
                // target is home square may be special cases
                if(sq_type=="home" && action_i.ready_home){
                    fit_type = true
                }
                else if((sq_type=="path" || sq_type=="safe") && !action_i.ready_home){
                    fit_type = true
                }


                if(fit_type && (ith==action_i.to)){
                    valid = true

                    // updateSquare
                    updateAction(square, action_i)

                    // lock clickSquare until new dice roll
                    clickable = false
                }
                // just debug
                else{
                    console.log(`cancel select`)
                }

                divPostProcess(square)
                
            }
            else{
                if(action_i == null){
                    let div_to = null
                    // check game with current square type
                    // action_i may update
                    if(sq_type=="path" || sq_type=="safe" ){
                        action_i = game.checkPathSquare(ith)
                        
                        if(action_i != null){
                            if(action_i.ready_home){
                                div_to = home_map[game.actualPlayer-1].get(action_i.to)
                            }
                            else{
                                div_to = path_map.get(action_i.to)
                            }
                        }
                    }
                    else if(sq_type=="base"){
                        action_i = game.checkBase(home_i, ith)
                        
                        if(action_i != null){
                            div_to = path_map.get(action_i.to)
                        }
                        else{
                            console.log(`action still null after checkBase`)
                        }
                    }
                    else if(sq_type == "home"){
                        action_i = game.checkHomeSquare(home_i, ith)
                        
                        if(action_i != null){
                            div_to = home_map[game.actualPlayer-1].get(action_i.to)
                        }
                        else{
                            console.log(`action null, in home square click`)
                        }
                    }
                    else{
                        console.log(`unexpected type, something's wrong`)
                    }

                    if(div_to != null){
                        from_sq = square
                        square.classList.add("select")

                        // target also add class
                        let target_sq = board.children[div_to]
                        target_sq.classList.add("select")
                        to_sq = target_sq
                    }
                    else{
                        console.log(`div_to still null`)
                    }

                }
                // just debug
                else{
                    console.log(`some squares be selected, no more select`)
                }

            }
        }
    }

    function setHomeCol(start_ith, direction, player_id){
        let count = 0
        for(let i=0; i<home_col_len+1; i++){
            let sq_ith = start_ith[0]*board_cols + start_ith[1]
            // map with count
            home_map[player_id].set(count, sq_ith)
            let sq = board.children[sq_ith]
            sq.textContent = String(count)
            sq.dataset.type = "home"
            sq.dataset.home_i = player_id
            sq.dataset.ith = count
            sq.dataset.sq_ith = sq_ith
            sq.classList.add(color_arr[player_color[player_id]])
            sq.addEventListener("click", (event)=> clickSquare(event.target))

            start_ith[0] += direction[0]
            start_ith[1] += direction[1]
            count ++
        }
    }

    function setBaseTokens(start_ith, direction, player_id){
        // token_num need smaller or equal to home_col_len^2

        // calculate step size
        let side_token_num = Math.ceil(Math.sqrt(token_num))
        let split_num = side_token_num + 1
        // preserve as float
        let step_size = home_col_len / split_num

        let step_int = Math.floor(step_size)
        
        let inner_start = [start_ith[0], start_ith[1]]
        // sqrt(2) theta-pi/4
        inner_start[0] += step_int * (direction[0]+direction[1])
        inner_start[1] += step_int * (direction[1]-direction[0])

        let token_count = 0

        // direction-pi/2
        let direction_i = [direction[1], -direction[0]]
        // same as direction
        let direction_j = [direction[0], direction[1]]
        let fill_done = false
        // for loop, from 1
        for(let i=step_size-step_int; (i<home_col_len-step_size)&&!fill_done; i+=step_size){
            // inner for loop
            for(let j=step_size-step_int; (j<home_col_len-step_size)&&!fill_done; j+=step_size){
                let current_ith = [inner_start[0], inner_start[1]]
                // i direction add
                let i_floor = Math.floor(i)
                current_ith[0] += i_floor * direction_i[0]
                current_ith[1] += i_floor * direction_i[1]
                // j direction add
                let j_floor = Math.floor(j)
                current_ith[0] += j_floor * direction_j[0]
                current_ith[1] += j_floor * direction_j[1]
                
                // mark, set mapping for player_i
                let sq_ith = current_ith[0]*board_cols + current_ith[1]
                base_map[player_id].set(token_count, sq_ith)
                let sq = board.children[sq_ith]
                sq.textContent = icon_arr[player_icon[player_id]]
                sq.dataset.type = "base"
                sq.dataset.home_i = player_id
                sq.dataset.ith = token_count
                sq.dataset.sq_ith = sq_ith
                sq.classList.add("base")
                sq.addEventListener("click", (event)=> clickSquare(event.target))
                token_count++

                // check if full count
                if(token_count >= token_num){
                    fill_done = true
                }

            }
        }

        
        
    }

    // for setPath
    // start_ith be reference, updated after return
    function straightSteps(start_ith, direction, step_num, start_count){
        let count = start_count
        console.log(`start_ith: ${start_ith}, direction: ${direction}`)
        for(let i=0; i<step_num; i++){
            let sq_ith = start_ith[0]*board_cols + start_ith[1]
            // map with count
            path_map.set(count, sq_ith)
            let sq = board.children[sq_ith]
            sq.textContent = String(count)
            sq.dataset.type = "path"
            sq.dataset.home_i = NONE
            sq.dataset.ith = count
            sq.dataset.sq_ith = sq_ith
            sq.classList.add("path")
            sq.addEventListener("click", (event)=> clickSquare(event.target))

            start_ith[0] += direction[0]
            start_ith[1] += direction[1]
            count ++
        }
    }

    function setPath(start_ith, direction, start_count, player_id){
        // fill in board
        let count = start_count
        let current_step = 0

        // 0th square is safe square
        let sq_ith = start_ith[0]*board_cols + start_ith[1]
        // map with count
        path_map.set(count, sq_ith)
        // deal with color of player_id
        let sq = board.children[sq_ith]
        sq.dataset.type = "safe"
        sq.dataset.home_i = NONE
        sq.dataset.ith = count
        sq.dataset.sq_ith = sq_ith
        sq.classList.add(color_arr[player_color[player_id]])
        sq.addEventListener("click", (event)=> clickSquare(event.target))

        start_ith[0] += direction[0]
        start_ith[1] += direction[1]
        count ++

        // move home_col_len steps, excetp 0th square
        current_step = home_col_len-1
        straightSteps(start_ith, direction, current_step, count)
        count += current_step

        // turn left, + pi/2
        // Trigonometric Addition
        // cos(theta+pi/2) 
        // sin(theta+pi/2)
        let temp = direction[0]
        direction[0] = -direction[1]
        direction[1] = temp

        // skip a step
        start_ith[0] += direction[0]
        start_ith[1] += direction[1]

        // move home_col_len steps
        // home_col_len-2, allow 0
        current_step = home_col_len-2
        straightSteps(start_ith, direction, current_step, count)
        count += current_step

        // safe square
        // class add safe css
        sq_ith = start_ith[0]*board_cols + start_ith[1]
        // map with count
        path_map.set(count, sq_ith)
        sq = board.children[sq_ith]
        sq.dataset.type = "safe"
        sq.dataset.home_i = NONE
        sq.dataset.ith = count
        sq.dataset.sq_ith = sq_ith
        sq.classList.add("safe")
        sq.addEventListener("click", (event)=> clickSquare(event.target))

        start_ith[0] += direction[0]
        start_ith[1] += direction[1]
        count ++

        // regular one step
        // current_step = 1
        current_step = 1
        straightSteps(start_ith, direction, current_step, count)
        count += current_step
        
        // turn right, - pi/2
        temp = direction[0]
        direction[0] = direction[1]
        direction[1] = -temp

        // two steps
        current_step = 2
        straightSteps(start_ith, direction, current_step, count)
        count += current_step

        // turn right, - pi/2
        temp = direction[0]
        direction[0] = direction[1]
        direction[1] = -temp

        // one step
        current_step = 1
        straightSteps(start_ith, direction, current_step, count)
        count += current_step

        return count
    }

    function newGame(){
        // game, ai
        game = new ludo.Game()
        game.setGame(player_num, human_num, ai_num, home_col_len, token_num, true)
        game.initial()

        if(ai_num > 0){
            // fix trailSeed temporary
            ai = new mcts.MCTSPlayer({nTrials: maxTrials, nTrialsPerSeed: 100, rewardsFunc: game.rewardsFunc})

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

        

        console.log("game: ", game)
        
        document.documentElement.style.setProperty('--board-cols', board_cols)

        for(let i=0; i<board_cols; i++){
            for(let j=0; j<board_cols; j++){
                let sq = document.createElement("div");
                sq.className = "square"
                board.appendChild(sq)
            }
        }

        // init player's color, icon, etc
        

        // setGame, init

        // temporary semi-fixed start xy grid
        let count = 0
        let start_ith = [ (home_col_len+1)+1, 1+1]
        let direction = [ 0, 1]
        // for loop
        for(let i=0; i<default_player_num; i++){
            // deep copy direction
            // theta+pi/2
            let base_direction = [direction[0], direction[1]]
            let temp = base_direction[0]
            base_direction[0] = -base_direction[1]
            base_direction[1] = temp
            
            let base_start = [start_ith[0]+base_direction[0], start_ith[1]+base_direction[1]]

            // just help for locate home_start
            // theta-pi/2
            let home_direction = [direction[0], direction[1]]
            temp = home_direction[0]
            home_direction[0] = home_direction[1]
            home_direction[1] = -temp

            let home_start = [start_ith[0]+home_direction[0], start_ith[1]+home_direction[1]]
            // later still using original directions
            home_direction = [direction[0], direction[1]]

            count = setPath(start_ith, direction, count, i)
            setBaseTokens(base_start, base_direction, i)
            setHomeCol(home_start, home_direction, i)
        }

        console.log("base_map: ", base_map)

        console.log("home map: ", home_map)

        // set background square at last
        // check length classList <= 1

    }

    newGame()


    // include human play mode

})();