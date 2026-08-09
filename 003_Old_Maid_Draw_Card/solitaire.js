// Selection and Drag Drop interactions under development

//clone partial element: https://codepen.io/Danny-Engelman/pen/bJozWZ


/**
 *  key functions:
 *      sequences/long piles(ctrl+f), instead of one pile, pile be like sequences
 */


/**
 * checkPlayerPile(evt, key_ls), temporary allow all players concat release
 *      later need fix at human_piles
 * 
 */

let ___DROPLOCATION_SCALE___ = 1.2;
let ___DROPLOCATION_COLOR___ = 'yellowgreen';

let BACK_CARD_STYLE = "00"
let FOUNDATION_BASE_STYLE = "FF"
let player_num = 4
let current_player_num = 4
let game_end = false

let pause_ms = 750
let is_sleep = false

// for draggings
let is_drag = true
let is_piles = false // need fix all time?

let draggingFromPile = false;   // DOM Element TablePileN
let drag_card_id = 0;
let draggingOverPile = false;   // DOM Element TablePileM
let human_Pile = null;
let human_target = null;
let human_id = 0;
let if_human_won = false

let dragMouseMove = false;      // Event handler
let dragMouseUp = false;        // Event handler
// end for draggings

// random item from Array x OR beteen 0 and x value
let random = x => Array.isArray(x) ? x[random(x.length)] : 0 | x * Math.random();

// keywords just for filter out all player piles
//let key_id_ls = ['Piles', 'center']
let key_id_ls = ['piles', 'player']
let key_id_aim_human = structuredClone(key_id_ls)

// frequent used
let filterElementUnderCursor = (evt, name) => [...document.elementsFromPoint(evt.pageX, evt.pageY)].filter(el => el.nodeName.includes(name))[0];
// "piles" with s, player holding, each Pile without s, distinguish
let filterPlayerZoneUnderCursor = (evt, key_list) => [...document.elementsFromPoint(evt.pageX, evt.pageY)].filter(el => key_list.every(key_id => el.id.includes(key_id)))

// variables for clickCardBorderAndSequence
var click_x_range = [-1, -1]
var click_y_range = [-1, -1]
var xy_clicked = false

var grabbedFromPileChildren = null;
// end variables for clickCardBorderAndSequence

let gameStatus = document.getElementById('status')
let status_default_str = structuredClone(gameStatus.innerHTML)



        // # functions for initDraggingPile
            // functions for showValidDropLocations
                // this one also for moveDraggingPile
let cardData = cid => {
    if (cid) {
        if (typeof cid != 'string') {
            console.warn('extract cid', typeof cid);
            cid = cid.getAttribute('cid');
        }
        let sequenceStart = 'K';            // King can start a new sequence on a Foundation
        let cardOrder = '0A23456789TJQK0';
        let rank = cid[0];
        let suit = cid[1];
        let isBase = sequenceStart.includes(rank);
        let reds = ['H', 'D'];
        let isRed = reds.includes(suit);
        let otherSuit = isRed ? ['S', 'C'] : reds;
        let idx = cardOrder.indexOf(rank);
        let higher = cardOrder[idx + 1];
        let lower = cardOrder[idx - 1];
        let upper = x => x.toUpperCase();
        let twoSuitCards = x => [x + otherSuit[0], x + otherSuit[1]];
        return {
            isBase,
            cid: upper(rank + suit),
            red: isRed,
            black: !isRed,
            color: isRed ? 'red' : 'black',
            isFoundation: rank == 'F',
            lowerSuits: twoSuitCards(lower),
            higherSuits: isBase ? ['FF'] : twoSuitCards(higher),
            lower: upper(lower + suit),
            higher: upper(higher + suit)
        };
    } else {
        console.warn('WTF?', cid);
    }
}
            
            // end functions for showValidDropLocations

            // this one also for moveDraggingPile
// target pile id still fixed at 'TablePile'
// but maybe html id change to something like 'CenterPile'
let showValidDropLocations = cardt => {
    let styleElement = DropLocations;
    [...styleElement.sheet.rules].map(() => styleElement.sheet.deleteRule(0));
    if (cardt) {
        // piledid able to point at via Pile_id_str, cid from input cardt, here cid is its higherSuits
        // see if game rules need check one cardt logic or not
        let rule = (pileid, cid) => {
            // change to set whole CARDTS-CARD
            let cssrule = `[id*="${pileid}"] CARDTS-CARD:last-child[cid="${cid}"] img{--cardBorderColor:${___DROPLOCATION_COLOR___};scale:${___DROPLOCATION_SCALE___}}`;
            //console.log(cssrule);
            return cssrule;
        };
        let data = cardData(cardt.id);
        let insertRule = x => DropLocations.sheet.insertRule(x);
        // now id is CenterPile
        (data.higherSuits).map(cid => insertRule(rule('TablePile', cid)));
        insertRule(rule('FoundationPile', data.lower));
    }

};

let showValidDropZone = (activate) => {
    // maybe manual control global var
    if (activate){
        human_Pile.style.border = `4px solid ${___DROPLOCATION_COLOR___}`
    }
    else{
        human_Pile.style.border = "none"
    }

};
        // # end functions for initDraggingPile

    // # functions need for handleDragStart
let initDraggingPile = draggedElement => {
    draggingFromPile = draggedElement.closest('CARDTS-ZONE');   // closest ZONE is TablePileN
    draggingFromPile.classList.add('draggingFromPile');
    let pilecards = [...draggingFromPile.children];
    let cardnr = pilecards.indexOf(draggedElement);
    // cancel slice, direct call idx if one card only
    console.log("in initDragging: ")
    console.log("before append, draggingfromPile: ", draggingFromPile.children.length)
    // append will "move" original card out, put to new piles
    DraggingPile.append(...pilecards.slice(cardnr));
    console.log("after, draggingfromPile: ", draggingFromPile.children.length)
    DraggingPile.style.width = calculatedCardWidth;
    //showValidDropLocations(DraggingPile.firstElementChild);
    showValidDropZone(true)
}

// try include drag or cilck, piles or one card
let initMovingPileOldMaid = (draggedElement, is_drag=true, is_piles=true) => {
    // still get draggingFromPile, so still get original dragged card
    let tempFromPile = draggedElement.closest('CARDTS-ZONE');   // closest ZONE is TablePileN
    tempFromPile.classList.add('draggingFromPile');
    let pilecards = [...tempFromPile.children];
    let cardnr = pilecards.indexOf(draggedElement);
    // to hidden display, later to visible
    drag_card_id = cardnr

    let grabbedPile = null;

    
    if (is_piles) {
        // direct reference
        grabbedPile = pilecards.slice(cardnr)

        // click card mode
        if (!is_drag){
            grabbedFromPileChildren = grabbedPile
        }
    }
    else{
        // # if one card
        // both drag or click all need grabbedFromPileChildren
        grabbedFromPileChildren = [pilecards[cardnr]]
        let suit = grabbedFromPileChildren[0].getAttribute('suit')
        let rank = grabbedFromPileChildren[0].getAttribute('rank')
        let cid = grabbedFromPileChildren[0].getAttribute('cid')
        let is_joker = grabbedFromPileChildren[0].getAttribute('is_joker') == "true"
        
        // create copy with dict
        // only for drag display
        if (is_drag){
            grabbedFromPileChildren[0].style.visibility = "hidden"

            let grabbedCard = null
            if (is_joker){
                // Joker
                grabbedCard = newCard("AS", add_joker, joker_id)
            }
            else{
                grabbedCard = newCard({ suit, rank })

            }

            // now new card defalut BACK_CARD_STYLE)
            /*
            if(cid == BACK_CARD_STYLE){
                turn_card(grabbedCard)
            }
            */
            //else{
            set_card_style(grabbedCard)
            //}
            
            // array like
            grabbedPile = [grabbedCard]
        }        
    }

    if (is_drag){
        // dragging mode
        draggingFromPile = draggedElement.closest('CARDTS-ZONE');   // closest ZONE is TablePileN
        draggingFromPile.classList.add('draggingFromPile');

        // visibility should still hidden
        
        DraggingPile.append(...grabbedPile)
    }

    // steps for all cases
    DraggingPile.style.width = calculatedCardWidth;
    // no more dropLocations in old maid
    //showValidDropLocations(DraggingPile.firstElementChild);
    showValidDropZone(true)
}

        // # functions for moveDraggingPile
let clearDraggingPileIndicator = () => {
    if (draggingOverPile) {
        draggingOverPile.classList.toggle('validDropPile', false);
        draggingOverPile.classList.toggle('notvalidDropPile', false);
    }
}

// draggingPiles not show?
let checkValidZone = (evt) => {
    let overZone = filterPlayerZoneUnderCursor(evt, key_id_ls)

    if (draggingOverPile) clearDraggingPileIndicator();


    if (overZone){
        // assign green background validDropPile or not
        // check zone id be player zone or not
        let validPile = false
        let zone_len = overZone.length
        let valid_ith = -1
        for (let i=0; (i<zone_len && !validPile); i++){
            if (overZone[i].id == human_Pile.id){
                valid_ith = i
                validPile = true
            }
        }
        
        if (validPile){
            draggingOverPile = overZone[valid_ith]
            if (validPile){
                let className = 'validDropPile';
                draggingOverPile.classList.toggle(className, true);
            }
        }
    }
}
        // # end functions for moveDraggingPile
        

let dragCardLeft = false, dragCardTop = false;
let moveDraggingPile = evt => {
    // keep using direct ref to html?
    let dragElement = DraggingPile;
    let clickedCard = false;
    let positionDraggingPile = () => {
        if (clickedCard) {
            dragElement.style.visibility = 'visible';
            dragElement.style.left = evt.pageX - dragCardLeft;
            dragElement.style.top = evt.pageY - dragCardTop;
            //console.log('dragging', evt.pageX, evt.pageY, clickedCard.id, dragCardLeft, dragCardTop);
            let card = filterElementUnderCursor(evt, 'CARDTS-CARD');
            if (card) {
                let cardZindex = getComputedStyle(card).zIndex + 1;
                //dragElement.style.rotate = (evt.movementX < 0 ? '-2' : '2') + 'deg';
                dragElement.style.zIndex = cardZindex;
            }
        }
    }
    if (evt && dragElement.children.length) {
        clickedCard = filterElementUnderCursor(evt, 'CARDTS-CARD');
        if (clickedCard && !dragCardLeft) {
            let clickCard_rect = clickedCard.getBoundingClientRect();
            dragCardLeft = evt.pageX - clickCard_rect.left + 2;
            dragCardTop = evt.pageY - clickCard_rect.top;
        }
        // originally overPile is ith_pile in tablePiles, foundations, etc
        // old maid no longer card ZONE, search by id instead
        // change to our logic, point at whole playerPile
        // comment out start here
        
        //let overPile = filterElementUnderCursor(evt, 'ZONE');
        positionDraggingPile();
        /*
        //new pile?
        if (overPile && overPile.id !== draggingOverPile.id) {
            if (draggingOverPile) clearDraggingPileIndicator();
            draggingOverPile = overPile;
            let lastCard = cardData(draggingOverPile.lastChild.id);
            let firstCard = cardData(dragElement.firstElementChild.id);
            //pile type: Sequence , Foundation
            // similar logic as showValidDropLocation? seems inversely
            let validPile = (firstCard.isBase && lastCard.isFoundation) || lastCard.lowerSuits.includes(firstCard.cid);
            console.log(validPile, 'dragging over', draggingOverPile.id, firstCard.higherSuits);
            let className = (validPile ? '' : 'not') + 'validDropPile';
            draggingOverPile.classList.toggle(className, true);
        }
        */
       // old-maid human piles zone
       checkValidZone(evt)
    } else {
        clearDraggingPileIndicator();
        dragElement.innerHTML = '';
        dragElement.style.visibility = 'hidden';
        draggingOverPile = false;
        if (draggingFromPile) draggingFromPile.classList.remove('draggingFromPile');
        draggingFromPile = false;
        //showValidDropLocations(false);
        showValidDropZone(false)
    }
}

function if_base_card(cardts_card){
    let cid = cardts_card.getAttribute('cid')

    return cid == "FF"
}

function checkPlayerPile(evt, key_ls) {
    let playerZone = filterPlayerZoneUnderCursor(evt, key_ls)

    let releasePile = false
    // overZone array like

    // check if zone match id
    if (playerZone){
        let playerZone_0th = playerZone[0]
        // temporary allow all players release
        if(playerZone_0th){
        //if(playerZone_0th && playerZone_0th.id == human_Pile.id){
            // if so, get 0th child pile as releasePile
            releasePile = playerZone_0th.children[0]
        }
    }

    return releasePile
}

function concat_release(releasePile, draggingPile_children, if_turn_face=false){
    if(if_turn_face){
        let drag_length = draggingPile_children.length
        for(let i=0; i<drag_length; i++){
            let card_ith = draggingPile_children[i]
            turn_card(card_ith)
        }
    }
    releasePile.append(...draggingPile_children);
    let pileCardCount = releasePile.children.length;
    console.log("should done concat release")
    if (pileCardCount > 10) {
        let lastCard = releasePile.lastChild;
        if (lastCard.offsetHeight + lastCard.offsetTop > window.innerHeight) {
            releasePile.style.setProperty('--TableOffsetY', 'calc(120px/' + pileCardCount / 5 + ')');
        }
        console.log(getComputedStyle(releasePile).getPropertyValue('--TableOffsetY'));
    }
}

    // # end functions need for handleDragStart


// function for newCard
function handleDragStart(evt) {
    console.log("start handleDrag")
    evt.preventDefault();

    if (false) {
        //replace dragging object with a Blank IMG
        evt.dataTransfer.setData('text/plain', '');
        var img = new Image();
        //img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        img.src = '../handleftright.png';
        img.style.width = '100px';
        document.body.appendChild(img);
        evt.dataTransfer.setDragImage(img, 100, 100);
        //img.remove();
    }
    console.log("in handleDragStart, this: ", this)

    // check if it's human's target
    let overZone = filterPlayerZoneUnderCursor(evt, key_id_ls)
    let zone0th = overZone[0]
    let get_target = false
    if(zone0th){
        get_target = zone0th.id == human_target.id_str
    }

    // check if id not FF base card
    // base card unable to drag or click
    let is_base_ff = if_base_card(this)
    console.log("is this base card? :", is_base_ff)
    if (get_target && !is_base_ff && !game_end && !is_sleep){
        if (xy_clicked){
            click_cancel()
        }
        //initDraggingPile(this);
        is_drag = true
        initMovingPileOldMaid(this, is_drag, is_piles);

        dragMouseMove = document.addEventListener('mousemove', moveDraggingPile);
        dragMouseUp = document.addEventListener("mouseup", evt => {
            if (DraggingPile.children.length) {
                let dropElement = document.elementFromPoint(evt.pageX, evt.pageY);
                
                // give back card visibility
                if (grabbedFromPileChildren[0].style.visibility == "hidden"){
                    grabbedFromPileChildren[0].style.visibility = "visible"
                }

                // zone too small for horizontal player
                //let releasePile = filterElementUnderCursor(evt, 'ZONE');
                let releasePile = checkPlayerPile(evt, key_id_aim_human)
                let if_turn_face = true
                //let has_draggable = .hasAttribute("draggable")
                // check if piles or one card
                // need grabbedFromPileChildren if one card
                if (is_piles){
                    if (releasePile) {
                        console.log('dropped on', releasePile.id, dropElement.alt);
                    } else {
                        releasePile = draggingFromPile;
                    }
                    concat_release(releasePile, DraggingPile.children, if_turn_face)
                }
                /*
                releasePile.append(...DraggingPile.children);
                let pileCardCount = releasePile.children.length;
                if (pileCardCount > 10) {
                    let lastCard = releasePile.lastChild;
                    if (lastCard.offsetHeight + lastCard.offsetTop > window.innerHeight) {
                        releasePile.style.setProperty('--TableOffsetY', 'calc(120px/' + pileCardCount / 5 + ')');
                    }
                    console.log(getComputedStyle(releasePile).getPropertyValue('--TableOffsetY'));
                }
                */
                else if (!is_piles){
                    if (releasePile) {
                        concat_release(releasePile, grabbedFromPileChildren, if_turn_face)
                    }
                    
                }
                grabbedFromPileChildren = null
                moveDraggingPile(false);

                // game round
                if(releasePile){
                    gameRound()
                }
            }
            document.removeEventListener('mousemove', dragMouseMove);
            document.removeEventListener('mouseup', dragMouseUp);
        });
        window.e = evt;
    }
    return false;
}

    // # functions for clickCardBorderAndSequence
function check_range(x, y){
    let x_inter = click_x_range[0] <= x && x <= click_x_range[1] 
    let y_inter = click_y_range[0] <= y && y <= click_y_range[1]
    let logic_return = x_inter && y_inter

    return logic_return
}

function click_cancel(){
    let element = ClickedSequenceCards;

    element.removeAttribute("style");
    xy_clicked = false;
    click_x_range[0] = -1
    click_x_range[1] = -1
    click_y_range[0] = -1
    click_y_range[1] = -1
}
    // # end functions for clickCardBorderAndSequence


// maybe no need multiple cards dash bounded box
//let clickCardBorderAndSequence = () => {
function clickCardBorderAndSequence(evt){
    let element = ClickedSequenceCards;
    //document.addEventListener('click', evt => {
    let card = filterElementUnderCursor(evt, 'CARDTS-CARD');
    console.log("in clickCardBorder, this: ", this)
    let overZone = filterPlayerZoneUnderCursor(evt, key_id_ls)
    let zone0th = overZone[0]
    

    let is_base_ff = if_base_card(this)
    if (card && !game_end && !is_sleep) {
        element.style.setProperty('--SelectionBorder', '4px dashed ' + (draggingFromPile ? 'transparent' : 'red'));
        let rect = card.getBoundingClientRect();
        // there's height in rect
        console.log("rect: ", rect)
        // check if draggable
        let has_draggable = this.hasAttribute("draggable")
        console.log("has draggable: ", has_draggable)
        let draggable = false
        if (has_draggable){
            draggable = this.draggable
        }
        let get_target = false
        if(zone0th){
            get_target = zone0th.id == human_target.id_str
        }
        // rect box as click x y range
        if (!xy_clicked && get_target && draggable && !is_base_ff){
            xy_clicked = true

            click_x_range[0] = rect.left
            click_x_range[1] = rect.left + rect.width
            click_y_range[0] = rect.top
            click_y_range[1] = rect.top + rect.height

            // put piles into new var via "this"
            let clickedElement = this

            is_drag = false
            initMovingPileOldMaid(this, is_drag, is_piles);
            /*
            let clickFromPile = clickedElement.closest('CARDTS-ZONE');   // closest ZONE is TablePileN
            // see if able to skip add class
            //clickFromPile.classList.add('clickFromPile');
            let pilecards = [...clickFromPile.children];
            let cardnr = pilecards.indexOf(clickedElement);

            // no need unpack, array is ok
            grabbedFromPileChildren = pilecards.slice(cardnr);
            */
            drawCard(evt, rect, card, element)
            //drawPiles(evt, rect, card, element)
            showValidDropZone(true)
        }
        else if(xy_clicked && check_range(evt.pageX, evt.pageY)){
            console.log("canceled clicked")
            grabbedFromPileChildren = null;
            showValidDropZone(false)
            click_cancel()
        }
        // deal with moving
        else if(xy_clicked && !check_range(evt.pageX, evt.pageY)){
            // copy from dragMouseUp
            //let releasePile = this.closest('CARDTS-ZONE') // closest ZONE is TablePileN
            let releasePile = checkPlayerPile(evt, key_id_aim_human)
            console.log("before click release, release pile: ", releasePile)
            let if_turn_face = true
            if (releasePile){
                concat_release(releasePile, grabbedFromPileChildren, if_turn_face)
                grabbedFromPileChildren = null;
                showValidDropZone(false)
                click_cancel()

                // game round
                gameRound()
            }
            
        }
            
    }
    //});
}
// end function for newCard

function drawPiles(evt, rect, card, element){
    let left = evt.pageX - rect.left;
    let top = evt.pageY - rect.top;
    let width = rect.width;
    let cardZindex = getComputedStyle(card).zIndex - 1;
    let pile = filterElementUnderCursor(evt, 'ZONE');
    // multiple cards bounded
    if (pile) {
        let lastrect = pile.lastChild.getBoundingClientRect();
        let height = lastrect.bottom - rect.top;
        element.style.setProperty('--SelectionBorderBoxLeft', evt.pageX - left);
        element.style.setProperty('--SelectionBorderBoxTop', evt.pageY - top);
        element.style.setProperty('--SelectionBorderBoxWidth', width);
        element.style.setProperty('--SelectionBorderBoxHeight', height);
        element.style.setProperty('--SelectionBorderBoxZindex', cardZindex);
    }
}

function drawCard(evt, rect, card, element){
    let left = evt.pageX - rect.left;
    let top = evt.pageY - rect.top;
    let width = rect.width;
    let height = rect.height;
    let cardZindex = getComputedStyle(card).zIndex - 1;
    
    // draw one card
    element.style.setProperty('--SelectionBorderBoxLeft', evt.pageX - left);
    element.style.setProperty('--SelectionBorderBoxTop', evt.pageY - top);
    element.style.setProperty('--SelectionBorderBoxWidth', width);
    element.style.setProperty('--SelectionBorderBoxHeight', height);
    element.style.setProperty('--SelectionBorderBoxZindex', cardZindex);
}

// maybe no need multiple cards dash bounded box
let showCardBorderAndSequence = () => {
    let element = SelectionSequenceCards;
    document.addEventListener('mousemove', evt => {
        let transparent_str = ""
        if(xy_clicked){
            transparent_str = "blue"
        }
        else{
            transparent_str = 'yellowgreen'
        }
        //console.log("selectionSqCard: ", SelectionSequenceCards)
        element.style.setProperty('--SelectionBorder', '4px dashed ' + (draggingFromPile ? 'transparent' : transparent_str));
        let card = filterElementUnderCursor(evt, 'CARDTS-CARD');
        let in_clicked = check_range(evt.pageX, evt.pageY)
        // also check if not in center piles
        // by id? element type? or area xy?
        //let has_draggable = this.hasAttribute("draggable")
        //console.log("draggingfromPile: ", draggingFromPile, ", selectionSeq style: ", element.hasAttribute('style'))
        if(element.hasAttribute('style')){
            //console.log("style: ", typeof element.getAttribute('style'), element.getAttribute('style').split(' ').slice(0, 4))
        }
        
        if (card) {
            if (!in_clicked){
                let rect = card.getBoundingClientRect();
                drawCard(evt, rect, card, element)
                //drawPiles(evt, rect, card, element)
            }
            
        }
        else{
            element.removeAttribute("style");
        }
    });
}
showCardBorderAndSequence();

function autoDraw(playerObj, if_turn_face) {
    let targetObj = PlayerArr[ playerObj.target_id ]

    // fixed at 0th pile
    let targetPile = targetObj.piles.children[0]
    // 0th FF base not count, so n-1
    let targetCardLength = targetPile.childElementCount - 1
    let pilecards = [...targetPile.children]

    // 0~(n-2) became 1~(n-1)
    let cardnr = random(targetCardLength) + 1
    grabbedFromPileChildren = [pilecards[cardnr]]
    
    let releasePile = playerObj.piles.children[0]
    concat_release(releasePile, grabbedFromPileChildren, if_turn_face)
    grabbedFromPileChildren = null


}



// functions for newCard
    // functions for turn_card
let set_card_style = (cardts_card) => {
    let cid = cardts_card.getAttribute('cid')
    let is_joker = cardts_card.getAttribute('is_joker') == "true"

    let cardt = cardts_card.children[0]
    cardt.setAttribute('cid', cid);

    let open_card = false
    if(cid != BACK_CARD_STYLE){
        open_card = true
    }

    // edit attributes
    console.log("id is_joker, open_card, suitcolor, cardcolor: ", cardts_card.getAttribute('id'), is_joker, open_card, cardt.getAttribute('suitcolor'), cardt.getAttribute('cardcolor'))
    // joker style
    if (is_joker){
        if (open_card){
            cardt.setAttribute('suitcolor', "#FFF")
            cardt.setAttribute('cardcolor', "red")
            console.log("joker set color: ", cardt.getAttribute('suitcolor'), cardt.getAttribute('cardcolor'))
            // additional, maybe no need
            /*
            cardt.setAttribute('bordercolor', "hotpink")
            cardt.setAttribute('borderradius', "100%")
            cardt.setAttribute('borderline', 20)
            */
        }
        else{
            cardt.setAttribute('suitcolor', "")
            // found cardcolor, backcolor from f12, inside child img url
            cardt.setAttribute('cardcolor', "#FEFEFE")
            cardt.setAttribute('backcolor',"#E55")
        }
    }
    console.log("what is cardt: ", cardt)
}
    // end functions for turn_card

let turn_card = (cardts_card) =>{
    
    let new_cid = cardts_card.getAttribute('hidden_cid')
    let new_hidden = cardts_card.getAttribute('cid')
    if( cardts_card.getAttribute('cid') != FOUNDATION_BASE_STYLE ){
        cardts_card.setAttribute('cid', new_cid)
        cardts_card.setAttribute('hidden_cid', new_hidden)
    }
    
    set_card_style(cardts_card)
}
// end functions for newCard

// card creator
// need handleDragStart, clickCardBorderAndSequence
// cid = "00" be back card
// set atribute create new attribute hidden_cid, swap if reveal card
let newCard = (settings, is_joker=false, joker_id="AS") => {
    let cid = (typeof settings == 'string') ? settings : settings.rank + settings.suit;
    if (is_joker){
        cid = "AS"
    }
    cid = cid.replace('10', 'T'); //10h-> TH
    let cardts_card = document.createElement('cardts-card');
    let cardt = document.createElement('card-t');
    cardts_card.setAttribute('cid', cid);
    cardts_card.setAttribute('id', cid);

    // add external attributes for game
    // rank, suit
    // hidden_cid
    cardts_card.setAttribute('rank', settings.rank)
    cardts_card.setAttribute('suit', settings.suit)
    cardts_card.setAttribute('is_joker', is_joker)
    cardts_card.setAttribute('hidden_cid', BACK_CARD_STYLE)
    
    cardts_card.addEventListener('dragstart', handleDragStart, false);
    cardts_card.addEventListener('click', clickCardBorderAndSequence)
    cardts_card.append(cardt);

    // swap function to fold down card
    // cid, hidden_cid .getAttribute('cid')
    //set_card_style(cardts_card)
    turn_card(cardts_card)

    // set card id, to distinguish
    //cardt.setAttribute('cid', cid);

    //    console.log(cardt.firstElementChild);
    return cardts_card;
}

// Fisher Yates shuffle
let shuffle = arr => {  // mutates original!
    let temp, rand, idx = arr && arr.length;
    //console.log("in suffle, arr: ", arr)
    while (idx) {
        rand = random(idx--);
        temp = arr[idx];
        //console.log("idx, rand: ", idx, rand)
        arr[idx] = arr[rand];
        arr[rand] = temp;
    }
    //console.log("after suffle, arr: ", arr)
}



// initialize piles
let initPiles = (
    pileNr,
    name,
    container,
    initFunc = () => { }
) => {
    let piles = [];
    let fragment = document.createDocumentFragment();
    while (pileNr) {
        let pile = document.createElement('CARDTS-ZONE');
        if (pile.children.length == 0) pile.appendChild(newCard('FF'));
        piles.push(fragment.insertBefore(pile, fragment.firstElementChild));
        initFunc(pile, pileNr);
        pile.id = name + pileNr--;
    }
    container.append(fragment);
    return piles;
};


// functions for dealCard
let addCardToPile = (
    card,
    pile,
    before = false
) => {
    try {
        if (before) card = pile.insertBefore(card, before);
        else card = pile.appendChild(card);
        card.style.transform = `rotate(${random(6) - 3}deg) skewY(1deg)`;
    } catch (e) {
        console.error(e, '\n', card, pile);
    }
};
    // Stock already referenced from HTML
let getStockCard = (cardid = false, pile = Stock) => {
    let stockCards = Stock.get();// all cards in Stock
    let card = Stock.get()[stockCards.length - 1]; // last (top) card
    if (cardid) card = stockCards.filter(card => card.id == cardid)[0];
    if (typeof cardid == 'number') card = stockCards[cardid];
    return card;
}
// end functions for dealCard
let dealCard = (count, pile, before = false) => {
    while (count--) {
        let card = getStockCard();
        addCardToPile(card, pile, before);
    }
}

var CenterPiles = document.getElementById("centerPiles")
// fixed first
let center_num = 9
let center_last_id = center_num-1
let max_discard = 6+1 // FF base card also counts

// also declare player piles here

// player struct
// piles, try direct shuffle pile children?
// id: str
// set attribute direction=ver or hor
// target: int, player id to draw, not self
// discard_id: id pile that discard on center pile
class PlayerObj {
    constructor(id_str, is_ver, target_id, opponent_id, discard_id, discard_max_id) {
        this.id_str = id_str;
        this.piles = document.getElementById(id_str);
        this.is_ver = is_ver
        this.target_id = target_id
        this.opponent_id = opponent_id
        this.discard_id = discard_id
        this.discard_max_id = discard_max_id
        this.if_win = false
    }
}

var PlayerArr = new Array(player_num)
PlayerArr[0] = new PlayerObj("player-0-piles", false, 3, 1, 2, 3)
PlayerArr[1] = new PlayerObj("player-1-piles", true, 0, 2, 0, 1)
PlayerArr[2] = new PlayerObj("player-2-piles", false, 1, 3, 4, 5)
PlayerArr[3] = new PlayerObj("player-3-piles", true, 2, 0, 6, 7)

// set human player id
//human_Pile = CenterPiles;
human_Pile = PlayerArr[0].piles
human_target = PlayerArr[ PlayerArr[0].target_id ]
human_id = 0
key_id_aim_human.push(String(human_id))


// made piles looks like sequences/long piles
// also involved player piles
//insert CSS rules creating offset for #Table sequence piles
let nth = 3;
let zindex = 4;
// from 1 to 52?
for (let idx = 1; idx < 53; idx++) {
    // function selector, for vertical concat
    let ver_selector = (id, nthChild) => `#${id} CARDTS-CARD:nth-child(${nthChild}){top: calc(${idx} * var(--TableOffsetY));z-index:${zindex}}`;
    // horizontal selector, temporary set left with offsetY(maybe some coef)
    let hor_selector = (id, nthChild) => `#${id} CARDTS-CARD:nth-child(${nthChild}){left: calc(${idx} * var(--TableOffsetY));z-index:${zindex}}`;

    
    nthCardSequence.sheet.insertRule(`${ver_selector('DraggingPile', nth - 1, idx)}`); // pile has no FF base card
    nthCardSequence.sheet.insertRule(`${ver_selector('CenterPiles', nth, idx)}`);

    // put into 
    for (let j=0; j<player_num; j++){
        if (PlayerArr[j].is_ver){
            nthCardSequence.sheet.insertRule(`${ver_selector(PlayerArr[j].id_str, nth, idx)}`);
        }
        else{
            nthCardSequence.sheet.insertRule(`${hor_selector(PlayerArr[j].id_str, nth, idx)}`);
        }
    }
    // also put into player piles, some are horizontal selector
    nth++;
    zindex += 2;
}

function sleep(ms) {
    let promise_i = new Promise(resolve => setTimeout(resolve, ms));
    return promise_i
}


// old maid logic, game round

// prepare game
// create card Stock
// Stock is ref of html div id
let ranks = ['A', 2, 3, 4, 5, 6, 7, 8, 9, '10', 'J', 'Q', 'K'];
let suits = ['S', 'H', 'D', 'C'];
let deck = suits.map(suit => ranks.map(rank => newCard({ suit, rank }))).flat();
let add_joker = true
let joker_id = "AS"

// init player number
game_end = false
current_player_num = 4

console.log("what is deck: ", deck)
console.log("deck type: ", typeof deck)
// deck is object, just append Joker
// or maybe call by newCard({"A", "S"}, add_joker, joker_id ) ?
deck.push(newCard("AS", add_joker, joker_id))

// able to shuffle, for new game after ended
shuffle(deck);

//put whole deck in Stock
deck.forEach(card => {
    let newcard = Stock.appendChild(card);
    newcard.setAttribute('draggable', 'true');
});

console.log("does deck still exist? deck: ", deck)
console.log("card numbers of deck: ", deck.length)


initPiles(
    center_num,      // 8 piles
    'centerPile', // id Pile1, Pile2, ...
    CenterPiles   // in Table DOM element
);


// comment out center cards
//fill table
/*
let pileNr = 1;
do {
    dealCard(pileNr, CenterPiles.children[pileNr - 1]);// deal pileNr cards
} while (pileNr++ < 8);
*/


// for loop to construct player piles
for (let j=0; j<player_num; j++){
    let pile_name = `player-${j}-Pile`
    initPiles(
        1,      
        pile_name, // id Pile1, Pile2, ...
        PlayerArr[j].piles   // in Table DOM element
    );
}

// for loop to deal player's piles
let tricks = 13
let dealer_idx = random(player_num)
for (let i=0; i<tricks; i++){
    for (let j=0; j<player_num; j++){
        let deal_i = (dealer_idx+j) % player_num 
        dealCard(1, PlayerArr[deal_i].piles.children[0])
    }
}
// last 53th card
dealCard(1, PlayerArr[dealer_idx].piles.children[0])


// init gamee
// repeatly findPairs to discard on center
// pivot from last to first
function initGame(){
    console.log("game start")

    // reveal human cards
    let pile_0th = human_Pile.children[0]

    let child_arr = pile_0th.querySelectorAll('cardts-card')
    let child_num = child_arr.length
    for (let j=0; j<child_num; j++){
        let card_ith = child_arr[j]
        turn_card(card_ith)

        console.log("card ", j, ": ")
        for (var att, i = 0, atts = card_ith.attributes, n = atts.length; i < n; i++){
        att = atts[i];
        console.log(att.nodeName, att.nodeValue);
        }
        console.log("-------------------")
    }



    // discard pairs
    for (let i=0; i<player_num; i++){
        let last_card_idx = PlayerArr[i].piles.children[0].childElementCount-1

        let is_found = false
        // check until only FF and 1st card left
        while (last_card_idx >=2){
            is_found = findPair(PlayerArr[i], last_card_idx)

            if (is_found){
                last_card_idx -= 2
            }
            else{
                last_card_idx -= 1
            }
        }

        let is_win = discard_all(PlayerArr[i])

    }
}
initGame()



function discard_all(playerObj){
    let last_card_idx = playerObj.piles.children[0].childElementCount-1
    let someone_win = false
    if(last_card_idx <= 0){
        someone_win = true
        playerObj.if_win = true
        // deal with rest players

        // one of the remain two players wins, game ended
        // able to skip dealing rest players
        if (current_player_num > 2){
            // player opponent change target, original target is myself(playerObj)
            let playerOpp = PlayerArr[ playerObj.opponent_id ]
            playerOpp.target_id = playerObj.target_id
            if (playerObj.opponent_id == human_id){
                console.log("\n\n********************")
                console.log("human change target")
                console.log("********************\n\n")
                human_target = PlayerArr[ playerOpp.target_id ]
            }
            // player target change opponent, , original opponent is myself(playerObj)
            let playerTar = PlayerArr[ playerObj.target_id ]
            playerTar.opponent_id = playerObj.opponent_id

            // deal if related to human target

        }
        else{
            game_end = true
        }
        current_player_num -= 1

    }

    return someone_win
}

function findPair(playerObj, pivot_idx){
    let piles = playerObj.piles.children
    let pile_i = piles[0]

    let child_arr = pile_i.querySelectorAll('cardts-card')
    let child_num = child_arr.length
    let pivot_card = child_arr[pivot_idx]
    let pivot_rank = pivot_card.getAttribute('rank')

    // check cards before pivot
    // see if another same rank as last card
    let found_card = false
    let is_found = false
    if (typeof pivot_rank !== 'undefined' && pivot_rank != 'undefined'){
        for (let i=0; i<pivot_idx && !found_card; i++){
            let card_ith = child_arr[i]
            if (card_ith.getAttribute('rank') == pivot_rank){
                found_card = card_ith
                is_found = true
            }
        }
    }

    // if so, remove
    // remove last card first
    // remove by append to center plies
    if (found_card){
        console.log("found pair: ", found_card.getAttribute('id'), pivot_card.getAttribute('id'))
        let discardPile = CenterPiles.children[ playerObj.discard_id ]
        if(pivot_card.getAttribute('cid') == BACK_CARD_STYLE){
            turn_card(pivot_card)
        }
        if(found_card.getAttribute('cid') == BACK_CARD_STYLE){
            turn_card(found_card)
        }
        discardPile.appendChild(pivot_card)
        discardPile.appendChild(found_card)

        let discard_length = discardPile.childElementCount
        if ((playerObj.discard_id < center_last_id) && (discard_length >= max_discard)){
            if(playerObj.discard_id < playerObj.discard_max_id){
                playerObj.discard_id += 1
            }
            else{
                playerObj.discard_id = center_last_id
            }
        }
        else{
            console.log("still not exceed max, discard length: ", discard_length)
        }
    }

    return is_found
}

function playerShffle(playerObj){
    console.log("player's pile: ", playerObj.piles.id, ", length: ", playerObj.piles.children.length)
    let piles = playerObj.piles.children
    let pile_i = piles[0]

    let child_arr = pile_i.querySelectorAll('cardts-card')
    console.log("type child_arr: ", typeof child_arr)

    console.log("before suffle, children: ", child_arr)
    // try shuffle
    let pure_card = [...child_arr].slice(1)
    if(pure_card){
        shuffle(pure_card)
    }

    // put cards back, skip 0th FF card
    // exist child be last one
    for (let j=0; j<pure_card.length; j++){
        pile_i.appendChild(pure_card[j])
    }

    child_arr = pile_i.querySelectorAll('cardts-card')
    console.log("after suffle, children: ", child_arr)
        
}

// need async for await?
// https://stackoverflow.com/a/39914235
async function gameRound(){
    let loser = null;
    do{
        is_sleep = true
        gameStatus.innerHTML = `<span class="warn-msg">Others playing, waiting</span>`
        if (!game_end && !PlayerArr[0].if_win){
            let player_card_last_id = PlayerArr[0].piles.children[0].childElementCount-1
            await sleep(pause_ms)
            let is_found = findPair(PlayerArr[0], player_card_last_id)
            playerShffle(PlayerArr[0])
            
            // even human draw, target win and self win could both happen in same draw
            // check target first since target being draw, reduce card first
            // should modify self target, oppon id first if target win
            let target_id = PlayerArr[0].target_id
            let is_win = discard_all(PlayerArr[ target_id ])
            if (is_win){
                console.log(`target ${target_id}th player win!`)
            }

            is_win = discard_all(PlayerArr[0])
            if (is_win){
                if_human_won = true
                if(game_end){
                    console.log("human won, loser is: ", PlayerArr[0].target_id)
                    loser = PlayerArr[ PlayerArr[0].target_id ]
                }
                console.log(`${0}th player Draw to win!`)
            }
        }
        console.log("=================================")

        // other players also
        for (let i=0+1; (i<player_num && !game_end); i++){
            let PlayerIth = PlayerArr[i]
            if (!PlayerIth.if_win){
                console.log("now player ", i)
                await sleep(pause_ms)
                // auto draw
                let if_turn_face = false
                if (PlayerIth.target_id == human_id){
                    if_turn_face = true
                }
                autoDraw(PlayerIth, if_turn_face)

                let player_card_last_id = PlayerIth.piles.children[0].childElementCount-1
                await sleep(pause_ms)
                findPair(PlayerIth, player_card_last_id)
                playerShffle(PlayerIth)
                console.log(`before check discard, i:${i}, target: ${PlayerIth.target_id}, oppon:${PlayerIth.opponent_id}`)
                let current_win = false
                
                // target win and self ith win could both happen in same draw
                // check target first since target being draw, reduce card first
                // should modify self target, oppon id first if target win
                let target_id = PlayerIth.target_id
                let is_win = discard_all(PlayerArr[ target_id ])
                if (is_win){
                    if (target_id == human_id){
                        if_human_won = true
                    }
                    console.log(`target ${target_id}th player win!`)
                }

                is_win = discard_all(PlayerIth)
                if (is_win){
                    console.log(`${i}th player Draw to win!`)
                    current_win = true
                }
                

                // reveal joker if ended
                if(game_end){
                    if(current_win){
                        loser = PlayerArr[ PlayerIth.target_id ]
                        console.log("loser is target:", PlayerIth.target_id)
                    }
                    else{
                        // local PlayerIth will out of scope, so need re assign
                        loser = PlayerArr[i]
                        console.log("loser is yourself: ", i)
                    }
                }
            }
            console.log("------------------------")
        }
        is_sleep = false
        gameStatus.innerHTML = status_default_str
        console.log("before game round finished, game end: ", game_end)

        if(game_end && if_human_won){
            let pile_0th = loser.piles.children[0]

            let child_arr = pile_0th.querySelectorAll('cardts-card')
            console.log("loser cards: ", child_arr)
            // 0th is FF base, so get 1st card
            let joker_card = child_arr[1]
            console.log("joker card: ", joker_card)

            turn_card(joker_card)
        }
    } while(!game_end && if_human_won)

    console.log("-------------------------------------------")

    if(game_end){
        gameStatus.innerHTML = `<span class="end-msg">Game ended!</span>`
        console.log("------------ Game ended ---------------")
    }
}



// create dummy div to calculate
let dummyPile = document.createElement('CARDTS-ZONE');
if (dummyPile.children.length == 0) dummyPile.appendChild(newCard('FF'));
let calculatedCardWidth = getComputedStyle(dummyPile.firstElementChild).width;

