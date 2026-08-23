/**
 * Deal with variables, not direct related to html, css, etc
 * Here should be pure js
 *
 * board, tokens like queens
 *
 * initBoard
 * most of things
 * but without render?
 *
 * preserve original function names as comments
 *
 * every function access game members, maintain export
 * add commit eg: find all board, replace to this.board
 *
 */

(function(exports, require){

const tokenType = "Q"

const arrowType = "A"
const arrowColor = "g"

// how to connect with main js, html?
let cols_num = 4;
let rows_num = 5;

//const mcts = require('mcts');

exports.Action = function(fromR, fromC, toR, toC, arrowR, arrowC, promotionType) {
    mcts.Action.call(this);

    this.fromR = fromR;
    this.fromC = fromC;
    this.toR = toR;
    this.toC = toC;
    this.arrowR = arrowR;
    this.arrowC = arrowC;
    this.promotionType = promotionType;

    // arrow R, C
};

//exports.Action.prototype = Object.create(mcts.Action.prototype);

// original function: initBoard()
exports.Game = function(o) {
    // prepare variables as members
    if (o instanceof exports.Game) {
        // copy constructor like

        //mcts.Game.call(this, o);
        this.board = structuredClone(o.board)

        this.turn = o.turn;
        this.selected = o.selected;
        this.validMoves = o.validMoves;
        this.arrowAimed = o.arrowAimed;
        this.validArrows = o.validArrows;
        /*
        this.kingMoved = o.kingMoved;
        this.rookMoved = o.rookMoved;
        */
        this.lastMove = o.lastMove;
        this.lastMoveFrom = o.lastMoveFrom;
        //this.pendingPromotion = o.pendingPromotion;
        this.gameOver = this.gameOver;
    }
    else{
        // direct follow mcts, no need change
        //mcts.Game.call(this, { nPlayers: 2 });

        // initialize board related variables
        let center_rows_num = rows_num - 2*2
        this.board = [
                    Array(cols_num)
                        .fill(null)
                        .map((item, index) => index === cols_num-2 ? { type: "Q", color: "b" } : item),
                    Array(cols_num)
                        .fill(null)
                        .map((item, index) => index === 0 ? { type: "Q", color: "b" } : item),

                    ...Array(center_rows_num)
                        .fill(null)
                        .map(() => Array(cols_num).fill(null)),

                    Array(cols_num)
                        .fill(null)
                        .map((item, index) => index === cols_num-1 ? { type: "Q", color: "w" } : item),
                    Array(cols_num)
                        .fill(null)
                        .map((item, index) => index === 1 ? { type: "Q", color: "w" } : item),
                    ];

        // most members array or dict like, able to reference
        // only this.turn is string, unable to reference
        this.turn = "w";
        this.selected = null;
        this.validMoves = [];
        this.arrowAimed = null;
        this.validArrows = [];
        /*
        this.kingMoved = { w: false, b: false };
        this.rookMoved = { w: [false, false], b: [false, false] };
        */
        this.lastMove = null;
        this.lastMoveFrom = null;
        //this.pendingPromotion = null;
        this.gameOver = false;

        this.beCheck = false;
        this.wIsWon = false;
        this.bIsWon = false;
        this.draw = false;

    }
}

function inBounds(r, c) {
    return r >= 0 && r < rows_num && c >= 0 && c < cols_num;
}


exports.Game.prototype.getPiece = function (r, c) {
    let board = this.board
    return inBounds(r, c) ? board[r][c] : null;
}

exports.Game.prototype.isSquareAttacked = function (r, c, byColor) {
    const enemy = byColor === "w" ? "b" : "w";
    for (let ri = 0; ri < 8; ri++) {
        for (let ci = 0; ci < 8; ci++) {
            //const p = getPiece(ri, ci);
            const p = this.getPiece(ri, ci);
            if (!p || p.color !== byColor) continue;
            //const moves = getRawMoves(ri, ci, true);
            const moves = this.getRawMoves(ri, ci, true);
            if (moves.some((m) => m[0] === r && m[1] === c)) return true;
        }
    }
    return false;
}


exports.Game.prototype.getKingPos = function (color) {
    for (let r = 0; r < 8; r++)
        for (let c = 0; c < 8; c++) {
            //const p = getPiece(r, c);
            const p = this.getPiece(r, c);
            if (p && p.type === "K" && p.color === color) return [r, c];
        }
    return null;
}

exports.Game.prototype.getRawMoves = function (r, c, forAttackOnly, ifArrow=false) {
    // forAttackOnly seems serve for P and K only
    // forAttackOnly check if r c able to attack a certain target in isSquareAttacked
    let kingMoved = this.kingMoved
    let rookMoved = this.rookMoved
    let lastMove = this.lastMove

    //const piece = getPiece(r, c);
    const piece = this.getPiece(r, c);
    //if (!piece) return [];
    if (!piece && !ifArrow) return [];
    //const { type, color } = piece;

    let {type, color} = {type: null, color: null}
    let selectedR = null
    let selectedC = null

    let selectedPiece = null
    let board = this.board
    if (!ifArrow){
        type = piece.type
        color = piece.color
    }
    // force assign virtual piece if check arrows
    // force cancel selected piece
    else{
        type = tokenType
        color = this.turn

        if(this.selected){
            selectedR = this.selected[0]
            selectedC = this.selected[1]
            selectedPiece = this.getPiece(selectedR, selectedC)
        }
        board[selectedR][selectedC] = null
    }

    const moves = [];
    const dirs = [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
    ];
    const knightDirs = [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
    ];

    // unable to attack enemy in amazons
    function add(r1, c1, gameRef) {
        if (!inBounds(r1, c1)) return;
        //const target = getPiece(r1, c1);
        const target = gameRef.getPiece(r1, c1);
        if (!target) moves.push([r1, c1]);
        // cancel attack
        //else if (target.color !== color) moves.push([r1, c1]);
    }

    // unable to attack enemy in amazons
    function slide(dr, dc, gameRef) {
        let r1 = r + dr,
            c1 = c + dc;
        while (inBounds(r1, c1)) {
            //const target = getPiece(r1, c1);
            const target = gameRef.getPiece(r1, c1);
            if (!target) {
                moves.push([r1, c1]);
                r1 += dr;
                c1 += dc;
                continue;
            }
            // cancel attack
            //if (target.color !== color) moves.push([r1, c1]);
            break;
        }
    }

    if (type === "R") {
        slide(-1, 0, this);
        slide(1, 0, this);
        slide(0, -1, this);
        slide(0, 1, this);
    } else if (type === "B") {
        slide(-1, -1, this);
        slide(-1, 1, this);
        slide(1, -1, this);
        slide(1, 1, this);
    } else if (type === "Q") {
        dirs.forEach(([dr, dc]) => slide(dr, dc, this));
    } else if (type === "N") {
        knightDirs.forEach(([dr, dc]) => add(r + dr, c + dc, this));
    } else if (type === "K") {
        dirs.forEach(([dr, dc]) => add(r + dr, c + dc, this));
        if (!forAttackOnly) {
            /*
            if (color === "w" && !kingMoved.w && !rookMoved.w[0] && !getPiece(7, 1) && !getPiece(7, 2) && !getPiece(7, 3) && !isSquareAttacked(7, 4, "b") && !isSquareAttacked(7, 3, "b") && !isSquareAttacked(7, 2, "b"))
            moves.push([7, 2]);
            if (color === "w" && !kingMoved.w && !rookMoved.w[1] && !getPiece(7, 5) && !getPiece(7, 6) && !isSquareAttacked(7, 4, "b") && !isSquareAttacked(7, 5, "b") && !isSquareAttacked(7, 6, "b"))
            moves.push([7, 6]);
            if (color === "b" && !kingMoved.b && !rookMoved.b[0] && !getPiece(0, 1) && !getPiece(0, 2) && !getPiece(0, 3) && !isSquareAttacked(0, 4, "w") && !isSquareAttacked(0, 3, "w") && !isSquareAttacked(0, 2, "w"))
            moves.push([0, 2]);
            if (color === "b" && !kingMoved.b && !rookMoved.b[1] && !getPiece(0, 5) && !getPiece(0, 6) && !isSquareAttacked(0, 4, "w") && !isSquareAttacked(0, 5, "w") && !isSquareAttacked(0, 6, "w"))
            moves.push([0, 6]);
            */
            if (color === "w" && !kingMoved.w && !rookMoved.w[0] && !this.getPiece(7, 1) && !this.getPiece(7, 2) && !this.getPiece(7, 3) && !this.isSquareAttacked(7, 4, "b") && !this.isSquareAttacked(7, 3, "b") && !this.isSquareAttacked(7, 2, "b"))
            moves.push([7, 2]);
            if (color === "w" && !kingMoved.w && !rookMoved.w[1] && !this.getPiece(7, 5) && !this.getPiece(7, 6) && !this.isSquareAttacked(7, 4, "b") && !this.isSquareAttacked(7, 5, "b") && !this.isSquareAttacked(7, 6, "b"))
            moves.push([7, 6]);
            if (color === "b" && !kingMoved.b && !rookMoved.b[0] && !this.getPiece(0, 1) && !this.getPiece(0, 2) && !getPiece(0, 3) && !this.isSquareAttacked(0, 4, "w") && !this.isSquareAttacked(0, 3, "w") && !this.isSquareAttacked(0, 2, "w"))
            moves.push([0, 2]);
            if (color === "b" && !kingMoved.b && !rookMoved.b[1] && !this.getPiece(0, 5) && !this.getPiece(0, 6) && !this.isSquareAttacked(0, 4, "w") && !this.isSquareAttacked(0, 5, "w") && !this.isSquareAttacked(0, 6, "w"))
            moves.push([0, 6]);
        }
    } else if (type === "P") {
        const forward = color === "w" ? -1 : 1;
        const startRow = color === "w" ? 6 : 1;
        if (!forAttackOnly) {
            if (!getPiece(r + forward, c)) {
                moves.push([r + forward, c]);
                //if (r === startRow && !getPiece(r + 2 * forward, c)) moves.push([r + 2 * forward, c]);
                if (r === startRow && !this.getPiece(r + 2 * forward, c)) moves.push([r + 2 * forward, c]);
            }
        }
        [[r + forward, c - 1], [r + forward, c + 1]].forEach(([r1, c1]) => {
            if (!inBounds(r1, c1)) return;
            //const target = getPiece(r1, c1);
            const target = this.getPiece(r1, c1);
            if (target && target.color !== color) moves.push([r1, c1]);
            if (!forAttackOnly && lastMove && lastMove.piece === "P" && lastMove.fromC === lastMove.toC && lastMove.toR === r && lastMove.fromR === r + 2 * forward && lastMove.toC === c1)
            moves.push([r1, c1]);
        });
    }

    // put back selecteded piece
    if(ifArrow){
        board[selectedR][selectedC] = selectedPiece
    }

    return moves;
}

exports.Game.prototype.getLegalMoves = function (r, c, ifArrow=false){
    let turn = this.turn
    let board = this.board
    let lastMove = this.lastMove

    //const piece = getPiece(r, c);
    let piece = this.getPiece(r, c);
    // still need skip when find valid arrows
    if (!ifArrow){
        if (!piece || piece.color !== turn) return [];
    }
    else{
        piece = {type: null, color: null}
    }

    //const raw = getRawMoves(r, c, false);
    // now getRawMoves able to assign virtual piece when check legals arrow ifArrow
    const raw = this.getRawMoves(r, c, false, ifArrow);

    const legal = [];
    //const kr = piece.type === "K" ? r : getKingPos(turn)[0];
    //const kc = piece.type === "K" ? r : getKingPos(turn)[1];

    for (const [toR, toC] of raw) {
        // backup pieces
        const captured = board[toR][toC];
        const fromPiece = board[r][c];
        // really moved piece
        board[toR][toC] = fromPiece;
        board[r][c] = null;

        let epRestore = null;
        if (piece.type === "P" && lastMove && lastMove.piece === "P" && lastMove.fromC === lastMove.toC && lastMove.toR === r && lastMove.fromR === r + (turn === "w" ? -2 : 2) && lastMove.toC === toC) {
            epRestore = [lastMove.toR, lastMove.toC];
            board[lastMove.toR][lastMove.toC] = null;
        }

        let castlingRook = null;
        if (piece.type === "K" && Math.abs(toC - c) === 2) {
            const rookCol = toC === 2 ? 0 : 7;
            const newRookCol = toC === 2 ? 3 : 5;
            castlingRook = { from: [r, rookCol], to: [r, newRookCol], piece: board[r][rookCol] };
            board[r][newRookCol] = board[r][rookCol];
            board[r][rookCol] = null;
        }

        //const kingR = piece.type === "K" ? toR : kr;
        //const kingC = piece.type === "K" ? toC : kc;
        //const inCheck = isSquareAttacked(kingR, kingC, turn === "w" ? "b" : "w");
        const inCheck = false

        // restore piece back as status of before running
        board[r][c] = fromPiece;
        board[toR][toC] = captured;
        if (epRestore) board[epRestore[0]][epRestore[1]] = { type: "P", color: turn === "w" ? "b" : "w" };
        if (castlingRook) {
            board[castlingRook.from[0]][castlingRook.from[1]] = castlingRook.piece;
            board[castlingRook.to[0]][castlingRook.to[1]] = null;
        }

        if (!inCheck) legal.push([toR, toC]);
    }
    return legal;
}


// original function: getAllMoves()
// allActions able to call with input free
exports.Game.prototype.allActions = function(color=null) {
    const moves = [];

    if (color == null){
        color = this.turn
    }

    for (let r = 0; r < rows_num; r++)
    for (let c = 0; c < cols_num; c++) {
        //const piece = getPiece(r, c);
        const piece = this.getPiece(r, c);
        if (piece && piece.color === color) {
            //getLegalMoves(r, c).forEach(([toR, toC]) => moves.push({ from: [r, c], to: [toR, toC] }));
            this.getLegalMoves(r, c).forEach(([toR, toC]) => moves.push({ from: [r, c], to: [toR, toC] }));
        }
    }
    return moves;
}

/*
exports.Game.prototype.isCheck = function (color) {
    //const k = getKingPos(color);
    //return k && isSquareAttacked(k[0], k[1], color === "w" ? "b" : "w");
    const k = this.getKingPos(color)
    return k && this.isSquareAttacked(k[0], k[1], color === "w" ? "b" : "w");
}

exports.Game.prototype.isCheckmate = function(color) {
    //return isCheck(color) && getAllMoves(color).length === 0;
    return this.isCheck(color) && this.allActions(color).length === 0;
}

exports.Game.prototype.isStalemate = function(color) {
    //return !isCheck(color) && getAllMoves(color).length === 0;
    return !this.isCheck(color) && this.allActions(color).length === 0;
}
*/

// amazons check win
exports.Game.prototype.allBlocked = function(color) {
    return this.allActions(color).length === 0;
}

// original function: makeMove()
// turn into one variable input? dictionary like?
exports.Game.prototype.doAction = function(a) {
    let fromR = a.fromR;
    let fromC = a.fromC;
    let toR = a.toR;
    let toC = a.toC;
    let arrowR = a.arrowR;
    let arrowC = a.arrowC;
    let promotionType = a.promotionType;
    let board = this.board
    // turn is string, unable to reference

    // R, C for place arrow


    const piece = board[fromR][fromC];
    if (!piece) return false;
    //const legal = getLegalMoves(fromR, fromC);
    const legal = this.getLegalMoves(fromR, fromC);
    if (!legal.some(([r, c]) => r === toR && c === toC)) return false;

    const captured = board[toR][toC];
    lastMoveFrom = [fromR, fromC];
    lastMove = { piece: piece.type, fromR, fromC, toR, toC };

    if (piece.type === "K") {
        if (piece.color === "w") kingMoved.w = true;
        else kingMoved.b = true;
        if (Math.abs(toC - fromC) === 2) {
            const rookCol = toC === 2 ? 0 : 7;
            const newRookCol = toC === 2 ? 3 : 5;
            board[fromR][newRookCol] = board[fromR][rookCol];
            board[fromR][rookCol] = null;
        }
    }
    if (piece.type === "R") {
        if (piece.color === "w") {
            if (fromC === 0) rookMoved.w[0] = true;
            if (fromC === 7) rookMoved.w[1] = true;
        } else {
            if (fromC === 0) rookMoved.b[0] = true;
            if (fromC === 7) rookMoved.b[1] = true;
        }
    }

    if (piece.type === "P" && lastMove && lastMove.piece === "P" && Math.abs(lastMove.fromC - lastMove.toC) === 1 && lastMove.toR === fromR && lastMove.fromR === fromR + (piece.color === "w" ? -2 : 2) && lastMove.toC === toC) {
        board[lastMove.toR][lastMove.toC] = null;
    }

    //let promo = promotionType;
    let promo = this.promotionType;
    if (piece.type === "P" && (toR === 0 || toR === 7)) promo = promo || "Q";
    board[toR][toC] = promo ? { type: promo, color: piece.color } : piece;
    board[fromR][fromC] = null;


    // game of amazons, arrow
    // color avoid "w" or "b"
    // { type: "A", color: "g" }
    let arrowPiece = { type: arrowType, color: arrowColor }
    board[arrowR][arrowC] = arrowPiece


    //turn = turn === "w" ? "b" : "w";
    this.turn = this.turn === "w" ? "b" : "w";


    // need determin win or lose here
    // to connect with mcts
    // original function: afterMove()
    // first player winner=1, 2nd winner=2
    /*
    if (this.isCheckmate("w")) {
        this.bIsWon = true;
    }
    if (this.isCheckmate("b")) {
        this.wIsWon = true;
    }
    if(this.isStalemate(this.turn)){
        this.draw = true;
    }
    if (this.isCheck(this.turn)) {
        this.beCheck = true;
    }
    */
    // who be all blocked loses
    if (this.allBlocked(this.turn)) {
        if(this.turn == "w"){
            this.bIsWon = true;
        }
        else{
            this.wIsWon = true;
        }
    }

    return true;
}


}(typeof exports === 'undefined' ? this.exports_amazons = {} : exports, typeof exports === 'undefined' ? function(m) { return this['exports_'+m] } : require));
