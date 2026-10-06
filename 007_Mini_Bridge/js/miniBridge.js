(function(exports, require){
"use strict";

let player_num = 4
let hold_max = 13 // change to onesuit_max in future

let turn_max = player_num * hold_max

let start_player = -1

const suit_num = 4
let onesuit_max = 13
let total_cards = suit_num * onesuit_max

const dummy_reveal_turn = 2

const SIMU_DRAWN = 2
const DRAWN = 1
const READY = 0

// have card
const USED = 1
const VALID = 0


const UNKNOWN = -1

// not have card
const NOT_HAVE = -2

// ruff in future
const RUFF = 2
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
numMap.set(8, "6")
numMap.set(9, "5")
numMap.set(10, "4")
numMap.set(11, "3")
numMap.set(12, "2")

const INIT_SCORE = 0


const ismcts = require('ismcts');

const bridgeDatas_proto = require('bridgeDatas')
const bridgeDatas = {}
bridgeDatas.HCP = new bridgeDatas_proto.HCP()
bridgeDatas.Counter = new bridgeDatas_proto.Counter()

var public_cards = Array(total_cards).fill(READY)

var private_view_arr = Array(player_num).fill(null)

let discard_status = [
                        ...Array(suit_num)
                            .fill(null)
                            .map(() => Array(player_num).fill(READY))
                    ]
let discard_suit_count = Array(suit_num).fill(0)
let discard_check = Array(suit_num).fill(0)


var hcp_draw = {honor_valid_arr: null, combi_table: null, sum: null, 
                combi_len_arr: null, combi_hold: null, 
                valid_collects: null, start_end: null,
                if_valid: null, honor_num: 0, combi_num: 0}

                
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
        this.hcp_got = structuredClone(o.hcp_got)
        this.hcp_remain = structuredClone(o.hcp_remain)
        this.simu_hcp_remain = structuredClone(o.simu_hcp_remain)

        this.simu_table = structuredClone(o.simu_table)
        this.card_played = structuredClone(o.card_played)

        this.declarer = o.declarer
        this.dummy = o.dummy

        this.trump = o.trump
        this.contract_level = o.contract_level
        this.score = structuredClone(o.score)
        this.trick_count = structuredClone(o.trick_count)

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
        this.hcp_got = Array(player_num).fill(0)
        this.hcp_remain = Array(player_num).fill(0)
        this.simu_hcp_remain = Array(player_num).fill(0)

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
        this.declarer = UNKNOWN
        this.dummy = UNKNOWN

        this.trump = UNKNOWN
        this.contract_level = UNKNOWN
        this.score = Array(player_num).fill(INIT_SCORE)
        this.trick_count = Array(player_num).fill(0)

        this.previousPlayer = -1
        this.previous_lead_suit = -1
        // currentPlayer already set as 1
        // so using as -1

        // currentTurn help card count

        // just for html
        this.trick_str = ""
        this.playedCard = UNKNOWN
        this.playedLetter = ""

        this.winner_arr = null

        // maybe no need call when construct
        //this.deal()
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
                            
        this.final_honor_table = [
                                    ...Array(player_num)
                                        .fill(null)
                                        .map(() => Array(total_cards).fill(DRAWN))
                                ]
        this.final_regular_table = [
                                    ...Array(player_num)
                                        .fill(null)
                                        .map(() => Array(total_cards).fill(DRAWN))
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



exports.Game.prototype.num2Letter = function(card_num) {
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

    if(!ok){
        console.log(`to player ${player_idx}'s table, card ${card}, try change status from ${card_table[player_idx][card]}  to ${if_played}`)
        process.exit(0)
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
    
    /*
    deck = [2, 7, 12, 15, 16, 17, 18, 21,   4, 10, 24, 26, 27, 28, 30, 31, 
        1, 3, 5, 6, 19, 20, 25, 29,   0, 8, 9, 11, 13, 14, 22, 23
    ]
    */
   
    console.log(`in deal, deck: ${deck}`)
    console.log(`deal deck size: ${deck.length}`)


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
    this.currentPlayer = Math.floor( Math.random()* player_num ) + 1
    // for test
    this.currentPlayer = 2
    start_player = this.currentPlayer
    

    this.lead_suit = null

    this.winner_arr = null

}

exports.Game.prototype.replay = function() {
    // reset
    ismcts.Game.call(this, { nPlayers: player_num });

    for(let j=0; j<total_cards; j++){
        public_cards[j] = READY
    }

    for(let i=0; i<suit_num; i++){
        discard_check[i] = 0
        discard_suit_count[i] = 0
        for(let j=0; j<player_num; j++){
            discard_status[i][j] = READY
        }
    }



    let old_deck = Array(total_cards).fill(0)

    let ith = 0
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            if(this.hand_table[i][j] != UNKNOWN){
                old_deck[ith] = j
                this.hand_table[i][j] = UNKNOWN
                ith ++
            }
        }
    }

    // most copy from this.deal()
    for (let i=0; i<player_num; i++){
        let card_array = old_deck.slice(i*hold_max, (i+1)*hold_max)

        // related to var private_view_arr
        private_view_arr[i] = new Private_View(i, card_array)

        for (let j=0; j<card_array.length; j++){
            let card = card_array[j]
            insertCard(i, card, VALID, this.hand_table)
        }
        
    }

    for(let i=0; i<player_num; i++){
        this.score[i] = INIT_SCORE
        // for mini bridge
        this.trick_count[i] = 0

        this.hcp_remain[i] = this.hcp_got[i]
    }

    this.currentPlayer = start_player

    this.lead_suit = null

    this.winner_arr = null

    this.showTable(true)
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
                let card_letter = this.num2Letter(j)
                part_str += card_letter + " " + String(player_hand[j]) + "| "
            }
        }
        part_str += "\n"
        
    }
    console.log(part_str)
}

exports.Game.prototype.suitContract = function(declarer_hand, dummy_hand){
    // just get best suit?
    var {trump_suit, bid_level, final_expected} = bridgeDatas.Counter.loserCount(declarer_hand, dummy_hand)

    console.log(`after loserCount, trump: ${trump_suit}, bid_level: ${bid_level}`)

    // set contract
    this.trump = trump_suit
    this.contract_level = bid_level

}

// call after deal, before playing
exports.Game.prototype.bidding = function(){
    let deal_done = false
    for(let i=0; i<player_num; i++){
        let player_i_hand = this.hand_table[i]

        for(let j=0; j<total_cards; j++){
            if(player_i_hand[j] != UNKNOWN){
                let rank = j % onesuit_max
                let hcp = bridgeDatas.HCP.rank2HCP(rank)

                this.hcp_got[i] += hcp
            }
        }
    }

    console.log(`four players hcp: ${this.hcp_got}`)
    
    for(let i=0; i<player_num; i++){
        this.hcp_remain[i] = this.hcp_got[i]
    }


    // determin declarer, dummy
    let team_hcp = Array(2).fill(0)
    team_hcp[0] = this.hcp_got[0] + this.hcp_got[2]
    team_hcp[1] = this.hcp_got[1] + this.hcp_got[3]


    if(team_hcp[0] == team_hcp[1]){
        return deal_done
    }
    else{
        deal_done = true

        let declarer = 1
        let dummy = 3
        if(team_hcp[0] > team_hcp[1]){
            declarer = 0
            dummy = 2
        }
        // higher is declarer
        if(this.hcp_got[declarer] < this.hcp_got[dummy]){
            let temp = declarer
            declarer = dummy
            dummy = temp
        }
        else if(this.hcp_got[declarer] == this.hcp_got[dummy]){
            // if same, random pick
            // change to let human choose in future, if human involved
            let coin = Math.floor(Math.random() * 2)
            if(coin > 0){
                let temp = declarer
                declarer = dummy
                dummy = temp
            }
        }


        // defense opening lead as currentPlayer
        let lead_position = dummy-1
        if(lead_position < 0){
            lead_position += player_num
        }

        this.declarer = declarer + 1
        this.dummy = dummy + 1

        this.currentPlayer = lead_position + 1
        start_player = this.currentPlayer

        console.log(`declarer: ${this.declarer}, dummy: ${this.dummy} ,defense first lead: ${this.currentPlayer}`)

        // determine contract

        let declarer_hand = this.hand_table[declarer]
        let dummy_hand = this.hand_table[dummy]
        this.suitContract(declarer_hand, dummy_hand)



        return deal_done
    }


    

}

exports.Game.prototype.prepareDraw = function(){
    let player_i = this.currentPlayer - 1

    let private_i = private_view_arr[player_i]

    // clear final table
    // prepare final table
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            //private_i.final_table[i][j] = READY

            private_i.final_honor_table[i][j] = DRAWN
            private_i.final_regular_table[i][j] = DRAWN
        }

        this.simu_hcp_remain[i] = this.hcp_remain[i]
    }







    // prepare final table

    // public info and currentPlayer's hand allow all drawn
    for(let j=0; j<total_cards; j++){
        // if player_i NOT_HAVE, other may have chance, shouldn't update, only USED, VALID( > UNKNOWN)
        // if UNKNOWN, NOT_HAVE, just skip
        if(public_cards[j]!=READY || private_i.private_table[player_i][j]>UNKNOWN){
            /*
            for(let ii=0; ii<player_num; ii++){
                private_i.final_table[ii][j] = DRAWN
            }
            */
            // see if reduce player_i's simu_hcp_remain, not include USED
            if(private_i.private_table[player_i][j] == VALID){
                let pure_rank = j % onesuit_max
                let hcp_j = bridgeDatas.HCP.rank2HCP(pure_rank)
                if(hcp_j > 0){
                    this.simu_hcp_remain[player_i] -= hcp_j
                }
            }
        }
        // public available and player_i not have
        else if(public_cards[j]==READY && private_i.private_table[player_i][j]<=UNKNOWN){
            // skip player_i self
            for(let ii=0; ii<player_num&&ii!=player_i; ii++){
                let pure_rank = j % onesuit_max
                if(pure_rank <= JACK){
                    private_i.final_honor_table[ii][j] = READY
                }
                else{
                    private_i.final_regular_table[ii][j] = READY
                }
            }
        }
    }
    // player_i's simu_hcp_remain should be zero
    if(this.simu_hcp_remain[player_i] != 0){
        console.log(`simu_hcp_remain on player${player_i+1} self seems wrong`)
    }

    for(let i=0; i<player_num; i++){
        if(i!=player_i){
            for(let j=0; j<total_cards; j++){
                // case of discover, only specific player drown
                // USED, VALID, NOT_HAVE, are drawn
                if(private_i.private_table[i][j] !=UNKNOWN){
                    //private_i.final_table[i][j] = DRAWN

                    // see if reduce other i's simu_hcp_remain
                    if(private_i.private_table[i][j] == VALID){
                        let pure_rank = j % onesuit_max
                        let hcp_j = bridgeDatas.HCP.rank2HCP(pure_rank)
                        if(hcp_j > 0){
                            this.simu_hcp_remain[i] -= hcp_j
                        }
                    }
                }
                // only the case UNKNOWN is ready
                else if(private_i.private_table[i][j] ==UNKNOWN){
                    let pure_rank = j % onesuit_max
                    if(pure_rank <= JACK){
                        private_i.final_honor_table[i][j] = READY
                    }
                    else{
                        private_i.final_regular_table[i][j] = READY
                    }
                }

            }
        }
    }




    // prepare hcp_draw
    let union_honor_table = Array(total_cards).fill(DRAWN)

    // fill valid or used to simu_table
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            //if(final_table[i][j]==DRAWN){
            if(private_i.final_honor_table[i][j]==READY){
                union_honor_table[j] = READY
            }
        }
    }

    // create combination table
    hcp_draw.honor_valid_arr = Array(0)
    let honor_hcp_arr = Array(0)

    // honor only four type, fixed
    let honor_type_num = 4
    for(let i=0; i<honor_type_num; i++){
        for(let j=0; j<suit_num; j++){
            let idx = i+j*onesuit_max
            if(union_honor_table[idx] == READY){
                hcp_draw.honor_valid_arr.push(idx)

                // temporary, maybe consider back to bridgeData.HCP?
                honor_hcp_arr.push(honor_type_num-i)
            }
        }
    }

    let honor_num = hcp_draw.honor_valid_arr.length
    let combi_num = 2**honor_num

    hcp_draw.honor_num = honor_num
    hcp_draw.combi_num = combi_num

    let hcp_combi_table_temp = [
                        ...Array(combi_num)
                            .fill(null)
                            .map(() => Array(honor_num).fill(READY))
                    ]
    let hcp_combi_sum_temp = Array(combi_num).fill(0)


    hcp_draw.combi_table = [
                                    ...Array(combi_num)
                                        .fill(null)
                                        .map(() => Array(honor_num).fill(READY))
                                ]
    hcp_draw.sum = Array(combi_num).fill(0)
    hcp_draw.combi_len_arr = Array(combi_num).fill(0)
    hcp_draw.combi_hold = [
                                    ...Array(combi_num)
                                        .fill(null)
                                        .map(() => Array(player_num))
                                ]
    hcp_draw.valid_collects = [
                                ...Array(player_num)
                                    .fill(null)
                                    .map(() => new Set())
                                ]
    hcp_draw.start_end = [
                            ...Array(player_num)
                                .fill(null)
                                .map(() => [-1, -1])
                            ]
    hcp_draw.if_valid = Array(combi_num).fill(READY)

    // fill in table
    // start from 1, reduce, carry up when negative
    for(let i=0; i<combi_num; i++){
        // turn i into binary
        // from 1111 to 0000 like
        let binary_i = combi_num-1 - i

        for(let j=honor_num-1; j>=0; j--){
            // to binary, so modulo 2
            if(binary_i>0) {
                hcp_combi_table_temp[i][j] = binary_i % 2
                binary_i = Math.floor(binary_i / 2)
            }

            if(hcp_combi_table_temp[i][j] == READY){
                hcp_combi_sum_temp[i] += honor_hcp_arr[j]
            }
        }
    }

    // sort
    let hcp_sorted_idx = Array.from(hcp_combi_sum_temp.keys())
    hcp_sorted_idx.sort((a, b) => hcp_combi_sum_temp[a] - hcp_combi_sum_temp[b])

    // put into actual array
    for(let i=0; i<combi_num; i++){
        let ori_idx = hcp_sorted_idx[i]

        for(let j=0; j<honor_num; j++){
            hcp_draw.combi_table[i][j] = hcp_combi_table_temp[ori_idx][j]
        }

        hcp_draw.sum[i] = hcp_combi_sum_temp[ori_idx]
    }


    for(let i=0; i<combi_num; i++){
        // check if player able to take this combination
        for(let k=0; k<player_num; k++){
            let valid = true

            let combi_i_len = 0

            for(let j=0; j<honor_num; j++){
                if(hcp_draw.combi_table[i][j] == READY){
                    combi_i_len++
                    let valid_card = hcp_draw.honor_valid_arr[j]
                    if(private_i.final_honor_table[k][valid_card] != READY){
                        valid = false
                    }
                }
            }

            hcp_draw.combi_len_arr[i] = combi_i_len


            if(valid){
                hcp_draw.combi_hold[i][k] = READY
            }
            else{
                hcp_draw.combi_hold[i][k] = DRAWN
            }
        }
    }

    // need draw_honor_min, draw_regular_ready_num, draw_need_num
    let draw_need_num = Array(player_num).fill(hold_max)

    let final_honor_table = private_i.final_honor_table
    let private_table = private_i.private_table

    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            //if(final_table[i][j]==DRAWN){
            if(final_honor_table[i][j]==DRAWN){
                // check if drawned card hold, insert if hold
                if(private_table[i][j]!=UNKNOWN){
                    // private_table[i][j] should be USED or VALID
                    // add logic >UNKNOWN, now there's private NOT_HAVE
                    if(private_table[i][j] > UNKNOWN){
                        draw_need_num[i] --
                    }
                    // if it's NOT_HAVE, draw_need_num shouldn't minus
                }
            }
        }
    }


    // vars from regular part
    let draw_regular_ready_num = Array(player_num).fill(total_cards)

    let final_regular_table = private_i.final_regular_table

    // fill valid or used to simu_table
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            //if(final_table[i][j]==DRAWN){
            if(final_regular_table[i][j]==DRAWN){
                // public played
                draw_regular_ready_num[i] --
            }
        }
    }

    let draw_honor_min = Array(player_num)
    for(let i=0; i<player_num; i++){
        draw_honor_min[i] = Math.max(draw_need_num[i]-draw_regular_ready_num[i], 0)
    }

    // prepare valid collects for all players
    for(let i=0; i<player_num; i++){
        if(this.simu_hcp_remain[i] > 0){
            let start_idx = 0
            let found_start = false
            while(!found_start && start_idx<hcp_draw.combi_num){
                // change to this.simu_hcp_remain
                if(hcp_draw.sum[start_idx] == this.simu_hcp_remain[i]){
                    found_start = true
                }
                else{
                    start_idx++
                }
            }

            let end_idx = start_idx
            let found_end = false
            while(!found_end && end_idx<hcp_draw.combi_num){
                // change to this.simu_hcp_remain
                if(hcp_draw.sum[end_idx] > this.simu_hcp_remain[i]){
                    found_end = true
                }
                else{
                    end_idx++
                }
            }

            hcp_draw.start_end[i] = [start_idx, end_idx]
            console.log(`in prepareDraw, player ${i}, hcp valid start end: ${hcp_draw.start_end[i]}`)

            if(end_idx-start_idx <= 0){
                console.log(`found interval too narrow, strange, start: ${start_idx}, end: ${end_idx}, actual hcp remain: ${this.simu_hcp_remain[current_player]}`)
            }
            else if(!found_start){
                console.log(`unable to find start idx before find hcp combintion`)
            }
            else if(!found_end){
                console.log(`unable to find end idx before find hcp combintion`)
            }

            // push to hcp_draw.valid_collects
            for(let j=start_idx; j<end_idx; j++){
                if(hcp_draw.if_valid[j]==READY && hcp_draw.combi_hold[j][i]==READY){
                    if(draw_honor_min[i]<=hcp_draw.combi_len_arr[j] && hcp_draw.combi_len_arr[j] <= draw_need_num[i]){
                        hcp_draw.valid_collects[i].add(j)
                    }
                }
            }

        }

    }

}

function getIthElement(set, index) {
    let i = 0;
    for (const value of set) {
        if (i === index) return value;
        i++;
    }
    return undefined; // Index out of bounds
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

    let final_honor_table = private_view_arr[player_idx].final_honor_table
    let final_regular_table = private_view_arr[player_idx].final_regular_table

    // final_honor_table not been SIMU_DRAWN, no need

    // clear final_regular_table if SIMU_DRAWN
    
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            if(final_regular_table[i][j] == SIMU_DRAWN){
                final_regular_table[i][j] = READY
            }
            
            if(final_regular_table[i][j] == READY){
                let pure_rank = j % onesuit_max
                if(pure_rank <= JACK){
                    console.log(`there's honor in regular table, player: ${i}, card: ${j}`)
                }
            }
        }
    }


    // draw honor part, hcp draw
    let draw_need_num = Array(player_num).fill(hold_max)
    let draw_hcp_ready_num = Array(player_num).fill(total_cards)

    // fill valid or used to simu_table
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            if(final_honor_table[i][j]==DRAWN){
                // public played
                draw_hcp_ready_num[i] --

                // check if drawned card hold, insert if hold
                if(private_table[i][j]!=UNKNOWN){
                    // private_table[i][j] should be USED or VALID
                    // add logic >UNKNOWN, now there's private NOT_HAVE
                    if(private_table[i][j] > UNKNOWN){
                        // player i holding or played
                        let card_rank = j
                        insertCard(i, card_rank, private_table[i][j], this.simu_table)
                        draw_need_num[i] --
                    }
                    // if it's NOT_HAVE, draw_need_num shouldn't minus
                }
            }
        }
    }

    // vars from regular part
    let draw_regular_ready_num = Array(player_num).fill(total_cards)

    // fill valid or used to simu_table
    for(let i=0; i<player_num; i++){
        for(let j=0; j<total_cards; j++){
            //if(final_table[i][j]==DRAWN){
            if(final_regular_table[i][j]==DRAWN){
                // public played
                draw_regular_ready_num[i] --
            }
        }
    }

    let draw_honor_min = Array(player_num)
    for(let i=0; i<player_num; i++){
        draw_honor_min[i] = Math.max(draw_need_num[i]-draw_regular_ready_num[i], 0)
    }

    let draw_honor_arr = [
                            ...Array(player_num)
                                .fill(null)
                                .map(() => Array())
                        ]


    
    let sorted_idx = Array.from(draw_hcp_ready_num.keys())
    sorted_idx.sort((a, b) => draw_hcp_ready_num[a] - draw_hcp_ready_num[b])

    let match_loop_count = 0
    let hcp_match = false
    while(!hcp_match){
        // initialize
        for(let i=0; i<hcp_draw.if_valid.length; i++){
            if(hcp_draw.if_valid[i] == SIMU_DRAWN){
                hcp_draw.if_valid[i] = READY
            }

            /*
            for(let j=0; j<player_num; j++){
                if(hcp_draw.combi_table[i][j] == SIMU_DRAWN){
                    hcp_draw.combi_table[i][j] = READY
                }
            }
            */
        }
        for(let i=0; i<player_num; i++){
            draw_honor_arr[i].length = 0
        }
        let draw_valid_collects = [
                                    ...Array(player_num).fill(null)
                                    ]
        
        for(let i=0; i<player_num; i++){
            draw_valid_collects[i] = structuredClone(hcp_draw.valid_collects[i])
        }
        // end initialize


        let finding = true
        let match_cases = 0
        let collect_set_size_str = ""
        for(let i=0; i<player_num&&finding; i++){
            let current_player = sorted_idx[i]

            collect_set_size_str += "i=" + String(i) + ", size: "
            for(let m=0; m<player_num; m++){
                collect_set_size_str += String(draw_valid_collects[m].size) + ", "
            }
            collect_set_size_str += `\n`

            /*
            let valid_collect_str = "collect size: "
            for(let n=0; n<player_num; n++){
                valid_collect_str += `${draw_valid_collects[n].size}, `
            }
            console.log(`when i=${i}, ${valid_collect_str}`)
            */

            let is_valid = false
            if(this.simu_hcp_remain[current_player] > 0){
                // while loop
                // direct pick hcp_sum need
                // simu_drawn

                // change to check draw_valid_collects[current_player] set .size
                if(draw_valid_collects[current_player].size > 0){
                    is_valid = true
                }

                if(!is_valid){
                    console.log(`i: ${i}, current_player: ${current_player}, hcp_remain: ${this.simu_hcp_remain[current_player]}, valid_collects size seems zero: ${draw_valid_collects[current_player].size}`)
                    finding = false
                }


                // while, random pick in range
                if(is_valid){
                    let found_idx = -1
                    let valid_collect = draw_valid_collects[current_player]
                    let draw_num = valid_collect.size

                    let debug_count = 0
                    let temp_collect = []
                    while(found_idx < 0){
                        let valid_idx = Math.floor(Math.random() * draw_num)
                        // for loop get Set ith
                        let temp_idx = getIthElement(valid_collect, valid_idx)
                        temp_collect.push(temp_idx)

                        // draw_hcp_ready_num seems no need?
                        if((temp_idx!==undefined) && hcp_draw.if_valid[temp_idx]==READY && hcp_draw.combi_hold[temp_idx][current_player]==READY && draw_honor_min[current_player]<=hcp_draw.combi_len_arr[temp_idx] && hcp_draw.combi_len_arr[temp_idx] <= draw_need_num[current_player]){
                            found_idx = temp_idx                            
                        }
                        else{
                            console.log(`should match if statement, current player: ${current_player}, temp_idx: ${temp_idx}, if_valid: ${hcp_draw.if_valid[temp_idx]}`)
                            console.log(`self combi_hold: ${hcp_draw.combi_hold[temp_idx][current_player]==READY}, more than draw_min? ${draw_honor_min[current_player]<=hcp_draw.combi_len_arr[temp_idx]}, smaller than draw need? ${hcp_draw.combi_len_arr[temp_idx] <= draw_need_num[current_player]}`)
                        }
                        debug_count ++

                        if(debug_count % 500 == 0){
                            console.log(`temp collect: ${temp_collect}`)
                            console.log(`too long at found hcp combination, inner while loop, honor part`)
                            console.log(`start :${hcp_draw.start_end[current_player][0]}, end: ${hcp_draw.start_end[current_player][1]}`)
                            console.log("sorted i=", i, ", player ", current_player, "s valid collect: ", valid_collect)
                            console.log(`collect set size updated: `)
                            console.log(`${collect_set_size_str}`)
                            ouhosuhseouo
                        }
                    }
                    
                    hcp_draw.if_valid[found_idx] = SIMU_DRAWN
                    // need draw found_idx immediately
                    for(let n=i+1; n<player_num; n++){
                        let further_again = sorted_idx[n]
                        draw_valid_collects[further_again].delete(found_idx)
                    }


                    let found_combi = hcp_draw.combi_table[found_idx]
                    for(let k=0; k<hcp_draw.honor_num; k++){
                        if(found_combi[k] == READY){
                            let card_k = hcp_draw.honor_valid_arr[k]
                            draw_honor_arr[current_player].push(card_k)

                            // remove in future
                            // mark simu_drawn all combinations with card_k
                            /*
                            for(let j=0; j<hcp_draw.combi_num; j++){
                                if(hcp_draw.if_valid[j]==READY && (hcp_draw.combi_table[j][k]==READY) ){
                                    hcp_draw.if_valid[j] = SIMU_DRAWN
                                    
                                }
                            }
                            */

                            // should be for loop other sorted_idx players
                            for(let j=i+1; j<player_num; j++){
                                let further_player = sorted_idx[j]
                                if(this.simu_hcp_remain[further_player] > 0){
                                    
                                    //for(let m=hcp_draw.start_end[further_player][0]; m<hcp_draw.start_end[further_player][1]; m++){
                                    for (const m of draw_valid_collects[further_player]) {
                                        // k checked here
                                        if(hcp_draw.if_valid[m]==READY && (hcp_draw.combi_table[m][k]==READY) ){
                                            hcp_draw.if_valid[m] = SIMU_DRAWN
                                            // delete
                                            // if another player(say a) with same hcp_remain, a may drawn some combinations, let later b unable to drawn
                                            // so delete in same time
                                            for(let n=j; n<player_num; n++){
                                                let further_again = sorted_idx[n]
                                                draw_valid_collects[further_again].delete(m)
                                            }
                                        }
                                        
                                    }
                                    
                                    /*
                                    for (const valid_idx of draw_valid_collects[further_player]) {
                                        if(hcp_draw.if_valid[valid_idx]==READY && (hcp_draw.combi_table[valid_idx][k]==READY) ){
                                            hcp_draw.if_valid[valid_idx] = SIMU_DRAWN
                                            // delete
                                            draw_valid_collects[further_player].delete(valid_idx)
                                        }
                                    }
                                    */
                                    
                                }
                            }


                        }
                    }

                }
                
            }


            if(is_valid || this.simu_hcp_remain[current_player] <= 0){
                match_cases++
            }

            
        }

        if(match_cases == player_num){
            //console.log(`finish match_case loop, collect_set_size_str: `)
            //console.log(`${collect_set_size_str}`)
            //console.log(`finished in ${match_loop_count} loops`)
            hcp_match = true
        }
        else{
            //console.log(`failed, match_casas only ${match_cases}`)
            match_loop_count++

            if(match_loop_count % 5000 == 0){
                console.log(`too many loop while drawing hcp combinations`)
                /*
                for(let k=0; k<hcp_draw.combi_num; k++){
                    console.log(``)
                }
                */
                uhosuhouhsou
            }
        }
    }

    for(let i=0; i<player_num; i++){
        if(i!=player_idx){
            let draw_length = draw_honor_arr[i].length
            // update draw_need_num
            draw_need_num[i] -= draw_length

            //console.log(`player ${i}, drawn honors: ${draw_honor_arr[i]}, still draw_need_num: ${draw_need_num[i]}, regular_ready_num: ${draw_regular_ready_num[i]}`)

            // insert cards
            for(let j=0; j<draw_length; j++){
                let card_rank = draw_honor_arr[i][j]
                insertCard(i, card_rank, VALID, this.simu_table)
            }
        }
    }


    // ------------------------------------------------------------------
    // for regular part

    // draw_regular_ready_num already calculated, needed in draw honor part, hcp part
    


    /*
    if(draw_regular_ready_num[0] == 0 && draw_regular_ready_num[1] == 0 && draw_regular_ready_num[2] == 0 && draw_regular_ready_num[3] == 0){
        console.log("weired")
        huhsoeuhoehun
    }
    */

    //this.showTable(false)


    // draw unknown hidden cards
    sorted_idx = Array.from(draw_regular_ready_num.keys())
    sorted_idx.sort((a, b) => draw_regular_ready_num[a] - draw_regular_ready_num[b])

    let drawn_arr = [
                        ...Array(player_num)
                            .fill(null)
                    ]
    for (let i=0; i<player_num; i++){
        drawn_arr[i] = Array( draw_need_num[i] )
    }

    let regular_count = 0
    let regular_draw_finish = false
    while (!regular_draw_finish) {
        // initial
        for(let i=0; i<player_num-1; i++){
            for(let j=0; j<draw_need_num[i]; j++){
                drawn_arr[i][j] = UNKNOWN
            }
        }

        let draw_regular_ready_num_temp = Array(player_num)
        for(let i=0; i<player_num; i++){
            draw_regular_ready_num_temp[i] = draw_regular_ready_num[i]
        }

        // clear final_regular_table if SIMU_DRAWN
        for(let i=0; i<player_num; i++){
            for(let j=0; j<total_cards; j++){
                if(final_regular_table[i][j] == SIMU_DRAWN){
                    final_regular_table[i][j] = READY
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

                if(final_regular_table[draw_player][drawn_card] == READY){
                    // draw_player got card
                    drawn_arr[draw_player][drawn_times] = drawn_card

                    // SIMU_USED all players, include draw_player
                    // others unable to draw this card
                    for(let j=0; j<player_num; j++){
                        if(final_regular_table[j][drawn_card] == READY){
                            final_regular_table[j][drawn_card] = SIMU_DRAWN
                            if(j!=draw_player){
                                draw_regular_ready_num_temp[j] -= 1
                            }
                        }
                    }

                    drawn_times ++
                    
                }
                temp_count ++

                if(temp_count % 500 == 0){
                    console.log(`draw_need: ${draw_need_num}, , draw_regular_ready ori: ${draw_regular_ready_num}`)
                    console.log(`weired while loop, steps: ${temp_count}`)
                }
            }

            // check if hcp drawn matched
            /*
            if(hcp_drawn != this.simu_hcp_remain[draw_player]){
                drawAllowed = false
            }
            */

            // check remaining players still able to draw
            for (let j=i+1; j<player_num && drawAllowed; j++) {
                let check_id = sorted_idx[j]

                if (draw_need_num[check_id] > draw_regular_ready_num_temp[check_id]){
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
            regular_count++
            if(regular_count % 500 == 0){
                console.log(`info: finish_count ${finished_count}, draw_order: ${sorted_idx}, draw_need ${draw_need_num}, draw_regular_ready_temp: ${draw_regular_ready_num_temp}, draw_regular_ready: ${draw_regular_ready_num}`)
                huoesuhoetuhosehueons
            }
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

    return as
}

// if want to findValid on hand_table, prepare another function to do
exports.Game.prototype.allActions = function () {
    // need var to cross scope
    var as = findValid(this.currentPlayer-1, this.lead_suit, this.simu_table)

    if(as.length <= 0){
        console.log("gets nothing from table, wrong")
        for(let i=0; i<player_num; i++){
            console.log(`player ${i}'s simu_table: ${this.simu_table[i]}`)
        }
        console.log(`current player: ${this.currentPlayer-1}, game turn: ${this.currentTurn}`)
        console.log(`lead suit: ${this.lead_suit}, card played in this trick: ${this.card_played}`)
        process.exit(0)
    }

    return as
}

exports.Game.prototype.humanActions = function () {
    // need var to cross scope
    var as = findValid(this.currentPlayer-1, this.lead_suit, this.hand_table)

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
        // add ruff
        if(suit != this.lead_suit){
            if((this.lead_suit!=this.turmp) && (suit == this.trump) ){
                follow_suit = RUFF
            }
            else{
                follow_suit = DISCARD
            }
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
        let pure_rank = card_rank % onesuit_max
        let hcp_action = bridgeDatas.HCP.rank2HCP(pure_rank)
        if(hcp_action > 0){
            this.hcp_remain[this.currentPlayer-1] -= hcp_action
        }
        if(this.hcp_remain[this.currentPlayer-1] < 0){
            console.log(`hcp remain should non-negative, currentPlayer: ${this.currentPlayer}, hcp_remain: ${this.hcp_remain[this.currentPlayer-1]}`)
        }
        // just for html temporary
        this.playedCard = card_rank
        this.playedLetter = this.num2Letter(card_rank)
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


// logic about discard
function record_discard(player_pov, player_j, discard_suit) {
    let suit_status = discard_status[discard_suit]
    let start = discard_suit * onesuit_max
    let end = start + onesuit_max
    
    if(suit_status[player_j] == READY){
        console.log(`deal with player ${player_j}'s discard`)
        discard_suit_count[discard_suit] ++

        if(discard_suit_count[discard_suit]<=2){
            suit_status[player_j] = DRAWN
        }


        // update all four player's private_view
        for(let i=0; i<player_num; i++){
            let private_table = private_view_arr[i].private_table
            for(let k=start; k<end; k++){
                if(private_table[player_j][k]==UNKNOWN){
                    // same as insertCard
                    private_table[player_j][k] = NOT_HAVE
                }
            }
        }
        console.log(`suit status: ${suit_status}`)

    }
    else{
        console.log(`no need deal, player ${player_j} already discard before`)
    }

    // discard further reveal, back to player_pov
    // this will finish in one trick, each player still holdnig one time running
    if(suit_status[player_pov]==READY && discard_suit_count[discard_suit] >= 2){
        console.log("inside further reveal")
        // should only 2 players do further reveal
        if(discard_check[discard_suit] < 2){
            // only 2 players still holding suit
            // find other player not currentPlayer
            let target_id = -1
            for(let i=0; i<player_num && (target_id==-1); i++){
                if(suit_status[i]==READY && i!=player_pov ){
                    target_id = i
                }
            }
            console.log(`suit_status: ${suit_status}`)
            console.log(`found target id: ${target_id}`)

            let pov_table = private_view_arr[player_pov].private_table
            // direct using start, end
            for(let j=start; j<end; j++){
                // player_pov self may have info that NOT_HAVE, so <=UNKNOWN
                // also check card haven't been played publicly
                if(public_cards[j]==READY && pov_table[target_id][j]==UNKNOWN && pov_table[player_pov][j]<=UNKNOWN){
                    // same as insertCard
                    pov_table[target_id][j] = VALID
                }
            }

            discard_check[discard_suit]++
        }
        else{
            console.log(`done, remain holding players should already recorded`)
        }
    }

    console.log("-------------------------------------")

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

    // update if discard, except previous_id
    let discard_suit = this.lead_suit
    if(this.lead_suit == null){
        discard_suit = this.previous_lead_suit
    }
    
    // include ruff, also unable to follow
    if(this.card_played[previous_id][IF_FOLLOWED] != FOLLOW){
        console.log(`previous_id: ${previous_id}`)
        for(let i=0; i<player_num; i++){
            if(i!=previous_id){
                record_discard(i, previous_id, discard_suit)
            }
        }
    }
    
}

exports.Game.prototype.revealDummy = function() {
    if(this.currentPlayer != this.dummy){
        console.log(`something was wrong, turn 2 should be dummy's turn`)
        process.exit(0)
    }

    if(this.currentTurn == dummy_reveal_turn){

        // to all pov's private table
        // loop
        // insertCard VALID
        let dummy_id = this.currentPlayer - 1
        for(let i=0; i<player_num; i++){
            if(i!=dummy_id){
                for(let j=0; j<total_cards; j++){
                    // actually dummy's hand should all VALID
                    if(this.hand_table[dummy_id][j] >= VALID){
                        insertCard(dummy_id, j, this.hand_table[dummy_id][j], private_view_arr[i].private_table)
                    }
                }
            }
        }

        // dummy record declarer's hand as well
        let declarer_id = this.declarer-1
        for(let j=0; j<total_cards; j++){
            // actually declarer's hand should also all VALID
            if(this.hand_table[declarer_id][j] >= VALID){
                insertCard(declarer_id, j, this.hand_table[declarer_id][j], private_view_arr[dummy_id].private_table)
            }
        }

        
        // discard
        // direct call should be fine, discard_suit_count less than 2
        // dummy is the first one "discard"
        for(let i=0; i<suit_num; i++){
            record_discard(this.declarer-1, dummy_id, i)
        }
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

        let if_ruff = false
        let ruff_rank = total_cards


        //let jack_count = 0
        let lowest_rank = 0
        let lowest_pure_rank = ACE
        let lowest_player = UNKNOWN
        let lowest_ith_play = UNKNOWN

        let lowest_follow_suit = true

        let lead_id = (this.currentPlayer % player_num) + 1 - 1

        for(let i=0; i<player_num; i++){
            let if_follow = this.card_played[i][IF_FOLLOWED]
            let rank_i = this.card_played[i][RANK]


            if(if_follow == RUFF){
                if_ruff = true

                if(rank_i < ruff_rank){
                    ruff_rank = rank_i
                    best_player = i
                }
            }
            // smaller is better
            // at least lead_card will be selected
            else if( !if_ruff && if_follow == FOLLOW && rank_i < best_rank){
                best_rank = rank_i
                best_player = i
            }


            // jack count
            let pure_rank = rank_i % onesuit_max
            /*
            if(pure_rank == JACK){
                jack_count -= 1
            }
            */


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
        //this.score[lowest_player] += jack_count


        // str for html
        // consider cancel during ismcts
        this.trick_str = ""
        for(let i=0; i<player_num; i++) {
            let card_letter = this.num2Letter(this.card_played[i][RANK])

            if(i == lead_id){
                this.trick_str += `*`
            }
            if(i == best_player){
                this.trick_str += `<span style="color: green; bold;">${card_letter} </span>||| &nbsp;`
            }
            else if(i == lowest_player){
                /*
                if(jack_count <0){
                    this.trick_str += `<span style="color: red; bold;">${card_letter}(${jack_count}) </span>| &nbsp;`
                }
                else{
                    this.trick_str += `<span style="color: red; bold;">${card_letter} </span>||| &nbsp;`
                }
                */
                this.trick_str += `<span style="color: red; bold;">${card_letter} </span>||| &nbsp;`
            }
            else{
                this.trick_str += `${card_letter} ||| &nbsp;`
            }
        }

        // reset
        /*
        for(let i=0; i<this.card_played.length; i++){
            let played_i = this.card_played[i]
            for(let j=0; j<played_i.length; j++){
                this.card_played[i][j] = UNKNOWN
            }
        }
        */

        this.previous_lead_suit = this.lead_suit
        this.lead_suit = null;
    
        this.trick_count[best_player] ++

        return best_player
    }

    return null
}

exports.Game.prototype.endRound = function () {
    // return need cross scope
    var winners = Array(player_num).fill(0)

    let team_tricks = Array(2).fill(0)

    team_tricks[0] = this.trick_count[0] + this.trick_count[2]
    team_tricks[1] = this.trick_count[1] + this.trick_count[3]

    let declarer_team = (this.declarer-1) % 2
    let defense_team = (declarer_team+1) % 2

    let {scores, score_ratio} = bridgeDatas.Counter.scoring(this.contract_level, team_tricks[declarer_team], true)

    if(scores >= 0){
        winners[declarer_team] = score_ratio
        winners[declarer_team+2] = score_ratio
    }
    else {
        winners[defense_team] = score_ratio
        winners[defense_team+2] = score_ratio
    }

    return winners

}


// may need override isGameOver
exports.Game.prototype.isGameOver = function () {
    return this.winner_arr != null
}

exports.Game.prototype.rewardsFunc = function(g) {
    return g.winner_arr
}


}(typeof exports === 'undefined' ? this.exports_miniBridge = {} : exports, typeof exports === 'undefined' ? function(m) { return this['exports_'+m] } : require));