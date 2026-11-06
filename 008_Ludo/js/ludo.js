(function(exports, require){


// fixed player num in 2D board
let player_num = 4
let human_num = 4
let ai_num = 0

let token_num = 2
let home_col_len = 2
let part_path_len = 2*home_col_len + 3
let circuit_len = (part_path_len) * 4
let goal = circuit_len-1 + home_col_len + 1

//let team_mode = true
// temporary fixed at two teams
const team_num = 2

const block_tokens = 2

const NONE = -1
let current_captured_player = NONE

// Game.currentPlayer help us fixed player id
let valid_actions = null
let if_valid = false
let select = null
let target_type = null // "path", "home"
let target = null
let captured_player = null

//let dice_arr = [6, 6, 2, 6, 1]

const dice_max = 6
const dice_consecu_max = 3

    
const mcts = require('mcts');

exports.Action = function(currentPlayer, actual_player, token_id, if_home, from, to, moves, ready_home, dice_consecu, turn){
    mcts.Action.call(this);

    this.turn = turn
    this.actual_player = actual_player
    this.token_id = token_id
    this.from = from
    this.to = to
    this.moves = moves
    this.currentPlayer = currentPlayer
    this.if_home = if_home
    this.ready_home = ready_home
    this.dice_consecu = dice_consecu
    

};

exports.Action.prototype.toString = function() {
    let s = ""
    //s += "turn: " + String(this.turn) + ", "
    //s += "actual_player: " + String(this.actual_player) + ", "
    s += "token_id: " + String(this.token_id) + ", "
    s += "from: " + String(this.from) + ", "
    s += "to: " + String(this.to) + ", "
    //s += "move: " + String(this.moves) + ", "
    //s += "currentPlayer: " + String(this.currentPlayer) + ", "
    s += "if_home: " + String(this.if_home) + ", "
    s += "ready_home: " + String(this.ready_home) + ", "
    //s += "dice_consecu: " + String(this.dice_consecu)

    return s
}


exports.Game = function(o, rng){
    if (o instanceof exports.Game) {
        mcts.Game.call(this, o, rng);

        this.path = structuredClone(o.path)
        this.safe = structuredClone(o.safe)
        this.team_mode = o.team_mode
        this.semi_safe = structuredClone(o.semi_safe)
        this.block = structuredClone(o.block)

        this.player_info = structuredClone(o.player_info)
        this.dice_consecu = o.dice_consecu
        // manual deep copy, since we know structure of this.moves
        this.moves = [o.moves[0]]

        this.team_list = structuredClone(o.team_list)
        this.actualPlayer = o.actualPlayer

        this.winner_arr = structuredClone(o.winner_arr)
    }
    else{
        mcts.Game.call(this, { nondeterministic: true, nPlayers: player_num })
        
        this.path = [
                        ...Array(circuit_len)
                        .fill(null)
                        .map(() => Array(player_num)
                                        .fill(null).map(() => new Set()))
                    ]
        this.safe = Array(circuit_len).fill(false)
        this.team_mode = true
        this.semi_safe = [
                        ...Array(circuit_len)
                            .fill(null)
                            .map(() => Array(team_num).fill(false))
                    ]
        this.block = [
                        ...Array(circuit_len)
                            .fill(null)
                            .map(() => Array(player_num).fill(false))
                    ]
        
        this.player_info = Array(player_num).fill(null)
        this.dice_consecu = 0
        this.moves = []

        this.team_list = null
        this.actualPlayer = NONE

        this.winner_arr = null

    }
}

exports.Game.prototype = Object.create(mcts.Game.prototype);

exports.Game.prototype.copyGame = function() {
    return new exports.Game(this);
};

exports.Game.prototype.setGame = function(player_num_new, human_num_new, ai_num_new, home_new_len, token_new_num, team_mode_new) {
    player_num = player_num_new
    human_num = human_num_new
    ai_num = ai_num_new
    
    // need at least 2
    home_col_len = home_new_len
    part_path_len = 2*home_col_len + 3
    circuit_len = (part_path_len) * 4
    goal = circuit_len-1 + home_col_len + 1

    // should not more than 4
    token_num = token_new_num

    this.team_mode = team_mode_new
}

function createToken(player_id, token_id, ele_ith, if_home) {
    var token_dict = {}
    token_dict.player_id = player_id
    token_dict.token_id = token_id
    token_dict.ele_ith = ele_ith
    token_dict.if_home = if_home

    return token_dict
}

function constructPlayer(player_id, if_human, start_pos, team_id){
    var player_dict = {}
    player_dict.if_human = if_human
    player_dict.start_pos = start_pos
    player_dict.base_arr = Array(token_num).fill(null)
    player_dict.home_column = Array(home_col_len+1).fill(null).map(() => new Set())
    player_dict.home_block = Array(home_col_len).fill(false)
    player_dict.goaled_num = 0
    player_dict.team_id = team_id
    
    player_dict.token_arr = Array(token_num).fill(null)
    player_dict.token_history = Array(token_num).fill(null).map(()=>[])

    for(let i=0; i<token_num; i++){
        player_dict.token_arr[i] = createToken(player_id, i, NONE, false)
        // same reference, record at base
        player_dict.base_arr[i] = player_dict.token_arr[i]
    }

    return player_dict
}

exports.Game.prototype.initial = function() {
    // re create arrays, len may changed
    this.path = [
                    ...Array(circuit_len)
                    .fill(null)
                    .map(() => Array(player_num)
                                    .fill(null).map(() => new Set()))
                ]
    this.safe = Array(circuit_len).fill(false)
    this.semi_safe = [
                        ...Array(circuit_len)
                            .fill(null)
                            .map(() => Array(team_num).fill(false))
                    ]
    this.block = [
                    ...Array(circuit_len)
                        .fill(null)
                        .map(() => Array(player_num).fill(false))
                ]
    // board array clear set
    for(let i=0; i<circuit_len; i++){
        // check safe iths
        // 0, part_path_len-4
        if((i%part_path_len==0) || (i%part_path_len==((part_path_len-1)-4))){
            this.safe[i] = true
        }
        for(let j=0; j<player_num; j++){
            this.path[i][j].clear()
        }
    }


    // random choose a player as human

    let temp_if_human = Array(player_num).fill(true)
    let team_id_temp = Array(player_num).fill(NONE)
    // if team mode
    if(this.team_mode){
        // default human team >= ai team
        this.team_list = [
                            ...Array(team_num)
                                .fill(null)
                                .map(() => Array(0))
                        ]

        // if human_num == 4
        if(human_num == 4){
            // set 0, 2 team 1, 1, 3 team2, all humans
            this.team_list[0].push(0)
            this.team_list[0].push(2)
            team_id_temp[0] = 0
            team_id_temp[2] = 0
            

            this.team_list[1].push(1)
            this.team_list[1].push(3)
            team_id_temp[1] = 1
            team_id_temp[3] = 1
        }
        else{
            // random pick a player as human
            // assume human player at least one
            // fixed human in team 0
            let picked_player = Array(player_num).fill(NONE)

            let first_id = Math.floor(Math.random() * player_num)
            picked_player[first_id] = 1
            this.team_list[0].push(first_id)
            team_id_temp[first_id] = 0



            // if human_num == 3
            // random pick another 2 players as human
            // human set as partners

            // if human_num == 2
            // ++2 be partner, set as human


            // if human_num == 1
            // ++2 be partner
            if(human_num == 1){
                // we assume player_num be 4 or 3
                let partner_id = (first_id + Math.floor(player_num/2)) % player_num
                this.team_list[0].push(partner_id)
                team_id_temp[partner_id] = 0
                
                for(let i=0; i<player_num; i++){
                    if(i!=first_id){
                        temp_if_human[i] = false

                        // fixed ai in team 1
                        if(i!=partner_id){
                            this.team_list[1].push(i)
                            team_id_temp[i] = 1
                        }
                    }
                }
            }
        }


    }
    // if not team mode
    else{
        // random pick human_num-1 players as human
        
        // regard it as each team only one player
        this.team_list = [
                            ...Array(player_num)
                                .fill(null)
                                .map(() => Array(0))
                        ]

        for(let i=0; i<player_num; i++){
            this.team_list[i].push(i)
            team_id_temp[i] = i
        }
    }

    console.log(`temp if human: ${temp_if_human}, team id temp: ${team_id_temp}, team list 0: ${this.team_list[0]}, 1: ${this.team_list[1]}`)

    // player info
    for(let i=0; i<player_num; i++){
        let start_pos = i * part_path_len
        let if_human = temp_if_human[i]
        let team_id = team_id_temp[i]
        this.player_info[i] = constructPlayer(i, if_human, start_pos, team_id)
    }

    this.currentPlayer = 1
    
    this.roll = [Math.ceil(dice_max*this.rng.random())]
    //this.roll = [dice_arr[0]]
    // why slice, seems the same?
    this.moves = this.roll.slice();
}

exports.Game.prototype.clearSelect = function() {
    select = null
}

exports.Game.prototype.clearPrevious = function () {
    valid_actions = null
}

exports.Game.prototype.showRolled = function () {
    // update valid_actions
    // after allAction, actualPlayer may change
    valid_actions = this.allActions()
    let helped = false
    let show_str = `player ${this.currentPlayer}`
    if(this.currentPlayer != this.actualPlayer){
        helped = true
        show_str += ` help player ${this.actualPlayer}, `
    }
    console.log(show_str, "current all actions: ", valid_actions)

    if_valid = true
    if(valid_actions.length <= 1){
        if(valid_actions.length < 1){
            if_valid = false
        }
        else{
            let action_0 = valid_actions[0]
            if(action_0.token_id == NONE){
                if_valid = false
            }
        }
        // check if reach six max
    }
    return {moves: this.moves[0], if_valid: if_valid, helped: helped}
}


exports.Game.prototype.pass = function() {
    if(!if_valid){
        action_0 = valid_actions[0]
        // doAction
        this.doAction(action_0)
        this.clearPrevious()
    }
}

exports.Game.prototype.blockedType = function(sq_type, ith) {
    var type = "none"
    if(sq_type=="path" || sq_type=="safe"){
        let square_block = this.block[ith]
        // block first
        for(let i=0; i<player_num; i++){
            if(square_block[i])
            {
                type = "blocked"
            }
        }

        // else if semi safe
        if(type=="none"){
            let square_semi = this.semi_safe[ith]

            for(let i=0; i<team_num; i++){
                if(square_semi[i]){
                    type = "semi-safe"
                }
            }
        }
    }

    return type
}

exports.Game.prototype.elementText = function(sq_type, home_i, ith) {
    let sq_icon_arr = []
    if(sq_type=="home"){
        let home_square = this.player_info[home_i].home_column[ith]

        for(const token_id of home_square){
            sq_icon_arr.push(home_i)
        }
    }
    else if(sq_type=="path" || sq_type=="safe"){
        // check all sets in element/square
        let path_square = this.path[ith]

        // each player, number of id = set size
        // eg player 2, set size is 3, then push 2 2 2
        for(let i=0; i<path_square.length; i++){
            let sq_set = path_square[i]
            for(const token_id of sq_set){
                sq_icon_arr.push(i)
            }
        }

    }
    else if(sq_type=="base"){
        let base_token = this.player_info[home_i].token_arr[ith]

        if(base_token.ele_ith == NONE){
            sq_icon_arr.push(home_i)
        }
    }
    else{
        console.log(`in updateSquareText, found sq_type invalid`)
    }

    return sq_icon_arr
}

exports.Game.prototype.checkBase = function(home_i, token_id){
    let ith = -1
    if(home_i == this.actualPlayer-1){
        // if selected, false
        let valid = false
        if(select == null){
            // should at most one token valid
            for(let i=0; (i<valid_actions.length)&&!valid; i++){
                let action_i = valid_actions[i]
                if(action_i.token_id==token_id && action_i.from==NONE){
                    select = NONE
                    ith = i
                    valid = true
                }
            }
        }
    }
    
    if(ith >= 0){
        return valid_actions[ith]
    }
    else{
        return null
    }
}

exports.Game.prototype.checkPathSquare = function (ele_ith) {
    let valid = false
    let ith = -1

    if(select == null){
        // should at most one token valid
        for(let i=0; (i<valid_actions.length)&&!valid; i++){
            let action_i = valid_actions[i]
            if(action_i.from == ele_ith){
                select = ele_ith
                ith = i
                valid = true
            }
        }
    }

    if(ith >= 0){
        return valid_actions[ith]
    }
    else{
        return null
    }
}

exports.Game.prototype.checkHomeSquare = function (home_i, ele_ith) {
    let ith = -1
    if(home_i == this.actualPlayer-1){
        let valid = false

        if(select == null){
            // should at most one token valid
            for(let i=0; (i<valid_actions.length)&&!valid; i++){
                let action_i = valid_actions[i]
                if((action_i.if_home) && action_i.from == ele_ith){
                    select = ele_ith
                    ith = i
                    valid = true
                }
            }
        }
    }

    if(ith >= 0){
        return valid_actions[ith]
    }
    else{
        return null
    }
}

// change check logic, chechk this.moves[0]
exports.Game.prototype.reachSixMax = function() {
    return (this.dice_consecu>=dice_consecu_max) || ((this.dice_consecu>=dice_consecu_max-1) && (this.moves[0]==dice_max))
}

exports.Game.prototype.ifHomeBlocked = function(player_id, ele_ith){
    let moves = this.moves[0]

    let blocked = false
    // current landing not count
    let current = ele_ith + 1

    let home_block = this.player_info[player_id].home_block
    
    for(let i=0; (i<moves)&&!blocked; i++){
        // final goal not included in home_block's length
        if((current<home_block.length) && (home_block[current])){
            blocked = true
        }

        current++
    }

    return blocked
}

exports.Game.prototype.ifBlocked = function(ele_ith, destination, ready_home){
    // this.moves
    let moves = this.moves[0]

    // this.moves[0]-1 - destination
    if(ready_home){
        moves = moves-1 - destination
    }

    let blocked = false
    // current landing not count
    let current = ele_ith + 1
    if(current >= circuit_len){
        current -= circuit_len
    }
    // for loop
    // current landing not count
    for(let i=0; (i<moves)&&!blocked; i++){
        // even self nor partners not allow land on, only allow leave
        let if_block = false
        for(let j=0; (j<player_num)&&!if_block; j++){
            if(this.block[current][j]){
                if_block = true
            }
        }

        if(if_block){
            blocked = true
        }
        else{
            current++
            if(current >= circuit_len){
                current -= circuit_len
            }
        }
    }

    return blocked
}

exports.Game.prototype.allActions = function () {
    var as = []
    // first set actual player in this turn
    this.actualPlayer = this.currentPlayer
    let player_info_i = this.player_info[this.actualPlayer-1]


    // check self already goaled or not
    
    // help a partner if self goaled
    if(this.team_mode && (player_info_i.goaled_num == token_num)){
        let team_id = player_info_i.team_id
        let team = this.team_list[team_id]
        let team_len = team.length
        let self_idx = team.indexOf(this.actualPlayer-1)

        if(self_idx >=0){
            // change this.actualPlayer
            for(let i=1; (i<team_len)&&(this.actualPlayer==this.currentPlayer); i++){
                let next_idx = (self_idx+i) % team_len
                let partner_i = team[next_idx]

                if(this.player_info[partner_i].goaled_num < token_num){
                    this.actualPlayer = partner_i + 1
                }

            }
        }
        else{
            //console.log(`in allAction, self goaled, unable to find self index in team, failed to help a partner, so canceled`)
        }

    }

    let player_id = this.actualPlayer-1
    if((this.dice_consecu<dice_consecu_max-1) || (this.moves[0]<dice_max)){
        // i is token_id
        for(let i=0; i<token_num; i++){
            let token_i = this.player_info[player_id].token_arr[i]
            let ele_ith = token_i.ele_ith
            let if_home = token_i.if_home

            // in home column
            if(if_home){
                let destination = ele_ith + this.moves[0]
                if(destination < home_col_len+1){
                    // check block
                    if(!this.ifHomeBlocked(player_id, ele_ith)){
                        as.push(new exports.Action(this.currentPlayer, player_id, i, if_home, ele_ith, destination, this.moves[0], if_home, this.dice_consecu, this.currentTurn))
                    }
                }
            }
            else{
                let start_pos = this.player_info[player_id].start_pos
                let destination = start_pos
                // in base
                if(ele_ith < 0){
                    if(this.moves[0] == dice_max){
                        as.push(new exports.Action(this.currentPlayer, player_id, i, if_home, ele_ith, destination, this.moves[0], false, this.dice_consecu, this.currentTurn))
                    }
                }
                else{
                    // check if block before circuit_len-1s
                    // be careful team mode

                    // non block
                    // normalize ele_ith
                    let nor_ith = ele_ith - start_pos
                    if(nor_ith < 0){
                        nor_ith += circuit_len
                    }
                    let nor_target = nor_ith + this.moves[0]
                    
                    // on path
                    if(nor_target < goal){
                        let ready_home = false
                        if(nor_target >= circuit_len-1){
                            destination = nor_target - (circuit_len-1)
                            ready_home = true
                            
                        }
                        else{
                            destination = ele_ith + this.moves[0]
                            if(destination >= circuit_len){
                                destination -= circuit_len
                            }
                        }

                        // check block
                        if(!this.ifBlocked(ele_ith, destination, ready_home)){
                            as.push(new exports.Action(this.currentPlayer, player_id, i, if_home, ele_ith, destination, this.moves[0], ready_home, this.dice_consecu, this.currentTurn))
                        }
                        
                    }
                }

                
            }
        }
    }


    // if empty, put pass as action
    if(as.length <= 0){
        as.push(new exports.Action(this.currentPlayer, NONE,   NONE, false, NONE, NONE,  NONE, false, this.dice_consecu, this.currentTurn))
    }

    return as
}

exports.Game.prototype.ifAllGoaled = function(player_id) {
    let team_id = this.player_info[player_id].team_id
    let team = this.team_list[team_id]

    let all_goaled = true
    for(let i=0; (i<team.length)&&all_goaled; i++){
        let player_goaled = this.player_info[team[i]].goaled_num

        if(player_goaled < token_num){
            all_goaled = false
        }
    }

    if(all_goaled){
        return true
    }
    else{
        return false
    }
}

// should related to block
exports.Game.prototype.ifCaptured = function(player_id, ele_ith) {
    let path_square = this.path[ele_ith]
    let captured_player = NONE

    // assume only one player be captured
    if(!this.safe[ele_ith]){
        let team_id = this.player_info[player_id].team_id
        // temporary only two teams
        let oppon_team_id = (team_id+1) % team_num
        let oppon_team = this.team_list[oppon_team_id]
        let oppon_num = oppon_team.length

        let valid = false
        if(this.team_mode){
            // also consider team mode semi safe
            if(!this.semi_safe[ele_ith][oppon_team_id]){
                valid = true
            }
        }
        else{
            valid = true
        }

        if(valid){
            let oppon_count = 0
            for(let i=0; i<oppon_num; i++){
                let oppon_i = oppon_team[i]
                let oppon_i_info = this.player_info[oppon_i]
                let sq_set = path_square[oppon_i]
                let if_captured = false
                
                for(const token_id of sq_set){
                    let token_k = oppon_i_info.token_arr[token_id]
                    if((token_k.ele_ith==ele_ith) && !token_k.if_home){
                        if_captured = true
                        oppon_count++
                        captured_player = oppon_i
                        token_k.ele_ith = NONE

                        oppon_i_info.token_history[token_id].push("be captured, back to base")

                        // also delete set from path square
                        sq_set.delete(token_id)
                    }
                }
                if(sq_set.size>0 && !if_captured){
                    console.log(`weird inCaptured, for player ${player_id}, opponent i=${oppon_i} sq_set at ${ele_ith} size > 0 but no captured`)
                    for(const token_id of sq_set){
                        let token_k = oppon_i_info.token_arr[token_id]
                        console.log(`token ele_ith: ${token_k.ele_ith}, if_home: ${token_k.if_home}`)
                    }
                    console.log("path: ", this.path)
                    console.log("opponent info: ", oppon_i_info)
                    console.log("sq set: ", sq_set)

                    hueotuoesuheusheouht
                }
                else if(if_captured){
                    console.log(`successfully captured`)
                }
            }

            if(oppon_count >1){
                console.log(`square ${ele_ith} should be only one token be captured`)
            }
        }

    }
    else{
        //console.log(`square ${ele_ith} is safe square, no capture`)
    }
    return captured_player
}

exports.Game.prototype.capturedPlayer = function(){
    return current_captured_player
}

exports.Game.prototype.unBlockHome = function(player_id, from_ith){
    if(from_ith < home_col_len){
        let player_info = this.player_info[player_id]
        let home_square_set = player_info.home_column[from_ith]

        if(home_square_set.size <block_tokens){
            if(player_info.home_block[from_ith]){
                player_info.home_block[from_ith] = false
            } 
        }
    }
}

exports.Game.prototype.unBlock = function(player_id, from_ith){
    let path_square = this.path[from_ith]

    let team_id = this.player_info[player_id].team_id
    let team = this.team_list[team_id]
    let team_num = team.length
    let self = player_id

    let self_count = 0
    let partner_count = 0

    for(let i=0; i<team_num; i++){
        let player_i = team[i]
        let sq_set = path_square[player_i]

        if(player_i == self){
            self_count += sq_set.size
        }
        else{
            partner_count += sq_set.size
        }
    }
    // check if unblock
    if(self_count < block_tokens){
        if(this.block[from_ith][self]){
            this.block[from_ith][self] = false
            //console.log(`in turn ${this.currentTurn}, player ${player_id}, square ${from_ith}'s self block, now unblock to false`)
        }
    }
    // alse check semi safe, may more then 3 team tokens
    if((self_count+partner_count) < 2){
        if(this.semi_safe[from_ith][team_id]){
            this.semi_safe[from_ith][team_id] = false
            //console.log(`in turn ${this.currentTurn}, player ${player_id}, square ${from_ith} semi safe to false`)
        }
    }
}

exports.Game.prototype.formBlock = function(player_id, ele_ith, ready_home) {
    let team_id = this.player_info[player_id].team_id
    let team = this.team_list[team_id]
    let team_num = team.length
    let self = player_id

    // team mode, semi safe
    if(ready_home){
        // exclude goaled ele_ith
        if(ele_ith < home_col_len){
            let home_square_set = this.player_info[player_id].home_column[ele_ith]

            let token_count = home_square_set.size

            if(token_count==block_tokens){
                if(!this.player_info[player_id].home_block[ele_ith]){
                    this.player_info[player_id].home_block[ele_ith] = true
                }
                else{
                    console.log(`home square ${ele_ith} already blocked, wrong steps done or not doing unblock before here`)
                }
            }
        }
    }
    else{
        for(let i=0; i<team_num; i++){
            let player_i = team[i]
            let path_square = this.path[ele_ith]
            let sq_set = path_square[player_i]
            let token_count = sq_set.size
            if(player_i == self && token_count==block_tokens){
                if(!this.block[ele_ith][self]){
                    // only non-safe square allow blocking
                    if(!this.safe[ele_ith]){
                        this.block[ele_ith][self] = true
                        //console.log(`in turn ${this.currentTurn}, player ${player_id}, square ${ele_ith} now blocked`)
                    }
                    else{
                        //consol.log(`no blocking in safe squares`)
                    }
                }
                else{
                    console.log(`in turn ${this.currentTurn}, player ${player_id}, square ${ele_ith} already formed a block, should unable to land here?`)
                }
            }
            // or semi_safe
            else if(this.team_mode){
                // only partner not self counts
                if((player_i!=self) && token_count >= 1){
                    if(!this.semi_safe[ele_ith][team_id]){
                        this.semi_safe[ele_ith][team_id] = true
                        //console.log(`in turn ${this.currentTurn}, player ${player_id}, square ${ele_ith} semi safed`)
                    }
                    else{
                        console.log(`in turn ${this.currentTurn}, player ${player_id}, square ${ele_ith} already be semi safed, partner token count: ${token_count}, maybe 3+ team tokens?`)
                    }
                }
            }
        }
    }
}

exports.Game.prototype.doAction = function(a) {
    mcts.Game.prototype.doAction.call(this, a);
    let token_id = a.token_id
    let player_id = a.actual_player

    let moves = a.moves
    this.dice_consecu = a.dice_consecu

    // check dice_consecu here
    if(moves == dice_max){
        //console.log(`move 6 action: ${a}`)
        this.dice_consecu++
    }

    if(this.dice_consecu < dice_consecu_max){
        // do non-pass action, token_id != NONE
        if(token_id >=0){
            let token = this.player_info[player_id].token_arr[token_id]

            let from = a.from
            let to = a.to

            // home moves
            if(a.if_home){
                this.player_info[player_id].home_column[from].delete(token_id)
                this.player_info[player_id].home_column[to].add(token_id)

                if(a.to == home_col_len){
                    this.player_info[player_id].goaled_num++
                }
            }
            // ready enter home column
            else if(a.ready_home){
                this.path[from][player_id].delete(token_id)
                this.player_info[player_id].home_column[to].add(token_id)

                token.if_home = true

                if(a.to == home_col_len){
                    this.player_info[player_id].goaled_num++
                }
            }
            // regular moves
            else if(a.from >= 0){
                this.path[from][player_id].delete(token_id)
                this.path[to][player_id].add(token_id)
            }
            // base to start
            else{
                this.path[to][player_id].add(token_id)
            }
            

            if(a.if_home){
                this.unBlockHome(player_id, from)
            }
            else if(from >= 0){
                this.unBlock(player_id, from)
            }

            // capture, be careful team mode
            // only if still in path
            // global var?
            if(!a.ready_home){
                current_captured_player = this.ifCaptured(player_id, to)
            }
            else{
                current_captured_player = NONE
            }

            // if form block
            // if team mode, if form semi safe
            this.formBlock(player_id, to, a.ready_home)

            // update token
            token.ele_ith = a.to


            //console.log(`in doAction, from to :${from}, ${to},  token ele_ith ${token.ele_ith}, if_home: ${token.if_home}`)
            this.player_info[player_id].token_history[token_id].push(structuredClone(a))

            let if_match = this.examine()

            if(!if_match){
                console.log("path: ", this.path)
                console.log("player_id: ", player_id, ", all player's info: ", this.player_info)
                console.log("not matched, turn: ", this.currentTurn, "action: ", a)
                htshusuheosuheosuhoaeu
            }

        }
        else{
            //console.log(`seems like pass action, skip`)
        }
    }
    else{
        //console.log(`reach consecutive max, possible when mcts continueThinking, action: ${a}`)
    }

    if((player_id!=NONE) && this.ifAllGoaled(player_id)){
        let team_id = this.player_info[player_id].team_id
        let team = this.team_list[team_id]
        this.winner_arr = Array(player_num).fill(0)

        for(let i=0; i<team.length; i++){
            this.winner_arr[team[i]] = 1
        }
    }
    else{
        this.currentPlayer = a.currentPlayer

        // if not 6, turn to next player
        // or reach consecutive max
        if(a.token_id == NONE || moves<dice_max || this.dice_consecu >= dice_consecu_max ){
            this.dice_consecu = 0
            this.currentPlayer = ( (this.currentPlayer) % player_num ) + 1
        }

        // roll dice
        this.roll = [Math.ceil(dice_max*this.rng.random())]
        //this.roll = [dice_arr[this.currentTurn]]
        this.moves = this.roll.slice();
    }    


    this.currentTurn++

    if(this.currentTurn >= 1000){
        console.log("too many turns...")
        console.log("path: ", this.path)
        console.log("player info: ", this.player_info)
        ehuetnuhseouheotnu
    }
}

exports.Game.prototype.examine = function() {
    let match = true
    let mis_count = 1
    for(let i=0; i<circuit_len; i++){
        for(let k=0; k<player_num; k++){
            let path_i_k = this.path[i][k]

            for(const token_id of path_i_k ){
                let token_k = this.player_info[k].token_arr[token_id]

                if(token_k.ele_ith != i){
                    console.log("mis count ", mis_count, " ith, path_i ", i, " player k ", k, "'s token id ", token_id, ", the token ele_ith ", token_k.ele_ith ," not matched path i ", i)
                    mis_count++
                    match = false
                }
            }
        }
    }


    return match
}


// may need override isGameOver
exports.Game.prototype.isGameOver = function () {
    return this.winner_arr != null
}

exports.Game.prototype.rewardsFunc = function(g) {
    return g.winner_arr
}


}(typeof exports === 'undefined' ? this.exports_ludo = {} : exports, typeof exports === 'undefined' ? function(m) { return this['exports_'+m] } : require));
