(function(exports, require){
"use strict";

let player_num = 4
let hold_max = 8 // change to onesuit_max in future

let turn_max = player_num * hold_max

const suit_num = 4
let onesuit_max = 8
let total_cards = suit_num * onesuit_max

const DRAWED = 1
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


exports.Action = function(card_rank, hand_id) {
    ismcts.Action.call(this);

    // 1-dim index
    this.card_rank = card_rank
    this.hand_id = hand_id
}

exports.Action.prototype.toString = function() {
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

    //s += `card : `
    s += `card ${num2Letter(this.card_rank)}: `
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
        this.temp_card = structuredClone(o.temp_card)

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
        this.temp_card = ""

        this.winner_arr = null

        this.deal()
    }
}

exports.Game.prototype = Object.create(ismcts.Game.prototype);

exports.Game.prototype.copyGame = function() {
    return new exports.Game(this);
};


class Private_View{
    constructor(card_arr=null){



        
        this.handMap = new Map()
        for(let i=0; i<card_arr.length; i++){
            this.handMap.set(card_arr[i], i)
        }


    }
}


// deal with some function full scope variables



function num2Letter(card_num) {
    const suit = Math.floor( card_num/onesuit_max )
    const pure_rank = card_num % onesuit_max

    let letter = suitMap.get(suit) + '-' + numMap.get(pure_rank)

    return letter
}

exports.Game.prototype.insertCard = function(player_idx, card, if_played, card_table) {
    let ok = false
    if(card_table[player_idx][card] == UNKNOWN){
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

        if(public_cards[rand_idx] != DRAWED){
            // fill in if valid
            deck[count] = rand_idx

            public_cards[rand_idx] = DRAWED
            count += 1
        }
    }

    // reset public_cards
    for (let i=0; i<total_cards; i++) {
        public_cards[i] = READY
    }

    // set deck fixed for test
    
    /*
    deck = [1, 2, 4, 8, 11, 13, 16, 18,   0, 9, 10, 19, 20, 23, 25, 26, 
        5, 6, 15, 17, 22, 28, 29, 31,   3, 7, 12, 14, 21, 24, 27, 30
    ]
    */
    
    
    

    //
    // each player an array
    for (let i=0; i<player_num; i++){
        let card_array = deck.slice(i*hold_max, (i+1)*hold_max)

        // related to var private_view_arr
        private_view_arr[i] = new Private_View(card_array)

        for (let j=0; j<card_array.length; j++){
            let card = card_array[j]
            this.insertCard(i, card, VALID, this.hand_table)
        }
        
    }

    // call player constructor, input array

    // reset private_viewPoint


    // temporary first trick random player lead
    this.currentPlayer = Math.floor( Math.random()* player_num ) + 1
    // for test
    //this.currentPlayer = 2

    this.lead_suit = null

    this.winner_arr = null

}

exports.Game.prototype.showTable = function () {
    let table = this.hand_table
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


exports.Game.prototype.determinize = function(){

    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            this.simu_table[i][j] = UNKNOWN
        }
    }

    // copy hand_table to simu_table
    // hand-craft copy, fill in value
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            if(this.hand_table[i][j] != UNKNOWN){
                let if_played = this.hand_table[i][j]

                this.simu_table[i][j] = if_played
            }
        }
    }

    // draw cards from currentPlayer's private_view

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
                let hand_id = private_view_arr[player_idx].handMap.get(j)
                as.push(new exports.Action(j, hand_id))
            }
        }
    }

    // also check as length, simu_players may inconsistant
    if(suit_k==null || !found || as.length<=0){
        // maybe skip suit_k in future? but how to deal with leading?
        for(let j=0; j<total_cards; j++) {
            if(card_table[player_idx][j] == VALID){
                let hand_id = private_view_arr[player_idx].handMap.get(j)
                as.push(new exports.Action(j, hand_id))
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

    // just for html temporary
    this.temp_card = num2Letter(card_rank)

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
    
    // deal with information set
    
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