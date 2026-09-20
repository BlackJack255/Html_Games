(function(exports, require){
"use strict";

let player_num = 4
let hold_max = 9


const suit_num = 4
let onesuit_max = 9
let total_cards = suit_num * onesuit_max

let piles_num = 3
let pile_len = Math.floor(total_cards/piles_num)
let pick_max = 3


const DRAWN = 1
const READY = 0

// don't know cards
const UNKNOWN = -1


// record card_played
const RANK = 0
const IF_PICKED = 1


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
numMap.set(0, "A")
numMap.set(1, "K")
numMap.set(2, "Q")
numMap.set(3, "J")
numMap.set(4, "10")
numMap.set(5, "9")
numMap.set(6, "8")
numMap.set(7, "7")
numMap.set(8, "6")

const mcts = require('mcts');


exports.Action = function(pick_0, card_0, pick_1, card_1, pick_2, card_2) {
    mcts.Action.call(this);

    this.pick_0 = pick_0
    this.card_0 = card_0

    this.pick_1 = pick_1
    this.card_1 = card_1

    this.pick_2 = pick_2
    this.card_2 = card_2
}


exports.Action.prototype.toString = function() {
    let s="["

    if(this.pick_0 >=0){
        s += `pick pile${this.pick_0} card${this.card_0}th, `
    }

    if(this.pick_1 >=0){
        s += `pick pile${this.pick_1} card${this.card_1}th, `
    }

    if(this.pick_2 >=0){
        s += `pick pile${this.pick_2} card${this.card_2}th, `
    }

    s += "]: "
    return s;
}


exports.Game = function(o) {

    if(o instanceof exports.Game){
        mcts.Game.call(this, o);

        this.table_piles = structuredClone(o.table_piles)
        this.piles_top = structuredClone(o.piles_top)
        this.player_collects = structuredClone(o.player_collects)
        this.player_slots = structuredClone(o.player_slots)

        this.human_piles_top = structuredClone(o.human_piles_top)
        this.human_cards = structuredClone(o.human_cards)
        this.human_pick_count = o.human_pick_count

        this.scores = structuredClone(o.scores)
        this.winner_arr = structuredClone(o.winner_arr)
    }
    else {
        mcts.Game.call(this, { nPlayers: player_num });
        // [rank if picked] [pile 0 1 2] [0-11 cards]
        this.table_piles = [
                                ...Array(2)
                                    .fill(null)
                                    .map(() => Array(piles_num)
                                                    .fill(null)
                                                    .map(() => Array(pile_len)) )
                            ]

        this.piles_top = Array(piles_num)

        this.player_collects = [
                                ...Array(player_num)
                                    .fill(null)
                                    .map(() => Array(hold_max))
                                ]
        this.player_slots = Array(player_num)

        
        this.human_piles_top = Array(piles_num)
        this.human_cards = [
                                ...Array(pick_max)
                                    .fill(null)
                                    .map(() =>Array(2).fill(UNKNOWN))
                            ]
        this.human_pick_count = 0

        this.scores = null
        this.winner_arr = null


        this.deal()

    }
}


exports.Game.prototype = Object.create(mcts.Game.prototype);

exports.Game.prototype.copyGame = function() {
    return new exports.Game(this);
};

exports.Game.prototype.deal = function() {
    var public_cards = Array(total_cards).fill(READY)
    let deck = Array(total_cards).fill(0)

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

    for (let i=0; i<piles_num; i++){
        let card_array = deck.slice(i*pile_len, (i+1)*pile_len)


        for (let j=0; j<pile_len; j++){
            let card = card_array[j]
            
            this.table_piles[RANK][i][j] = card
            this.table_piles[IF_PICKED][i][j] = READY
        }
        
    }
    console.log("table piles: ", this.table_piles)



    // initial, reset
    for(let i=0; i<piles_num; i++){
        this.piles_top[i] = pile_len - 1
    }

    for(let i=0; i<player_num; i++){
        for(let j=0; j<hold_max; j++){
            this.player_collects[i][j] = UNKNOWN
        }
        this.player_slots[i] = hold_max
    }

    this.currentPlayer = Math.floor( Math.random()* player_num ) + 1

}

function card2Letter(card){
    let suit = Math.floor(card / onesuit_max)
    let rank = card % onesuit_max
    let card_letter = suitMap.get(suit) + numMap.get(rank)

    return card_letter
}

exports.Game.prototype.pickCard = function(pile_i, card_j) {
    let card = this.table_piles[RANK][pile_i][card_j]

    return card2Letter(card)
}




function fillPicked(picked_obj_arr, picked_num, pile_i, card_j){
    let len = picked_obj_arr.length
    for(let i=0; i<len; i++){
        let pick_ith = picked_obj_arr[i]
        pick_ith[picked_num] = [pile_i, card_j]
    }
}

// all action
// recursive, current last in each pile
// pick last, then last-1 turn valid
// max_len = 3
// inside choice: not pick, pick 1st, pick 2nd, pick 3rd
// init pile_i, card_j need non-null?
// start from picked_num=0?
// since recursive, pass number value easier than pass arr reference
function findValidCards(current_pick_max, picked_num, pile_i, card_j, top_0, top_1, top_2) {
    let current_pick_ith = picked_num-1
    if(picked_num>=current_pick_max || pile_i==null){
        // create array, let parent fill in
        var empty_pick = [
                            ...Array(1)
                                .fill(null)
                                // has to be global pick_max
                                .map(() => Array(pick_max)
                                                .fill(null)
                                                .map(() =>Array(2).fill(UNKNOWN)))
                        ]
        // fill
        if(pile_i!=null){
            fillPicked(empty_pick, current_pick_ith, pile_i, card_j)
        }
        
        return empty_pick
    }

    let pile_pick = -1
    let card_pick = -1

    var pick_null = null
        

    // check if top_i >=0
    pile_pick = 0
    card_pick = top_0
    var pick_0 = null
    if(top_0 >=0){
        pick_0 = findValidCards(current_pick_max, picked_num+1, pile_pick, card_pick, top_0-1, top_1, top_2)
    }

    pile_pick = 1
    card_pick = top_1
    var pick_1 = null
    if(top_1 >=0){
        pick_1 = findValidCards(current_pick_max, picked_num+1, pile_pick, card_pick, top_0, top_1-1, top_2)
    }

    pile_pick = 2
    card_pick = top_2
    var pick_2 = null
    if(top_2 >=0){
        pick_2 = findValidCards(current_pick_max, picked_num+1, pile_pick, card_pick, top_0, top_1, top_2-1)
    }
    
    
    if(picked_num > 0){
        // allow stop picking if pick at least one card
        pick_null = findValidCards(current_pick_max, picked_num+1, null, null, top_0, top_1, top_2)
        fillPicked(pick_null, current_pick_ith, pile_i, card_j)

        if(pick_0 != null){
            fillPicked(pick_0, current_pick_ith, pile_i, card_j)
        }
        if(pick_1 != null){
            fillPicked(pick_1, current_pick_ith, pile_i, card_j)
        }
        if(pick_2 != null){
            fillPicked(pick_2, current_pick_ith, pile_i, card_j)
        }
    }

    // combine
    var current_collect = []

    if(pick_null != null){
        current_collect.push(...pick_null)
    }

    if(pick_0 != null){
        current_collect.push(...pick_0)
    }
    if (pick_1 != null){
        current_collect.push(...pick_1)
    }
    if(pick_2 != null){
        current_collect.push(...pick_2)
    }

    return current_collect //?


}

exports.Game.prototype.allActions = function (){
    // should follow this.piles_top
    let pick_allow = Math.min(this.player_slots[this.currentPlayer-1], 3)
    var collect = findValidCards(pick_allow, 0, -1, -1, this.piles_top[0], this.piles_top[1], this.piles_top[2])

    let collect_len = collect.length
    var as = []
    // fill into new Action
    for(let i=0; i<collect_len; i++){
        let pick_arr = collect[i]

        // predifined shape, so direct input
        as.push(new exports.Action(pick_arr[0][0], pick_arr[0][1], pick_arr[1][0], pick_arr[1][1], pick_arr[2][0], pick_arr[2][1]))
    }

    return as
}

// human player valid actions
exports.Game.prototype.humanPrepare = function() {
    for(let i=0; i<piles_num; i++){
        this.human_piles_top[i] = this.piles_top[i]
    }

    for(let i=0; i<pick_max; i++){
        this.human_cards[i] = [UNKNOWN, UNKNOWN]
    }
    this.human_pick_count = 0
}
exports.Game.prototype.humanPickCard = function(pile_i, card_j) {
    let valid = false
    let current_pick_max = Math.min(this.player_slots[this.currentPlayer-1], pick_max)
    // if valid
    if(this.human_pick_count < current_pick_max && card_j == this.human_piles_top[pile_i] && this.table_piles[IF_PICKED][pile_i][card_j]==READY){
        valid = true
        this.human_cards[this.human_pick_count] = [pile_i, card_j]

        this.human_piles_top[pile_i] --
        this.human_pick_count ++
    }

    return valid
}

exports.Game.prototype.cancelCard = function(pile_i, card_j) {
    let allowCancel = false

    if(card_j == this.human_piles_top[pile_i]+1 && this.table_piles[IF_PICKED][pile_i][card_j]==READY){
        allowCancel = true
        this.human_cards[this.human_pick_count] = [UNKNOWN, UNKNOWN]

        this.human_piles_top[pile_i] ++
        this.human_pick_count --
    }

    return allowCancel
}


exports.Game.prototype.fill_collection = function(pile_i, card_j) {
    let card_rank = this.table_piles[RANK][pile_i][card_j]
    let collection_i = this.player_collects[this.currentPlayer-1]

    if(this.table_piles[IF_PICKED][pile_i][card_j] == DRAWN){
        console.log(`weired, card ${card_rank} already picked before`)
    }
    
    /*
    let idx = 0
    let found = false
    while(!found && idx<collection_i.length){
        if(collection_i[idx]==UNKNOWN){
            collection_i[idx] = card_rank
            found = true
        }
        else{
            idx++
        }
    }

    if(!found){
        console.log("player complete collected cards, unable to fill anymore")
    }
    else{
        this.table_piles[IF_PICKED][pile_i][card_j] = DRAWN
        this.piles_top[pile_i] -= 1
    }
    */
    let collect_slot_id = hold_max - this.player_slots[this.currentPlayer-1]
    
    if(collect_slot_id > hold_max){
        console.log(`player ${this.currentPlayer-1} already reach hold max, unable to fill in anymore?`)
    }
    
    collection_i[collect_slot_id] = card_rank

    this.player_slots[this.currentPlayer-1] -= 1

    this.table_piles[IF_PICKED][pile_i][card_j] = DRAWN
    this.piles_top[pile_i] -= 1
}

exports.Game.prototype.doAction = function(a) {
    mcts.Game.prototype.doAction.call(this, a);
    if(a.pick_0 >=0){
        this.fill_collection(a.pick_0, a.card_0)
    }

    if(a.pick_1 >=0){
        this.fill_collection(a.pick_1, a.card_1)
    }

    if(a.pick_2 >=0){
        this.fill_collection(a.pick_2, a.card_2)
    }




    this.winner_arr = this.endGame()

    if(!this.isGameOver()){
        this.currentTurn++;
        this.currentPlayer = ( (this.currentPlayer) % player_num ) + 1
    }
}

// for html show player collections
exports.Game.prototype.getPlayerCollects = function(player_idx) {
    let collect_i = this.player_collects[player_idx]

    let collect_str = `player ${player_idx+1}: `

    let valid = true
    for(let i=0; i<collect_i.length && valid; i++){
        if(collect_i[i] != UNKNOWN){
            let card = collect_i[i]
            collect_str += card2Letter(card) + " "
        }
        else{
            valid = false
        }
    }
    collect_str += "| "

    return collect_str
}


function scoring(collect_arr) {
    let suit_len = Array(suit_num).fill(0)
    let rank_cumu = Array(onesuit_max).fill(0)

    let rank_raw = 0
    let rank_sets = 0
    let rank_counts = Array(onesuit_max).fill(0)

    for(let j=0; j<collect_arr.length; j++){
        let card = collect_arr[j]

        let suit = Math.floor(card / onesuit_max)
        suit_len[suit] ++

        let rank = card % onesuit_max
        rank_counts[rank] ++
    }

    for(let k=0; k<onesuit_max; k++){
        if(rank_counts[k] > 0){
            rank_cumu[k] += 1
            
            if(k > 0){
                rank_cumu[k] += rank_cumu[k-1]
            }
        }

        if(rank_counts[k] > rank_raw){
            rank_raw = rank_counts[k]
        }
        if(rank_counts[k] >= 3){
            rank_sets += rank_counts[k]
        }
    }

    let score = 1

    let flush = Math.max(...suit_len)
    let sequence = Math.max(...rank_cumu)
    let sets = Math.max(rank_sets, rank_raw)
    

    score = flush * sequence * sets

    return score
}


exports.Game.prototype.endGame = function() {
    // check if all players finished

    let allFinish = true
    for(let i=0; i<player_num && allFinish; i++){
        let collection_i = this.player_collects[i]

        if(collection_i[hold_max-1]==UNKNOWN){
            allFinish = false
        }
    }

    if(allFinish){
        // count score
        let scoreTeam1 = 0
        let scoreTeam2 = 0
        let winners = Array(player_num).fill(0)

        this.scores = Array(player_num).fill(0)

        for(let i=0; i<player_num; i++){
            let collect_i = this.player_collects[i]
            this.scores[i] = scoring(collect_i)

            if(i%2 == 0){
                scoreTeam1 += this.scores[i]
            }
            else{
                scoreTeam2 += this.scores[i]
            }
        }

        //console.log(`in endGame, scoring: ${this.scores}`)

        //1 0 1 0 or 0 1 0 1
        let start_player = 0
        if(scoreTeam1 != scoreTeam2){
            if(scoreTeam1 < scoreTeam2){
                start_player = 1
            }
            else{
                start_player = 0
            }

            for(let i=start_player; i<player_num; i=i+2){
                winners[i] = 1
            }
        }
        else{
            for(let i=0; i<player_num; i++){
                winners[i] = 0.5
            }
        }



        return winners
    }
    else{
        return null
    }
}



// may need override isGameOver
exports.Game.prototype.isGameOver = function () {
    return this.winner_arr != null
}

exports.Game.prototype.rewardsFunc = function(g) {
    return g.winner_arr
}


}(typeof exports === 'undefined' ? this.exports_nimbly = {} : exports, typeof exports === 'undefined' ? function(m) { return this['exports_'+m] } : require));