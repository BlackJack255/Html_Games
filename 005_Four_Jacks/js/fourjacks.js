(function(exports, require){
"use strict";

let player_num = 4
let hold_max = 8 // change to onesuit_max in future

let turn_max = player_num * hold_max

const suit_num = 4
let onesuit_max = 8
let total_cards = suit_num * onesuit_max

const SIMU_DRAWN = 2
const DRAWN = 1
const READY = 0

const USED = 1
const VALID = 0
const UNKNOWN = -1

// ruff in future?
const FOLLOW = 1
const DISCARD = 0

// record card_played
const RANK = 0
const IF_FOLLOWED = 1



const ACE = 0
const JACK = 3

const SPADE = 0
const HEART = 1
const DIMOND = 2
const CLUB = 3

const suitMap = new Map()
suitMap.set(SPADE, "S")
suitMap.set(HEART, "H")
suitMap.set(DIMOND, "D")
suitMap.set(CLUB, "C")

const numMap = new Map()
numMap.set(ACE, "A")
numMap.set(1, "K")
numMap.set(2, "Q")
numMap.set(JACK, "J")
numMap.set(4, "10")
numMap.set(5, "9")
numMap.set(6, "8")
numMap.set(7, "7")

const INIT_SCORE = 0


const ismcts = require('ismcts');


var public_cards = Array(total_cards).fill(READY)

var private_view_arr = Array(player_num).fill(null)


exports.Action = function(card_rank) {
//exports.Action = function(card_rank, hand_id) {
    ismcts.Action.call(this);

    // 1-dim index
    this.card_rank = card_rank
    //this.hand_id = hand_id
}

exports.Action.prototype.toString = function() {
    let s = ""
    /*
    let s = "" + `${this.hand_id}`;

    if(this.hand_id == 1){
        s += `st `
    }
    else if(this.hand_id == 2){
        s += `nd `
    }
    else if(this.hand_id == 3){
        s += `rd `
    }
    else {
        s += `th `
    }
    */

    //s += `card : `
    s += `card ${this.card_rank}: `
    return s;
};


exports.Game = function(o) {
    if (o instanceof exports.Game) {
        ismcts.Game.call(this, o);

        this.lead_suit = o.lead_suit
        
        this.hand_table = structuredClone(o.hand_table)
        this.simu_table = structuredClone(o.simu_table)
        this.card_played = structuredClone(o.card_played)
        this.score = structuredClone(o.score)

        this.previousPlayer = o.previousPlayer

        this.trick_str = ""
        this.playedCard = o.playedCard
        this.playedLetter = structuredClone(o.playedLetter)

        this.winner_arr = structuredClone(o.winner_arr)

    }
    else {
        // remember put our reward function
        ismcts.Game.call(this, { nPlayers: player_num });
        this.lead_suit = null

        this.hand_table = [
                            ...Array(player_num)
                                .fill(null)
                                .map(() => Array(total_cards).fill(UNKNOWN))
                            ]
        this.simu_table = [
                            ...Array(player_num)
                                .fill(null)
                                .map(() => Array(total_cards).fill(UNKNOWN))
                            ]

        this.card_played = [
                                ...Array(player_num)
                                    .fill(null)
                                    .map(() => Array(2).fill(UNKNOWN))
                            ]
        this.score = Array(player_num).fill(INIT_SCORE)

        this.previousPlayer = -1
        // currentPlayer already set as 1
        // so using as -1

        // currentTurn help card count

        // just for html
        this.trick_str = ""
        this.playedCard = UNKNOWN
        this.playedLetter = ""

        this.winner_arr = null

        this.deal()
    }
}

exports.Game.prototype = Object.create(ismcts.Game.prototype);

exports.Game.prototype.copyGame = function() {
    return new exports.Game(this);
};


class Private_View{
    constructor(player_id, card_arr=null){
        this.player_id = player_id

        this.private_table = [
                                ...Array(player_num)
                                    .fill(null)
                                    .map(() => Array(total_cards).fill(UNKNOWN))
                            ]
        
        if(card_arr==null){
            console.log("null card arr, wrong")
        }
        for (let i=0; i<card_arr.length; i++){
            let card = card_arr[i]
            insertCard(player_id, card, VALID, this.private_table)
        }

        this.final_table = [
                                ...Array(player_num)
                                    .fill(null)
                                    .map(() => Array(total_cards).fill(READY))
                            ]

        /*
        this.handMap = new Map()
        for(let i=0; i<card_arr.length; i++){
            this.handMap.set(card_arr[i], i)
        }
        */


    }
}


// deal with some function full scope variables



function num2Letter(card_num) {
    const suit = Math.floor( card_num/onesuit_max )
    const pure_rank = card_num % onesuit_max

    let letter = suitMap.get(suit) + '-' + numMap.get(pure_rank)

    return letter
}

function insertCard(player_idx, card, if_played, card_table) {
    let ok = false
    //if(card_table[player_idx][card] == UNKNOWN){
    if(card_table[player_idx][card] < if_played){
        card_table[player_idx][card] = if_played

        ok = true
    }
}

exports.Game.prototype.deal = function(){
    let deck = Array(total_cards).fill(0)

    // using public card 0th to random shuffle
    let count = 0
    while (count < total_cards) {
        // check if dealed
        // built in random first
        let rand_idx = Math.floor( Math.random()* total_cards )

        if(public_cards[rand_idx] != DRAWN){
            // fill in if valid
            deck[count] = rand_idx

            public_cards[rand_idx] = DRAWN
            count += 1
        }
    }

    // reset public_cards
    for (let i=0; i<total_cards; i++) {
        public_cards[i] = READY
    }

    // set deck fixed for test
    
    
    deck = [2, 7, 12, 15, 16, 17, 18, 21,   4, 10, 24, 26, 27, 28, 30, 31, 
        1, 3, 5, 6, 19, 20, 25, 29,   0, 8, 9, 11, 13, 14, 22, 23
    ]
    
    
    
    

    //
    // each player an array
    for (let i=0; i<player_num; i++){
        let card_array = deck.slice(i*hold_max, (i+1)*hold_max)

        // related to var private_view_arr
        private_view_arr[i] = new Private_View(i, card_array)

        for (let j=0; j<card_array.length; j++){
            let card = card_array[j]
            insertCard(i, card, VALID, this.hand_table)
        }
        
    }

    // call player constructor, input array

    // reset private_viewPoint


    // temporary first trick random player lead
    //this.currentPlayer = Math.floor( Math.random()* player_num ) + 1
    // for test
    this.currentPlayer = 4

    this.lead_suit = null

    this.winner_arr = null

}

exports.Game.prototype.showTable = function (actual=true) {
    let table = this.hand_table
    if(!actual){
        table = this.simu_table
    }
    console.log(`card table: `)
    let part_str = ""
    for(let i=0; i<table.length; i++){
        let player_hand = table[i]
        for(let j=0; j<player_hand.length; j++){
            if(player_hand[j] != UNKNOWN){
                part_str += String(j) + " " + String(player_hand[j]) + "| "
            }
        }
        part_str += "\n"
        
    }
    console.log(part_str)
}

exports.Game.prototype.prepareDraw = function(){
    let player_i = this.currentPlayer - 1

    let private_i = private_view_arr[player_i]

    // clear final table
    // prepare final table
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            private_i.final_table[i][j] = READY
        }
    }







    // prepare final table
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            if(public_cards[j]!=READY || private_i.private_table[i][j]!=UNKNOWN){
                // every one marked card as drawn
                for(let ii=0; ii<player_num; ii++){
                    private_i.final_table[ii][j] = DRAWN
                }
            }
        }
    }

}


exports.Game.prototype.determinize = function(){

    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            this.simu_table[i][j] = UNKNOWN
        }
    }

    // copy hand_table to simu_table
    // hand-craft copy, fill in value
    /*
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            if(this.hand_table[i][j] != UNKNOWN){
                let if_played = this.hand_table[i][j]

                this.simu_table[i][j] = if_played
            }
        }
    }
    */

    // draw cards from currentPlayer's private_view
    let player_idx = this.currentPlayer - 1
    let private_table = private_view_arr[player_idx].private_table
    let final_table = private_view_arr[player_idx].final_table

    let draw_ready_num = Array(player_num).fill(total_cards)
    let draw_need_num = Array(player_num).fill(hold_max)

    // fill valid or used to simu_table
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            if(final_table[i][j]==DRAWN){
                // public played
                draw_ready_num[i] --
                if(private_table[i][j]!=UNKNOWN){
                    // player i holding or played
                    let card_rank = j
                    // private_table[i][j] should be USED or VALID
                    insertCard(i, card_rank, private_table[i][j], this.simu_table)
                    draw_need_num[i] --
                }
            }
        }
    }

    /*
    if(draw_ready_num[0] == 0 && draw_ready_num[1] == 0 && draw_ready_num[2] == 0 && draw_ready_num[3] == 0){
        console.log("weired")
        huhsoeuhoehun
    }
    */

    //this.showTable(false)


    // draw unknown hidden cards
    let sorted_idx = Array.from(draw_ready_num.keys())
    sorted_idx.sort((a, b) => draw_ready_num[a] - draw_ready_num[b])

    let drawn_arr = [
                        ...Array(player_num)
                            .fill(null)
                    ]
    for (let i=0; i<player_num; i++){
        drawn_arr[i] = Array( draw_need_num[i] )
    }

    let regular_draw_finish = false
    while (!regular_draw_finish) {
        // initial
        for(let i=0; i<player_num-1; i++){
            for(let j=0; j<draw_need_num[i]; j++){
                drawn_arr[i][j] = UNKNOWN
            }
        }

        let draw_ready_num_temp = Array(player_num)
        for(let i=0; i<player_num; i++){
            draw_ready_num_temp[i] = draw_ready_num[i]
        }

        // clear final_table if SIMU_DRAWN
        for(let i=0; i<player_num; i++){
            for(let j=0; j<total_cards; j++){
                if(final_table[i][j] == SIMU_DRAWN){
                    final_table[i][j] = READY
                }
            }
        }


        let drawAllowed = true
        let finished_count = 0

        for (let i=0; i<player_num && drawAllowed; i++){
            let draw_player = sorted_idx[i]

            let temp_count = 0
            let drawn_times = 0
            while (drawn_times < draw_need_num[draw_player]){
                let drawn_card = Math.floor( Math.random() * total_cards)

                if(final_table[draw_player][drawn_card] == READY){
                    // draw_player got card
                    drawn_arr[draw_player][drawn_times] = drawn_card

                    // SIMU_USED all players, include draw_player
                    // others unable to draw this card
                    for(let j=0; j<player_num; j++){
                        if(final_table[j][drawn_card] == READY){
                            final_table[j][drawn_card] = SIMU_DRAWN
                            if(j!=draw_player){
                                draw_ready_num_temp[j] -= 1
                            }
                        }
                    }

                    drawn_times ++
                    
                }
                temp_count ++

                if(temp_count % 500 == 0){
                    console.log(`draw_need: ${draw_need_num}, , draw_ready ori: ${draw_ready_num}`)
                    console.log(`weired while loop, steps: ${temp_count}`)
                }
            }

            // check remaining players still able to draw
            for (let j=i+1; j<player_num && drawAllowed; j++) {
                let check_id = sorted_idx[j]

                if (draw_need_num[check_id] > draw_ready_num_temp[check_id]){
                    drawAllowed = false
                }
            }

            finished_count ++
        } // finish one time drawn, see if all fit public information


        // if fit public information, then insert drawn result
        if (finished_count == player_num){
            for (let i=0; i<player_num; i++){
                let draw_player = sorted_idx[i]
                for (let j=0; j<draw_need_num[draw_player]; j++) {
                    insertCard(draw_player, drawn_arr[draw_player][j], VALID, this.simu_table)
                }
            }

            regular_draw_finish = true
            //console.log(`############## done draw, finish determinize #############`)
        }
        else{
            console.log("############## failde, draw again ##############")
        }

    }


    // show simu_table
    //this.showTable(false)

}



function findValid(player_idx, suit_k, card_table) {
    // also need var for allActions
    var as = []

    let found = false
    if(suit_k != null){
        let start = suit_k*onesuit_max
        let end = start + onesuit_max
        for(let j=start; j<end; j++) {
            if(card_table[player_idx][j] == VALID){
                found = true
                //let hand_id = private_view_arr[player_idx].handMap.get(j)
                //as.push(new exports.Action(j, hand_id))
                as.push(new exports.Action(j))
            }
        }
    }

    // also check as length, simu_players may inconsistant
    if(suit_k==null || !found || as.length<=0){
        // maybe skip suit_k in future? but how to deal with leading?
        for(let j=0; j<total_cards; j++) {
            if(card_table[player_idx][j] == VALID){
                //let hand_id = private_view_arr[player_idx].handMap.get(j)
                //as.push(new exports.Action(j, hand_id))
                as.push(new exports.Action(j))
            }
        }
    }

    if(as.length <= 0){
        console.log("gets nothing from table, wrong")
        process.exit(0)
    }

    return as
}

// if want to findValid on hand_table, prepare another function to do
exports.Game.prototype.allActions = function () {
    // need var to cross scope
    var as = findValid(this.currentPlayer-1, this.lead_suit, this.simu_table)

    return as
}


// just test, no need in future
exports.Game.prototype.pick_a_card = function () {
    var as = this.allActions()

    let len = as.length
    let pick = Math.floor( Math.random() * len )

    var action = as[pick]

    return action
}


exports.Game.prototype.basic_play = function(player_idx, card_rank, card_table) {
    if(card_table[player_idx][card_rank] != VALID) {
        // for debug
        console.log(`player: ${player_idx} already used ${card_rank}th card`)
    }


    let suit = Math.floor( card_rank / onesuit_max )
    

    let follow_suit = FOLLOW
    let in_trick_ith = this.currentTurn % player_num
    if( in_trick_ith == 1 ){
        this.lead_suit = suit
    }
    else{
        if(suit != this.lead_suit){
            follow_suit = DISCARD
        }
    }


    this.card_played[player_idx][RANK] = card_rank
    this.card_played[player_idx][IF_FOLLOWED] = follow_suit

    card_table[player_idx][card_rank] = USED

}


exports.Game.prototype.doAction = function (a, real_play=false) {
    ismcts.Game.prototype.doAction.call(this, a);

    let card_rank = a.card_rank
    let table = null
    if(!real_play){
        table = this.simu_table
    }
    else{
        // temporary, now is open hands
        table = this.hand_table
    }
    this.basic_play(this.currentPlayer-1, card_rank, table)


    if(real_play){
        // just for html temporary
        this.playedCard = card_rank
        this.playedLetter = num2Letter(card_rank)
    }
    // check trick win
    let best_player = this.trickWin()

    // check round win
    if(this.currentTurn >= turn_max){
        this.winner_arr = this.endRound()
    }

    // currentPlayer still preserving
    // update
    this.previousPlayer = this.currentPlayer
    if(!this.isGameOver()){
        if(best_player != null){
            this.currentPlayer = best_player + 1
        }
        else if(this.currentTurn % player_num != 0){
            this.currentPlayer = ( (this.currentPlayer) % player_num ) + 1
        }

        this.currentTurn++
    }
}

// call after ismcts, real play in main js
// to avoid affect ismcts doAction
exports.Game.prototype.afterAction = function () {
    // remember currentTurn, currentPlayer already updated
    // so using previousPlayer

    public_cards[this.playedCard] = USED
    
    // deal with information set
    // record played card, for all players private_view, including currentPlayer
    let previous_id = this.previousPlayer - 1
    for(let i=0; i<player_num; i++){
        insertCard(previous_id, this.playedCard, USED, private_view_arr[i].private_table)
    }
    
}

function get_play_order(lead_id, current_id) {
    let ith_play = (current_id - lead_id) % player_num

    if(ith_play < 0){
        ith_play += player_num
    }
    return ith_play
}


exports.Game.prototype.trickWin = function() {
    if(this.currentTurn % player_num == 0){
        let best_rank = total_cards
        let best_player = UNKNOWN


        let jack_count = 0
        let lowest_rank = 0
        let lowest_pure_rank = ACE
        let lowest_player = UNKNOWN
        let lowest_ith_play = UNKNOWN

        let lowest_follow_suit = true

        let lead_id = (this.currentPlayer % player_num) + 1 - 1

        for(let i=0; i<player_num; i++){
            let if_follow = this.card_played[i][IF_FOLLOWED]
            let rank_i = this.card_played[i][RANK]
            
            // smaller is better
            // at least lead_card will be selected
            if( if_follow == FOLLOW && rank_i < best_rank){
                best_rank = rank_i
                best_player = i
            }


            // jack count
            let pure_rank = rank_i % onesuit_max
            if(pure_rank == JACK){
                jack_count -= 1
            }


            // larger is worse
            if(if_follow == DISCARD){
                lowest_follow_suit = false
            }

            if(lowest_follow_suit){
                if( if_follow == FOLLOW && rank_i > lowest_rank){
                    lowest_rank = rank_i
                    lowest_player = i
                }
            }
            else{
                // currentPlayer still preserved

                // only check if also discard
                // card lower rank or same rank but discard later id position
                if(if_follow==DISCARD && pure_rank >= lowest_pure_rank){
                    let ith_play = get_play_order(lead_id, i)

                    let checked_low = false
                    if(pure_rank > lowest_pure_rank){
                        checked_low = true
                    }
                    else{
                        // case equal
                        if(ith_play > lowest_ith_play){
                            checked_low = true
                        }
                    }

                    if(checked_low){
                        lowest_rank = rank_i
                        lowest_pure_rank = pure_rank

                        lowest_ith_play = ith_play
                        lowest_player = i
                    }
                }

            }

        }

        // add score
        //this.score[best_player] += 1
        this.score[lowest_player] += jack_count


        // str for html
        // consider cancel during ismcts
        this.trick_str = ""
        for(let i=0; i<player_num; i++) {
            let card_letter = num2Letter(this.card_played[i][RANK])

            if(i == lead_id){
                this.trick_str += `*`
            }
            if(i == best_player){
                this.trick_str += `<span style="color: green; bold;">${card_letter} </span>||| &nbsp;`
            }
            else if(i == lowest_player){
                if(jack_count <0){
                    this.trick_str += `<span style="color: red; bold;">${card_letter}(${jack_count}) </span>| &nbsp;`
                }
                else{
                    this.trick_str += `<span style="color: red; bold;">${card_letter} </span>||| &nbsp;`
                }
            }
            else{
                this.trick_str += `${card_letter} ||| &nbsp;`
            }
        }

        // reset
        for(let i=0; i<this.card_played.length; i++){
            let played_i = this.card_played[i]
            for(let j=0; j<played_i.length; j++){
                this.card_played[i][j] = UNKNOWN
            }
        }

        this.lead_suit = null;

        return best_player
    }

    return null
}

exports.Game.prototype.endRound = function () {
    // return need cross scope
    const win_score = 1
    const neutral = 0.25
    const lose_score = 0
    var winners = Array(player_num).fill(neutral)
    var losers = Array(player_num).fill(neutral)
    let best_score = -999
    let least_score = INIT_SCORE-1

    let winner_count = 0
    let loser_count = 0
    for(let i=0; i<player_num; i++){
        let score = this.score[i]

        if(score <= least_score){
            if (score < least_score){
                least_score = score

                loser_count = 0
                for(let j=0; j<i; j++){
                    if(losers[j] == 0){
                        losers[j] = neutral
                    }
                }
            }

            loser_count ++
            losers[i] = lose_score
        }

        // allow score even
        // still logic error if all -1
        if(score >= best_score){
            if (score > best_score){
                best_score = score

                // clear previous winners
                winner_count = 0
                for(let j=0; j<i; j++){
                    if(winners[j] == win_score){
                        winners[j] = neutral
                    }
                }
            }

            winner_count ++
            winners[i] = win_score
        }

    }


    if(loser_count > 1){
        for(let i=0; i<player_num; i++){
            if(losers[i] == lose_score){
                losers[i] = neutral / 2.0
            }
        }
    }

    if(winner_count > 1){
        for(let i=0; i<player_num; i++){
            if(winners[i] == win_score){
                winners[i] = winners[i] / 2.0
            }
        }
    }

    // fill in
    for(let i=0; i<player_num; i++){
        // co winners still 0.5 larger than neutral 0.25, co losers 0.125 must lower than neutral
        if(winners[i] == neutral && losers[i] < neutral){
            winners[i] = losers[i]
        }
    }

    return winners
    
    /*
    for(let i=0; i<player_num; i++) {
        this.score[i] = this.score[i] / INIT_SCORE
    }

    return structuredClone(this.score)
    */
}


// may need override isGameOver
exports.Game.prototype.isGameOver = function () {
    return this.winner_arr != null
}

exports.Game.prototype.rewardsFunc = function(g) {
    return g.winner_arr
}


}(typeof exports === 'undefined' ? this.exports_fourjacks = {} : exports, typeof exports === 'undefined' ? function(m) { return this['exports_'+m] } : require));