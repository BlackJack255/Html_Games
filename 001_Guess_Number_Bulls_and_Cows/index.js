//collect all digits?
const inputs = document.querySelectorAll('.digit-input');
var cursor_idx = 0

var warningStr = document.getElementById("warning-str")
const default_color = warningStr.style.color

var guessTable = document.getElementById("guess-table")
var guessButt = document.getElementById("guess-butt")

const NUM_CLASS = 10
var Qualify_hist_list = new Array(NUM_CLASS)
var Ans_hist_arr = new Array(NUM_CLASS)

const DIGIT_LEN = inputs.length
var Answer = new Array(DIGIT_LEN)

var full_input = false
var Guess_arr = new Array(DIGIT_LEN)
var Guess_status = new Array(DIGIT_LEN)

var warn_acti = false
var current_msg = ""
const dupli_msg = "Duplicate digits not allowed, all digits need unique"
const non_full_msg = `Not enough digits, please press ${DIGIT_LEN} digits`

var round_ith = 1
var if_win = false

var againButt = document.getElementById("again-butt")

// fix answer
// need function generate qualified answer

function prepare_answer(){
    var idx = 0

    for (let j=0; j<NUM_CLASS; j++){
        Ans_hist_arr[j] = 0
    }

    while (idx < DIGIT_LEN){
        const ans_ith = Math.floor(Math.random() * 10)
        if (Ans_hist_arr[ans_ith] == 0){
            Answer[idx] = ans_ith
            Ans_hist_arr[ans_ith] = 1
            idx += 1
        }
    }

    // maybe no need
    for (let i=0; i<DIGIT_LEN; i++){
        Ans_hist_arr[ Answer[i] ] = 1
    }

    againButt.style.display = "none"
    guessButt.disabled = false
    guessTable.innerHTML = ""

    round_ith = 1
    if_win = false

    inputs[0].focus()
}



prepare_answer()


guessButt.addEventListener("click", check_guess)
againButt.addEventListener("click", prepare_answer)

inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        cursor_idx = index
        if (e.target.value ) {
            if (warn_acti){
                light_off_warn()
            }
            if (index >= DIGIT_LEN-1){
                full_input = true
            }
            else if (index < DIGIT_LEN - 1){
                console.log("input idx added")
                inputs[index + 1].focus();
                cursor_idx += 1
            }
        }
        else{
            console.log("input event that with no value")
        }
        console.log("final index cursor: ", index, cursor_idx, "-----------------------")
    });

    input.addEventListener('keydown', (e) => {
        console.log("===========================================")
        console.log("keydown first?")
        if (e.key === 'Backspace') {
            console.log("backspace pressed")
            full_input = false

            if (warn_acti){
                light_off_warn()
            }
            if (!input.value && index > 0){
                inputs[index - 1].focus();
            }
        }
    });
});

function light_off_warn(){
    // turn back original color
    warningStr.innerHTML = current_msg
    warn_acti = false
}

// change color when wrong
function check_guess(){
    var print_str = `${round_ith}: `
    var a_num = 0
    var b_num = 0


    if (!full_input){
        warningStr.innerHTML = `<span class="warn-msg">${non_full_msg}</span>`
        current_msg = non_full_msg
        warn_acti = true

        inputs[cursor_idx].focus()
    }
    else{
        // reset qualify array to zero, prepare hist count
        for (let j=0; j<NUM_CLASS; j++){
            Qualify_hist_list[j] = 0
        }

        var got_issue = false

        for (let i=0; i<DIGIT_LEN; i++){
            ith_num = Number(inputs[i].value)
            Guess_arr[i] = ith_num
            Qualify_hist_list[ith_num] += 1

            //reset guess status
            Guess_status[i] = -1
        }


        for (let j=0; j<NUM_CLASS && !got_issue; j++){
            if (Qualify_hist_list[j] >= 2){
                warningStr.innerHTML = `<span class="warn-msg">${dupli_msg}</span>`
                current_msg = dupli_msg
                warn_acti = true

                got_issue = true

                inputs[cursor_idx].focus()
            }
        }

        if (!warn_acti){
            // correct, reset qualification
            full_input = false
            cursor_idx = 0
            
            for (let i=0; i<DIGIT_LEN; i++){
                if (Guess_arr[i] == Answer[i]){
                    Guess_status[i] = 1
                    a_num += 1
                }
                else if( (Qualify_hist_list[ Guess_arr[i] ] == 1) && (Ans_hist_arr[ Guess_arr[i] ] == 1)){
                    Guess_status[i] = 0
                    b_num += 1
                }

                // prepare guess result
                ith_value = inputs[i].value
                print_str = print_str + ith_value
                inputs[i].value = ""

                if( i == 0 ){
                    inputs[i].focus()
                }
            }

            console.log(Ans_hist_arr)
            console.log(Qualify_hist_list)

            console.log(Guess_status)

            print_str = print_str + ` ${a_num}A${b_num}B`

            if (a_num >=4 && b_num <=0){
                print_str = print_str + `, You Win!`
                guessButt.disabled = true
                againButt.style.display = "revert"
                if_win = true
            }

            print_str = print_str + `<br>`

            guessTable.innerHTML = guessTable.innerHTML + print_str

            warningStr.innerHTML = ""

            round_ith += 1
        }
    }

}
