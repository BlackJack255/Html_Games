(function () {
    "use strict";

    const mcts = require('mcts');
    const amazons = require("amazons")
    let game = null;
    let ai = null;
    let ai_turn = null;

    var humanPlayer = 1;
    var computerPlayer = 2;

    var maxTrials = 1;
    var maxTime = 1000;
    var timer;

    // only need queen and arrow
    const ARROW_TYPE = "A"
    const PIECES = {
        K: { w: "♔", b: "♚" },
        Q: { w: "♕", b: "♛" },
        R: { w: "♖", b: "♜" },
        B: { w: "♗", b: "♝" },
        N: { w: "♘", b: "♞" },
        P: { w: "♙", b: "♟" },

        A: {g: "⬤"},
    };

    const PIECE_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };

    let mode = "friend";
    /*
    let board = [];
    let turn = "w";
    let selected = null;
    let validMoves = [];
    let mode = "friend";
    //let kingMoved = { w: false, b: false };
    //let rookMoved = { w: [false, false], b: [false, false] };
    let lastMove = null;
    let lastMoveFrom = null;
    //let pendingPromotion = null;
    let gameOver = false;
    */


    const boardEl = document.getElementById("board");
    const modeScreen = document.getElementById("modeScreen");
    const gameScreen = document.getElementById("gameScreen");
    const turnLabel = document.getElementById("turnLabel");
    const modeBadge = document.getElementById("modeBadge");
    /*
    const promotionOverlay = document.getElementById("promotionOverlay");
    const promotionPiecesEl = document.getElementById("promotionPieces");
    */
    const gameOverOverlay = document.getElementById("gameOverOverlay");
    const gameOverTitle = document.getElementById("gameOverTitle");
    const gameOverMessage = document.getElementById("gameOverMessage");

    const computerplayerTurn = document.getElementById("computerplayer");
    const settingDiv = document.getElementById("settings");
    const msgP = document.getElementById("msg");
    const searchData = document.getElementById("searchdata");

    maxTrials = document.getElementById("maxtrials").value

    var prevSearchDataTurn = 0;
    var prevSearchData = "";
    var currSearchData = "";

    // control html board size
    // copy ones to require amazons.js?
    const cols_num = 4
    const rows_num = 5

    /*
    function initBoard() {
    */
        /* already comment out, for pure chess
        board = [
        [
            { type: "R", color: "b" },
            { type: "N", color: "b" },
            { type: "B", color: "b" },
            { type: "Q", color: "b" },
            { type: "K", color: "b" },
            { type: "B", color: "b" },
            { type: "N", color: "b" },
            { type: "R", color: "b" },
        ],
        Array(8)
            .fill(null)
            .map(() => ({ type: "P", color: "b" })),
        ...Array(4)
            .fill(null)
            .map(() => Array(8).fill(null)),
        Array(8)
            .fill(null)
            .map(() => ({ type: "P", color: "w" })),
        [
            { type: "R", color: "w" },
            { type: "N", color: "w" },
            { type: "B", color: "w" },
            { type: "Q", color: "w" },
            { type: "K", color: "w" },
            { type: "B", color: "w" },
            { type: "N", color: "w" },
            { type: "R", color: "w" },
        ],
        ];
        */
    /*
        // carefully check var col_num, row_num
        let center_rows_num = rows_num - 2*2
        board = [
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
        turn = "w";
        selected = null;
        validMoves = [];
        //kingMoved = { w: false, b: false };
        //rookMoved = { w: [false, false], b: [false, false] };
        lastMove = null;
        lastMoveFrom = null;
        //pendingPromotion = null;
        gameOver = false;
    }
    */

    /*
    // follow number of rows, cols
    function inBounds(r, c) {
        return r >= 0 && r < rows_num && c >= 0 && c < cols_num;
    }


    function getPiece(r, c) {
        return inBounds(r, c) ? board[r][c] : null;
    }

    function isSquareAttacked(r, c, byColor) {
        const enemy = byColor === "w" ? "b" : "w";
        for (let ri = 0; ri < 8; ri++) {
            for (let ci = 0; ci < 8; ci++) {
                const p = getPiece(ri, ci);
                if (!p || p.color !== byColor) continue;
                const moves = getRawMoves(ri, ci, true);
                if (moves.some((m) => m[0] === r && m[1] === c)) return true;
            }
        }
        return false;
    }

    function getKingPos(color) {
        for (let r = 0; r < 8; r++)
            for (let c = 0; c < 8; c++) {
                const p = getPiece(r, c);
                if (p && p.type === "K" && p.color === color) return [r, c];
            }
        return null;
    }

    function getRawMoves(r, c, forAttackOnly) {
        const piece = getPiece(r, c);
        if (!piece) return [];
        const { type, color } = piece;
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

        function add(r1, c1) {
            if (!inBounds(r1, c1)) return;
            const target = getPiece(r1, c1);
            if (!target) moves.push([r1, c1]);
            else if (target.color !== color) moves.push([r1, c1]);
        }

        function slide(dr, dc) {
            let r1 = r + dr,
                c1 = c + dc;
            while (inBounds(r1, c1)) {
                const target = getPiece(r1, c1);
                if (!target) {
                    moves.push([r1, c1]);
                    r1 += dr;
                    c1 += dc;
                    continue;
                }
                if (target.color !== color) moves.push([r1, c1]);
                break;
            }
        }

        if (type === "R") {
            slide(-1, 0);
            slide(1, 0);
            slide(0, -1);
            slide(0, 1);
        } else if (type === "B") {
            slide(-1, -1);
            slide(-1, 1);
            slide(1, -1);
            slide(1, 1);
        } else if (type === "Q") {
            dirs.forEach(([dr, dc]) => slide(dr, dc));
        } else if (type === "N") {
            knightDirs.forEach(([dr, dc]) => add(r + dr, c + dc));
        } else if (type === "K") {
            dirs.forEach(([dr, dc]) => add(r + dr, c + dc));
            if (!forAttackOnly) {
                if (color === "w" && !kingMoved.w && !rookMoved.w[0] && !getPiece(7, 1) && !getPiece(7, 2) && !getPiece(7, 3) && !isSquareAttacked(7, 4, "b") && !isSquareAttacked(7, 3, "b") && !isSquareAttacked(7, 2, "b"))
                moves.push([7, 2]);
                if (color === "w" && !kingMoved.w && !rookMoved.w[1] && !getPiece(7, 5) && !getPiece(7, 6) && !isSquareAttacked(7, 4, "b") && !isSquareAttacked(7, 5, "b") && !isSquareAttacked(7, 6, "b"))
                moves.push([7, 6]);
                if (color === "b" && !kingMoved.b && !rookMoved.b[0] && !getPiece(0, 1) && !getPiece(0, 2) && !getPiece(0, 3) && !isSquareAttacked(0, 4, "w") && !isSquareAttacked(0, 3, "w") && !isSquareAttacked(0, 2, "w"))
                moves.push([0, 2]);
                if (color === "b" && !kingMoved.b && !rookMoved.b[1] && !getPiece(0, 5) && !getPiece(0, 6) && !isSquareAttacked(0, 4, "w") && !isSquareAttacked(0, 5, "w") && !isSquareAttacked(0, 6, "w"))
                moves.push([0, 6]);
            }
        } else if (type === "P") {
            const forward = color === "w" ? -1 : 1;
            const startRow = color === "w" ? 6 : 1;
            if (!forAttackOnly) {
                if (!getPiece(r + forward, c)) {
                    moves.push([r + forward, c]);
                    if (r === startRow && !getPiece(r + 2 * forward, c)) moves.push([r + 2 * forward, c]);
                }
            }
            [[r + forward, c - 1], [r + forward, c + 1]].forEach(([r1, c1]) => {
                if (!inBounds(r1, c1)) return;
                const target = getPiece(r1, c1);
                if (target && target.color !== color) moves.push([r1, c1]);
                if (!forAttackOnly && lastMove && lastMove.piece === "P" && lastMove.fromC === lastMove.toC && lastMove.toR === r && lastMove.fromR === r + 2 * forward && lastMove.toC === c1)
                moves.push([r1, c1]);
            });
        }

        return moves;
    }
    */


    /*
    function getLegalMoves(r, c) {
        const piece = getPiece(r, c);
        if (!piece || piece.color !== turn) return [];
        const raw = getRawMoves(r, c, false);
        const legal = [];
        //const kr = piece.type === "K" ? r : getKingPos(turn)[0];
        //const kc = piece.type === "K" ? r : getKingPos(turn)[1];

        for (const [toR, toC] of raw) {
            const captured = board[toR][toC];
            const fromPiece = board[r][c];
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
    */

    /*
    function getAllMoves(color) {
        const moves = [];
        for (let r = 0; r < rows_num; r++)
        for (let c = 0; c < cols_num; c++) {
            const piece = getPiece(r, c);
            if (piece && piece.color === color) {
                getLegalMoves(r, c).forEach(([toR, toC]) => moves.push({ from: [r, c], to: [toR, toC] }));
            }
        }
        return moves;
    }
    */

    /*
    function isCheck(color) {
        const k = getKingPos(color);
        return k && isSquareAttacked(k[0], k[1], color === "w" ? "b" : "w");
        
    }

    function isCheckmate(color) {
        return isCheck(color) && getAllMoves(color).length === 0;
    }

    function isStalemate(color) {
        return !isCheck(color) && getAllMoves(color).length === 0;
    }
    */

    /*
    function makeMove(fromR, fromC, toR, toC, promotionType) {
        const piece = board[fromR][fromC];
        if (!piece) return false;
        const legal = getLegalMoves(fromR, fromC);
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

        let promo = promotionType;
        if (piece.type === "P" && (toR === 0 || toR === 7)) promo = promo || "Q";
        board[toR][toC] = promo ? { type: promo, color: piece.color } : piece;
        board[fromR][fromC] = null;

        turn = turn === "w" ? "b" : "w";
        return true;
    }
    */

    
    // original function getBestMoves
    function computerMove() {
        var state = ai.startThinking(game);
        state.startTime = Date.now();
        timer = window.setTimeout(function() {
          computerMove_continue(state)
        }, 0);
    }

    function computerMove_continue(state) {
        var now = Date.now();
        if (now-state.startTime < maxTime && ai.continueThinking(state, 1000)) {
          //$("#msg").text("Thinking... ("+Math.ceil((maxTime-(now-state.startTime))/1000)+"s)");
          msgP.textContent = "Thinking... ("+Math.ceil((maxTime-(now-state.startTime))/1000)+"s)";
          timer = window.setTimeout(function() {
            computerMove_continue(state)
          }, 0);
          return;
        }
        var a = ai.stopThinking(state);
        game.doAction(a);
        render();
        updateTurnLabel();
        afterMove();
        msgP.textContent = "Your turn"
    }

    // plot, draw html css?
    function render(init=false) {
        // set board css style
        // semi auto setting
        // should only set when new games
        if(init){
            boardEl.style.gridTemplateColumns = `repeat(${cols_num}, 1fr)`;
            boardEl.style.gridTemplateRows = `repeat(${rows_num}, 1fr)`;

            searchData.innerHTML = "";
        }

        boardEl.innerHTML = "";
        //const kingPos = getKingPos(turn);
        //const inCheckKing = kingPos && isSquareAttacked(kingPos[0], kingPos[1], turn === "w" ? "b" : "w");

        // from amazons.js
        let selected = game.selected
        let validMoves = game.validMoves
        // validArrow
        let arrowAimed = game.arrowAimed
        let validArrows = game.validArrows

        for (let r = 0; r < rows_num; r++) {
            for (let c = 0; c < cols_num; c++) {
                const sq = document.createElement("div");
                sq.className = "square";
                if ((r + c) % 2 === 0) sq.classList.add("light");
                else sq.classList.add("dark");
                sq.dataset.row = r;
                sq.dataset.col = c;
                const piece = game.getPiece(r, c);
                if (piece) {
                    sq.textContent = PIECES[piece.type][piece.color];
                    sq.classList.add(piece.color === "w" ? "white" : "black");

                    if(piece.type == ARROW_TYPE){
                        //sq.classList.add("gray");
                        sq.style.color="#797979";
                    }
                }

                
                let lastMoveFrom = game.lastMoveFrom
                let lastMove = game.lastMove
                
                if (selected && selected[0] === r && selected[1] === c) sq.classList.add("highlight");
                if (validMoves.some(([a, b]) => a === r && b === c)) sq.classList.add("move-target");
                if (arrowAimed && arrowAimed[0] === r && arrowAimed[1] === c) sq.classList.add("arrow-highlight");
                if (validArrows.some(([a, b]) => a === r && b === c)) sq.classList.add("arrow-target");

                //if (kingPos && r === kingPos[0] && c === kingPos[1] && inCheckKing) sq.classList.add("check");
                if ((lastMoveFrom && r === lastMoveFrom[0] && c === lastMoveFrom[1]) || (lastMove && r === lastMove.toR && c === lastMove.toC)) sq.classList.add("last-move");
                boardEl.appendChild(sq);
            }
        }
    }

    function updateTurnLabel() {
        let gameOver = game.gameOver
        let turn = game.turn

        if (gameOver) return;
        if (turn === "w") turnLabel.textContent = "White to move";
        else turnLabel.textContent = "Black to move";
    }

    /*
    function showPromotion(fromR, fromC, toR, toC) {
        pendingPromotion = { fromR, fromC, toR, toC };
        promotionOverlay.classList.remove("hidden");
        const color = board[fromR][fromC].color;
        const options = ["Q", "R", "B", "N"];
        promotionPiecesEl.innerHTML = "";
        options.forEach((type) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "promotion-piece-btn";
            btn.textContent = PIECES[type][color];
            btn.dataset.type = type;
            btn.addEventListener("click", () => {
                makeMove(fromR, fromC, toR, toC, type);
                promotionOverlay.classList.add("hidden");
                pendingPromotion = null;
                render();
                updateTurnLabel();
                afterMove();
            });
            promotionPiecesEl.appendChild(btn);
        });
    }
    */

    // can't be recursive, since mcts ai only be called once
    function afterMove() {
        let turn = game.turn;

        if(game.bIsWon){
        //if (isCheckmate("w")) {
            //gameOver = true;
            game.gameOver = true;
            gameOverTitle.textContent = "Checkmate!";
            gameOverMessage.textContent = "Black wins.";
            gameOverOverlay.classList.remove("hidden");
            return;
        }
        if(game.wIsWon){
        //if (isCheckmate("b")) {
            //gameOver = true;
            game.gameOver = true;
            gameOverTitle.textContent = "Checkmate!";
            gameOverMessage.textContent = "White wins.";
            gameOverOverlay.classList.remove("hidden");
            return;
        }
        if(game.draw){
        //if (isStalemate(turn)) {
            //gameOver = true;
            game.gameOver = true;
            gameOverTitle.textContent = "Stalemate";
            gameOverMessage.textContent = "Draw.";
            gameOverOverlay.classList.remove("hidden");
            return;
        }
        if(game.beCheck){
        //if (isCheck(turn)) {
            // just highlight king, label can say "Check"
            turnLabel.textContent = (turn === "w" ? "White" : "Black") + " is in check!";
        }

        // deal makemove after ai mcts activated
        // very similar as computerMove
        // fixed computer black, should let computer turn be var
        if (mode === "ai" && game.currentPlayer == computerPlayer) {
            /*
            setTimeout(() => {
                const move = getBestMove(2);
                if (move) {
                const piece = board[move.from[0]][move.from[1]];
                const isPromo = piece.type === "P" && (move.to[0] === 0 || move.to[0] === 7);
                if (isPromo) {
                    makeMove(move.from[0], move.from[1], move.to[0], move.to[1], "Q");
                } else {
                    makeMove(move.from[0], move.from[1], move.to[0], move.to[1]);
                }

                // draw, update html
                render();
                updateTurnLabel();
                afterMove();
                }
            }, 300);
            */

            // ai computerMove(will call computer continue, game.do action)
            if (prevSearchDataTurn < game.currentTurn) {
                prevSearchDataTurn = game.currentTurn;
                prevSearchData = "";
            } else {
                prevSearchData += currSearchData+"\n";
            }
            computerMove();
            // draw, update html
        }
    }

    function onSquareClick(r, c) {
        let gameOver = game.gameOver
        let turn = game.turn
        let selected = game.selected
        let validMoves = game.validMoves
        let arrowAimed = game.arrowAimed
        let validArrows = game.validArrows
        let board = game.board

        //if (gameOver || pendingPromotion) return;
        if (gameOver) return;
        //if (mode === "ai" && turn === "b") return;
        if (mode === "ai" && game.currentPlayer == computerPlayer) return ;

        //const piece = getPiece(r, c);
        const piece = game.getPiece(r, c);
        if (arrowAimed){
            const [sr, sc] = selected;
            const [mr, mc] = arrowAimed;
            if(validArrows.some(([tr, tc]) => tr === r && tc === c)){
                let a = {};
                a.fromR = sr
                a.fromC = sc
                a.toR = mr
                a.toC = mc
                a.arrowR = r
                a.arrowC = c
                game.doAction(a);

                game.selected = null;
                
                game.arrowAimed = null;
                game.validArrows = [];
                render();
                updateTurnLabel();
                afterMove();
                return;
            }
            game.selected = null;

            game.arrowAimed = null;
            game.validArrows = [];

        }
        if (selected) {
            const [sr, sc] = selected;
            if (validMoves.some(([tr, tc]) => tr === r && tc === c)) {
                const movingPiece = board[sr][sc];
                /*
                const isPromo = movingPiece.type === "P" && (r === 0 || r === 7);
                if (isPromo) {
                    showPromotion(sr, sc, r, c);
                    return;
                }
                makeMove(sr, sc, r, c);
                selected = null;
                validMoves = [];
                render();
                updateTurnLabel();
                afterMove();
                return;
                */
                let ifArrow = true
                game.arrowAimed = [r, c];
                game.validArrows = game.getLegalMoves(r, c, ifArrow);
            }
            else{
                game.selected = null;
            }
            //selected = null;
            //validMoves = [];
            game.validMoves = [];
        }
        // arrow different color
        if (piece && piece.color === turn) {
            //selected = [r, c];
            //validMoves = getLegalMoves(r, c);
            
            game.selected = [r, c];
            game.validMoves = game.getLegalMoves(r, c);
        }
        render();
    }

    function clickBoard(e){
        const sq = e.target.closest(".square");
        if (!sq) return;
        const r = parseInt(sq.dataset.row, 10);
        const c = parseInt(sq.dataset.col, 10);
        onSquareClick(r, c);
    }
    // assign click function to board
    // prevent add duplicate
    function bindBoard() {
        /*
        boardEl.addEventListener("click", (e) => {
        const sq = e.target.closest(".square");
        if (!sq) return;
        const r = parseInt(sq.dataset.row, 10);
        const c = parseInt(sq.dataset.col, 10);
        onSquareClick(r, c);
        });
        */
        boardEl.addEventListener("click", clickBoard);
    }

    function newGame(){
        game = new amazons.Game();
        let init = true
        render(init);
        updateTurnLabel();

        // mode already global variable
        if(mode == "ai"){
            ai = new mcts.MCTSPlayer({ nTrials: maxTrials });

            computerPlayer = computerplayerTurn.value
            if (computerPlayer == 1) {
                ai_turn = "w"
            }
            else{
                ai_turn = "b"
            }
            humanPlayer = (computerPlayer%2)+1;


            prevSearchDataTurn = 0;
            prevSearchData = "";
            currSearchData = "";
            ai.searchCallback = function(state) {
                var data = "["+state.root.count+" trials; "+state.time+" msecs]\n";
                for (var i = 0; i < state.root.children.length; i++) {
                    var n = state.root.children[i];
                    data += (n === state.best?"*":" ")+" "+n.toString()+"\n";
                }
                if (state.best) {
                    data += "avgSearchDepth "+state.avgSearchDepth.toFixed(4)+
                            "\navgGameDepth "+state.avgGameDepth.toFixed(4)+
                            "\navgBranchingFactor "+state.avgBranchingFactor.toFixed(4)+
                            "\n";
                }
                currSearchData = data;
                //$("#searchdata").html("<pre>"+data+"</pre>");
                searchData.innerHTML = "<pre>"+prevSearchData+currSearchData+"</pre>";
            };

            settingDiv.classList.remove("hidden");
            msgP.classList.remove("hidden");
            searchData.classList.remove("hidden");

            if(ai_turn == "w"){
                // rotate board
                game.board = game.board.reverse()
                afterMove()
            }
        }
        else {
            settingDiv.classList.add("hidden");
            msgP.classList.add("hidden");
            searchData.classList.add("hidden");

        }
    }

    // very first calling, main function like
    function showGame(m) {
        mode = m;
        modeScreen.classList.add("hidden");
        gameScreen.classList.remove("hidden");
        modeBadge.textContent = m === "ai" ? "Vs AI" : "Vs Friend";
        //initBoard();
        //let init = true
        //render(init);
        //updateTurnLabel();
        newGame();
        bindBoard();
    }

    document.getElementById("vsFriendBtn").addEventListener("click", () => showGame("friend"));
    document.getElementById("vsAiBtn").addEventListener("click", () => showGame("ai"));

    document.getElementById("newGameBtn").addEventListener("click", () => {
        //initBoard();
        //let init = true
        //render(init);
        //updateTurnLabel();
        newGame();
        gameOverOverlay.classList.add("hidden");
    });

    document.getElementById("changeModeBtn").addEventListener("click", () => {
        modeScreen.classList.remove("hidden");
        gameScreen.classList.add("hidden");
        gameOverOverlay.classList.add("hidden");
        game = null;
    });

    document.getElementById("playAgainBtn").addEventListener("click", () => {
        modeScreen.classList.remove("hidden");
        gameScreen.classList.add("hidden");
        gameOverOverlay.classList.add("hidden");
        game = null;
    });


    document.getElementById("maxtrials").addEventListener("change", (event) => {
        maxTrials = event.target.value;
        if(ai){
            ai.nTrials = maxTrials;
        }
    });

    document.getElementById("maxtime").addEventListener("change", (event) => {
        maxTime = event.target.value
    });


})();