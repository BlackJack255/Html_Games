(function(exports, require){
"use strict";

let hold_max = 13 


const suit_num = 4
let onesuit_max = 13

const UNKNOWN = -1


const ACE = 0
const KING = 1
const QUEEN = 2
const JACK = 3
const T = 4

const LOSERS = 0
// maybe only NT need following
const STOPPERS = 1
const TOP_WINNERS = 2
const POTEN_WINNER = 3
const POWER_TWO = 4

const TRUMP_MARGIN = 1
const MARGIN = 1
const GOOD_LEN = 8

const cumu_thres = 0.75

const numMap = new Map()
numMap.set(ACE, "A")
numMap.set(KING, "K")
numMap.set(QUEEN, "Q")
numMap.set(JACK, "J")
// change to conveinent T
numMap.set(4, "T")
numMap.set(5, "9")
numMap.set(6, "8")
numMap.set(7, "7")
numMap.set(8, "6")
numMap.set(9, "5")
numMap.set(10, "4")
numMap.set(11, "3")
numMap.set(12, "2")

const grand_slam = hold_max-1
const small_slam = hold_max-2
const trump_game = grand_slam-3
const loser_limit = 7

// scores
// follow Dr. Shen Chun-shan's suggest
// trick no count, minor and major same game level
// His personal profile: https://en.wikipedia.org/wiki/Shen_Chun-shan
const trump_score = [0, 0, 0, 0, 0, 0, 
                    200, 200, 200, 500, 500, 1000, 2000]


const penalty_score = [0, 100, 200, 300, 500, 700,
                        900, 1100, 1300, 1500, 1700, 1900, 2100, 2300]

// hcp
exports.HCP = function() {
    this.table = new Map()

    this.table.set(ACE, 4)
    this.table.set(KING, 3)
    this.table.set(QUEEN, 2)
    this.table.set(JACK, 1)
}

exports.HCP.prototype.rank2HCP = function(card_rank) {
    return this.table.get(card_rank) ?? 0
}

// loser count

exports.Counter = function() {
    // honors map to table idx
    this.count_table = [
                        [    0,     1,   1,     0,  0],
                        [    1,     0,   0,     0,  0],

                        [    0,     2,   2,     0,  0],
                        [  0.5,   1.5,   1,   0.5,  1],
                        [    1,     1,   1,     0,  0],
                        [    1,     1,   0,     1,  0],
                        [  1.5,   0.5,   0,   0.5,  1],
                        [    2,     0,   0,     0,  0],

                        [    0,     3,   3,     0,  0],
                        [  0.5,   2.5,   1,   1.5,  1],
                        [  0.5,   2.5,   2,   0.5,  1],
                        [0.875, 2.125,   2, 0.125,  3],
                        [ 1.25,  1.75,   1,  0.75,  2],

                        [1.125, 1.875,   1, 0.875,  3],
                        [    1,     2,   0,     2,  0],
                        [  1.5,   1.5,   0,   1.5,  1],
                        [  1.5,   1.5,   0,   1.5,  1],
                        [    2,     1,   0,     1,  0],

                        [    1,     2,   2,     0,  0],
                        [  1.5,   1.5,   1,   0.5,  1],
                        [1.875, 1.125,   1, 0.125,  3],
                        [    2,     1,   1,     0,  0],
                        [  1.5,   1.5,   0,   1.5,  1],

                        [    2,     1,   0,     1,  0],
                        [2.125, 0.875,   0, 0.875,  3],
                        [2.125, 0.875,   0, 0.875,  3],
                        [  2.5,   0.5,   0,   0.5,  1],
                        [2.875, 0.125,   0, 0.125,  3],

                        [    2,     1,   1,     0,  0],
                        [  2.5,   0.5,   0,   0.5,  1],
                        [ 2.75,  0.25,   0,  0.25,  2],
                        [    3,     0,   0,     0,  0],
                        [    3,     0,   0,     0,  0],

                        ]

    this.combi2count = new Map()
    // length 1
    this.combi2count.set("A", 0)
    this.combi2count.set("X", 1)

    // length 2
    this.combi2count.set("AK", 2)
    this.combi2count.set("AQ", 3)
    this.combi2count.set("AX", 4)
    this.combi2count.set("KQ", 5)
    this.combi2count.set("KX", 6)
    this.combi2count.set("XX", 7)

    // length >=3
    this.combi2count.set("AKQ", 8)
    this.combi2count.set("AQJ", 9)
    this.combi2count.set("AKJ", 10)
    this.combi2count.set("AKT", 11)
    this.combi2count.set("AJT", 12)

    this.combi2count.set("AQT", 13)
    this.combi2count.set("KQJ", 14)
    this.combi2count.set("KQT", 15)
    this.combi2count.set("KJT", 16)
    this.combi2count.set("QJT", 17)

    this.combi2count.set("AKX", 18)
    this.combi2count.set("AQX", 19)
    this.combi2count.set("AJX", 20)
    this.combi2count.set("ATX", 21)
    this.combi2count.set("KQX", 22)

    this.combi2count.set("KJX", 23)
    this.combi2count.set("KTX", 24)
    this.combi2count.set("QJX", 25)
    this.combi2count.set("QTX", 26)
    this.combi2count.set("JTX", 27)

    this.combi2count.set("AXX", 28)
    this.combi2count.set("KXX", 29)
    this.combi2count.set("QXX", 30)
    this.combi2count.set("JXX", 31)
    this.combi2count.set("XXX", 32)



    // distribution
    this.opponent_length = new Map()
    // our length, map to opponent length
    this.opponent_length.set(13, 0)
    this.opponent_length.set(12, 1)
    this.opponent_length.set(11, 2)
    this.opponent_length.set(10, 2)
    this.opponent_length.set(9, 3)
    this.opponent_length.set(8, 3)
    this.opponent_length.set(7, 4)
    this.opponent_length.set(6, 5)
    this.opponent_length.set(5, 5)
    this.opponent_length.set(4, 6)
    this.opponent_length.set(3, 6)
    this.opponent_length.set(2, 7)
    this.opponent_length.set(1, 7)
    this.opponent_length.set(0, 8)
}

function getHonors(top_len, card_arr) {
    var top_honor = ""
    for(let k=0; k<top_len; k++)
    {
        let is_honor = false
        // turn to simple string
        if(top_len >= 3){
            if(k==0 && card_arr[k] < T){
                is_honor = true
            }
            else if(k > 0 && card_arr[k] <= T){
                is_honor = true
            }
        }
        else if(top_len == 2){
            if(k==0 && card_arr[k] <= KING){
                is_honor = true
            }
            else if(k==1 && card_arr[k] <= QUEEN){
                is_honor = true
            }
        }
        else{
            if(card_arr[k] == ACE){
                is_honor = true
            }
        }


        if(is_honor){
            top_honor += numMap.get(card_arr[k])
        }
        else{
            // less than 10 -> X
            top_honor += "X"
        }
    }

    return top_honor
}

function getPenalty(start_losers, losers_cumu, dist_sample_num, losers_dist) {
    let possible = true
    let total_penalty = 0
    for(let i=start_losers+1; i<hold_max&&possible; i++){
        let down_tricks = i-start_losers

        let down_expected = (- penalty_score[down_tricks] * losers_dist[i]) / dist_sample_num

        total_penalty += down_expected
        
        if(losers_cumu[i] >= dist_sample_num){
            possible = false
        }
    }

    return total_penalty
}

exports.Counter.prototype.loserCount = function(declarer_hand, dummy_hand) {
    let losers = Array(suit_num).fill(0)
    let trump_losers = Array(suit_num).fill(0)

    let suit_length = Array(suit_num).fill(0)

    for(let i=0; i<suit_num; i++){
        let start = i*onesuit_max
        let end = start + onesuit_max
        let card_arr = []
        let declarer_len = 0
        let dummy_len = 0
        // for each suit
        for(let j=start; j<end; j++){
            // if declarer or dummy got card
            // naturally lower to higher, A K Q to small
            if(declarer_hand[j]!=UNKNOWN || dummy_hand[j]!=UNKNOWN){
                let rank = j % onesuit_max
                card_arr.push(rank)
                if(declarer_hand[j]!=UNKNOWN){
                    declarer_len ++
                }
                else if(dummy_hand[j]!=UNKNOWN){
                    dummy_len ++
                }
            }
        }

        // get top ranks from card_arr
        // w.r.t declarer holding length
        // also check combine with dummy
        let top_len = Math.min(declarer_len, 3)
        let top_honor = getHonors(top_len, card_arr)

        
        let our_total = declarer_len + dummy_len
        let oppon_len = this.opponent_length.get(our_total)
        suit_length[i] = our_total
        
        // count first 3 cards
        if(declarer_len > 0){
            let table_idx = this.combi2count.get(top_honor)
            
            losers[i] = this.count_table[table_idx][LOSERS]

            // to avoid carrying up to integer or less demical
            // eg 1.5 loser + 4th 0.5 = 2, 0.5 missing
            // so add small remainder to maintain demical
            let power_two = this.count_table[table_idx][POWER_TWO]
            power_two = Math.max(power_two+1, 4)
            let remainder = 0.5**power_two

            // if 4th card is J or T, no loser, else 0.5
            // 5th+ 0.25 loser
            for(let k=top_len; k<declarer_len; k++){
                if(k < oppon_len){
                    if(k<=3){
                        if(card_arr[k] > T){
                            losers[i] += 0.5 + remainder
                        }
                    }
                    else if(k>3){
                        losers[i] += 0.25
                    }
                }
            }
        }
        else{
            losers[i] = 0
        }

        
        // this time combine with dummy, pick max
        let max_len = Math.max(declarer_len, dummy_len)
        let trump_top_len = Math.min(max_len, 3)
        let full_top_honor = getHonors(trump_top_len, card_arr)
        
        if(max_len > 0){
            let full_idx = this.combi2count.get(full_top_honor)

            trump_losers[i] = this.count_table[full_idx][LOSERS]

            // to avoid carrying up to integer or less demical
            // eg 1.5 loser + 4th 0.5 = 2, 0.5 missing
            // so add small remainder to maintain demical
            let power_two = this.count_table[full_idx][POWER_TWO]
            power_two = Math.max(power_two+1, 4)
            let remainder = 0.5**power_two

            // if 4th card is J or T, no loser, else 0.5
            // 5th+ 0.25 loser
            for(let k=trump_top_len; k<max_len; k++){
                if(k<oppon_len){
                    if(k<=3){
                        if(card_arr[k] > T){
                            trump_losers[i] += 0.5 + remainder
                        }
                    }
                    else if(k>3){
                        trump_losers[i] += 0.25
                    }
                }
            }
        }
        else{
            trump_losers[i] = oppon_len
        }

        // check distribution
        // opponent longer than us
        // trump additional loser
        let additional_loser = Math.max(0, oppon_len-max_len)

        trump_losers[i] += additional_loser


        

        
    }

    // choose best trump
    let losers_total = 0
    for(let i=0; i<suit_num; i++){
        losers_total += losers[i]
    }

    var total_losers = Array(suit_num).fill(0)
    let best_suit = -1
    let best_trump_losers = hold_max
    let best_losers = hold_max
    let best_suit_len = 0

    for(let i=0; i<suit_num; i++){
        let side_losers = losers_total - losers[i]
        total_losers[i] = side_losers + trump_losers[i]

        let new_best = false
        // less is better
        // with some accept margin
        if(trump_losers[i] <= best_trump_losers+TRUMP_MARGIN){
            if(trump_losers[i] < best_trump_losers ){
                if((total_losers[i]<best_losers+MARGIN) && (suit_length[i]>=best_suit_len)){
                    new_best = true
                }
            }
            else{
                if((total_losers[i]<best_losers) && (suit_length[i]>=best_suit_len)){
                    new_best = true
                }
                else if((total_losers[i]==best_losers) && (suit_length[i]>best_suit_len)){
                    new_best = true
                }
            }
        }
        if(new_best){
            best_suit = i
            best_trump_losers = trump_losers[i]
            best_losers = total_losers[i]
            best_suit_len = suit_length[i]
        }
    }

    var final_losers = Array(suit_num).fill(0)
    for(let i=0; i<suit_num; i++){
        if(i == best_suit){
            final_losers[i] = trump_losers[i]
        }
        else{
            final_losers[i] = losers[i]
        }
    }

    // prepare for convolution
    let final_loser_cases = [
                                ...Array(suit_num)
                                    .fill(null)
                                    .map(() => Array(0))
                            ]

    for(let i=0; i<suit_num; i++){
        let losers_i = final_losers[i]

        let loser_base = Math.floor(losers_i)

        // binary split 0.5^j?
        let ratio_step = 0.5
        let split_ratio = 0.5
        let plus_minus = 1

        let split_times = 0
        let finish = false
        let current_loser = loser_base
        if(loser_base == losers_i){
            finish = true
        }
        else{
            split_times ++
        }
        
        while(!finish){
            current_loser = current_loser + split_ratio*plus_minus

            if(losers_i >= current_loser){
                plus_minus = 1
            }
            else{
                plus_minus = -1
            }

            if(current_loser == losers_i){
                finish = true
            }
            else{
                split_times ++
                split_ratio = split_ratio * ratio_step
            }
        }

        let sample_num = 2 ** split_times
        let loser_fraction = losers_i - loser_base
        let higher_sample_num = Math.floor(loser_fraction * sample_num)
        let lower_sample_num = sample_num - higher_sample_num

        for(let j=0; j<lower_sample_num; j++){
            final_loser_cases[i].push(loser_base)
        }

        for(let j=0; j<higher_sample_num; j++){
            final_loser_cases[i].push(loser_base+1)
        }
    }

    for(let i=0; i<suit_num; i++){
        console.log(`final_loser_cases ${i}: ${final_loser_cases[i]}`)
    }

    // deal with convolution, via while
    // count, form prob dist
    // expected value each contract, find best
    // cumulative, get 0.25 as minimum
    // same best suit, check 3 4 6 7
    var losers_dist = Array(hold_max).fill(0)
    var losers_cumu = Array(hold_max).fill(0)

    let conv_index = Array(suit_num).fill(0)
    let last_index = suit_num-1
    let current_index = 0

    while(current_index<suit_num){
        let conv_i = 0
        for(let i=0; i<suit_num; i++){
            conv_i += final_loser_cases[i][conv_index[i]]
        }
        losers_dist[conv_i]++

        current_index = 0
        let if_carry = true

        while(if_carry && current_index<suit_num){
            conv_index[current_index]++
            if(conv_index[current_index] >= final_loser_cases[current_index].length){
                conv_index[current_index] = 0
                current_index++
            }
            else{
                if_carry = false
            }
        }

    }


    losers_cumu[0] = losers_dist[0]
    for(let i=1; i<hold_max; i++){
        losers_cumu[i] = losers_cumu[i-1] + losers_dist[i]
    }

    let dist_sample_num = losers_cumu[hold_max-1]
    let loser_thres = Math.ceil(dist_sample_num*cumu_thres)

    // get basic contract level, cumu_thres
    let basic_losers = 0
    let found_level = false
    while((basic_losers<hold_max) && !found_level){
        if(losers_cumu[basic_losers]>=loser_thres){
            found_level = true
        }
        else{
            basic_losers ++
        }
    }
    // force bid minimum level
    if(basic_losers >= loser_limit){
        basic_losers = loser_limit
    }
    let basic_level = hold_max-1 - basic_losers
    let final_level = basic_level
    let final_expected = 0

    let partial_expected = 0
    let game_expected = 0
    let small_slam_expected = 0
    let grand_slam_expected = 0

    let if_grand_slam = false
    let if_small_slam = false
    let if_game = false

    partial_expected = (trump_score[basic_level] * losers_cumu[basic_losers]) / dist_sample_num
    partial_expected += getPenalty(basic_losers, losers_cumu, dist_sample_num, losers_dist)
    
    final_expected = partial_expected
    
    // game?
    if(basic_level >= trump_game){
        if_game = true
        game_expected = partial_expected
    }
    // game expected
    else{
        let game_losers = hold_max-1 - trump_game
        game_expected = (trump_score[trump_game] * losers_cumu[game_losers]) / dist_sample_num
        game_expected += getPenalty(game_losers, losers_cumu, dist_sample_num, losers_dist)

        if(game_expected > partial_expected){
            if_game = true
            final_level = trump_game
            final_expected = game_expected
        }

    }


    // small slam?
    // 12 level expected
    if(if_game){
        if(basic_level >= small_slam){
            if_small_slam = true
            small_slam_expected = partial_expected
        }
        else{
            let slam_losers = hold_max-1 - small_slam
            small_slam_expected = (trump_score[small_slam] * losers_cumu[slam_losers]) / dist_sample_num
            small_slam_expected += getPenalty(slam_losers, losers_cumu, dist_sample_num, losers_dist)

            if(small_slam_expected > game_expected){
                if_small_slam = true
                final_level = small_slam
                final_expected = small_slam_expected
            }
        }
    }


    // grand slam?
    if(if_small_slam){
        if(basic_level >= grand_slam){
            if_grand_slam = true
            grand_slam_expected = partial_expected
        }
        else{
            let slam_losers = hold_max-1 - grand_slam
            grand_slam_expected = (trump_score[grand_slam] * losers_cumu[slam_losers]) / dist_sample_num
            grand_slam_expected += getPenalty(slam_losers, losers_cumu, dist_sample_num, losers_dist)

            if(grand_slam_expected > small_slam_expected){
                if_grand_slam = true
                final_level = grand_slam
                final_expected = grand_slam_expected
            }
        }
    }

    // back to actual goal tricks
    final_level = final_level + 1

    console.log(`expected scores, partial: ${partial_expected}, game: ${game_expected}, small slam: ${small_slam_expected}, grand slam: ${grand_slam_expected}`)


    


    return {trump_suit: best_suit, bid_level: final_level, trump_expected: final_expected}
}


exports.Counter.prototype.winnerCount = function(declarer_hand, dummy_hand) {
}


exports.Counter.prototype.scoring = function(contract_level, actual_taking, if_trump) {
    let difference = actual_taking - contract_level

    let scores = 0
    let score_ratio = 0
    if(difference >=0){
        // make
        if(if_trump){
            scores = trump_score[contract_level-1]
        }
        else{
            console.log(`currently not serving NT scoring`)
        }
        score_ratio = 1.0
    }
    else{
        // down

        // this may change in future
        
        scores = -penalty_score[-difference]
        let score_raw_ratio = (trump_score[contract_level-1] + penalty_score[-difference] ) / trump_score[contract_level-1]

        // sigmoid like function
        // our score_raw must be positive, so no need consider large negative
        // sigmoid(1.0) ~= 0.73
        score_ratio = 1/(1+Math.exp(-score_raw_ratio))
    }

    return {scores: scores, score_ratio: score_ratio}
}


}(typeof exports === 'undefined' ? this.exports_bridgeDatas = {} : exports, typeof exports === 'undefined' ? function(m) { return this['exports_'+m] } : require));