var inputDoors = document.getElementById("input-doors")
var startButt = document.getElementById("start-butt")

const door_min = 3
var door_num = 3
var door_arr = null

const price_name = ["Goat", "Car"]
const CAR = 1

var doorObj = document.getElementById("door-obj")
var askChoice = document.getElementById("ask-choice")
var finalChoice = document.getElementById("final-choice")

const keep_str = "keeping door "
const switch_str = "switch to door "
const choice_num = 2

var finalResult = document.getElementById("final-result")


// generate doors
function generate_door(){
    door_num = inputDoors.valueAsNumber

    if(door_num >= door_min){
        door_arr = new Array(door_num)

        for (let i=0; i<door_num; i++){
            door_arr[i] = 0
        }

        const car_idx = Math.floor(Math.random() * door_num)
        door_arr[ car_idx ] = 1

        return true
    }
    else{
        return false
    }
}

function generate_door_gui(){
    let qualified = generate_door()

    if(!qualified){
        doorObj.innerHTML = "Doors number need at least 3"
    }
    else{
        doorObj.replaceChildren()

        //generate door buttons
        for (let i=0; i<door_num; i++){
            var door_butt = document.createElement('button')
            door_butt.textContent = `Door ${i+1}`
            door_butt.style.width = "auto";  // Or dynamicButton.style.width = "";
            door_butt.style.height = "auto";
            door_butt.value = i


            // listener
            door_butt.addEventListener("click", (event) => {manage_goat_gui(event)} )

            //id?
            doorObj.appendChild(door_butt)

            // control by doorObj array index, unable to insert <span>

        }

    }
    // clear previous results
    askChoice.replaceChildren()
    finalChoice.replaceChildren()
    finalResult.replaceChildren()
    
}
startButt.addEventListener("click", (event) => {generate_door_gui()})

//append?



// manage goat
function manage_goat(chosen_i){
    goat_arr = new Array(door_num-1)
    for (let j=0; j<door_num-1; j++){
        goat_arr[j] = 0
    }
    var if_chose_car = false

    var hide_idx = -1
    var store_idx = 0

    for (let i=0; i<door_num; i++){
        if (door_arr[i] == 0){
            // door_i is goat

            // check if door not selected
            if (i != chosen_i){
                goat_arr[ store_idx ] = i
                store_idx += 1
            }
        }
        else{
            // door_i is car

            if (i == chosen_i){
                if_chose_car = true
            }
            else {
                hide_idx = i
            }
        }
    }

    var open_num = store_idx

    // extra deal if we chose car door
    // random choose a goat to hide/isolate if chose car
    if (if_chose_car){
        var goat_hide = Math.floor(Math.random() * store_idx)
        hide_idx = goat_arr[ goat_hide ]

        var temp = goat_arr[ goat_hide ]
        goat_arr[ goat_hide ] = goat_arr[ store_idx-1 ]
        goat_arr[ store_idx-1 ] = temp

        open_num -= 1
    }

    var open_obj ={
        goat_arr: goat_arr,
        hide_idx: hide_idx,
        open_num: open_num
    }

    return open_obj
}

function manage_goat_gui(event){

    //storedValue = event.target.value;
    var chosen_i = Number(event.target.value)

    var open_obj = manage_goat(chosen_i)
    goat_arr = open_obj.goat_arr
    hide_idx = open_obj.hide_idx
    open_num = open_obj.open_num

    let doorObj_Arr = doorObj.children

    for (let j=0; j<open_num; j++){
        open_idx = goat_arr[j]
        door_i = doorObj_Arr[open_idx]

        door_i.disabled = true
        door_i.textContent = price_name[ door_arr[open_idx] ]
    }

    // car_idx, hide_idx also disable buttons
    doorObj_Arr[chosen_i].disabled = true
    doorObj_Arr[hide_idx].disabled = true

    var choice_str = new Array(choice_num)
    var choice_id_arr = new Array(choice_num)

    if (chosen_i <= hide_idx){
        choice_str[0] = keep_str + String(chosen_i+1) + "?"
        choice_id_arr[0] = chosen_i

        choice_str[1] = switch_str + String(hide_idx+1)
        choice_id_arr[1] = hide_idx
    }
    else {
        choice_str[0] = switch_str + String(hide_idx+1) + "?"
        choice_id_arr[0] = hide_idx

        choice_str[1] = keep_str + String(chosen_i+1)
        choice_id_arr[1] = chosen_i
    }

    var choice_span = document.createElement('h4')
    choice_span.innerHTML = `What you chose is door ${chosen_i+1} <br>`
    choice_span.innerHTML = choice_span.innerHTML + choice_str[0] + " or " + choice_str[1]

    askChoice.appendChild(choice_span)

    for (let i=0; i<choice_num; i++){
        var final_door = document.createElement('button')
        if (choice_id_arr[i] == chosen_i){
            final_door.textContent = `Keep Door ${choice_id_arr[i]+1}`
        }
        else {
            final_door.textContent = `Switch to Door ${choice_id_arr[i]+1}`
        }
        final_door.style.width = "auto";  // Or dynamicButton.style.width = "";
        final_door.style.height = "auto";
        final_door.value = choice_id_arr[i]
        final_door.addEventListener('click', (event)=>{ reveal(event) })

        finalChoice.appendChild(final_door)
    }


}


// reveal
function reveal(event){
    let finalChoice_Arr = finalChoice.children
    let doorObj_Arr = doorObj.children

    for (let i=0; i<choice_num; i++){
        let idx = Number(finalChoice_Arr[i].value)
        let price_ith = price_name[ door_arr[idx] ]
        
        doorObj_Arr[idx].textContent = price_ith
        finalChoice_Arr[i].textContent = price_ith
    }

    
    var picked = Number(event.target.value)
    let result_str = `The door you chose is ${picked+1}, thing behind is ... a`
    if (door_arr[picked] == CAR){
        result_str = result_str + " car, you win!"
    }
    else{
        result_str = result_str + " goat, sorry."
    }

    finalResult.innerHTML = result_str
}