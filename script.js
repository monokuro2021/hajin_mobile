document.addEventListener("DOMContentLoaded", function () {
    const board = document.getElementById("board");
    const undoButton = document.getElementById("undo-btn");
    const passButton = document.getElementById("pass-btn");
    const signButton = document.getElementById("sign-btn");

    undoButton.addEventListener("click", undoMove);
    passButton.addEventListener("click", passTurn);
    signButton.addEventListener("click", showSignDialog);

    // 座標表示フラグ（初期状態は非表示）
    let showCoordinates = false;

    // ゲーム定数
    const BOARD_SIZE = 9;
    const RED = "R";
    const BLUE = "B";
    const EMPTY = null;

    // ゲームクラス
    class ZoneGame {
        constructor() {
            this.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
            this.turn = RED;
            this.history = [];
            this.captured_red = 0;
            this.captured_blue = 0;
            this.captured_history = [];
            this.moveCount = 0;
            this.swapOffered = false;
            this.swapUsed = false;
        }

        saveState() {
            this.history.push(this.board.map(row => [...row]));
            this.captured_history.push([this.captured_red, this.captured_blue]);
        }

        undo() {
            if (this.history.length > 0) {
                this.board = this.history.pop();
                [this.captured_red, this.captured_blue] = this.captured_history.pop();
                this.turn = this.turn === RED ? BLUE : RED;
                this.moveCount--;
                if (this.moveCount === 0) {
                    this.swapOffered = false;
                    this.swapUsed = false;
                }
                return true;
            }
            return false;
        }

        passTurn() {
            this.turn = this.turn === RED ? BLUE : RED;
        }

        canPlacePiece(x, y) {
            if (this.board[x][y] !== null) {
                return false;
            }

            const opponent = this.turn === RED ? BLUE : RED;

            // 上下のチェック
            if (y > 0 && this.board[x][y-1] === opponent && 
                y < BOARD_SIZE - 1 && this.board[x][y+1] === opponent) {
                return false;
            }

            // 左右のチェック
            if (x > 0 && this.board[x-1][y] === opponent && 
                x < BOARD_SIZE - 1 && this.board[x+1][y] === opponent) {
                return false;
            }

            return true;
        }

        checkAndRemoveOpponentStones(x, y) {
            const opponent = this.turn === RED ? BLUE : RED;
            let capturedCount = 0;
            const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            
            for (const [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < BOARD_SIZE && ny >= 0 && ny < BOARD_SIZE && 
                    this.board[nx][ny] === opponent) {
                    const ux = nx + dx;
                    const uy = ny + dy;
                    
                    if (ux >= 0 && ux < BOARD_SIZE && uy >= 0 && uy < BOARD_SIZE && 
                        this.board[ux][uy] === this.turn) {
                        this.board[nx][ny] = EMPTY;
                        capturedCount++;
                    }
                }
            }
            
            if (this.turn === RED) {
                this.captured_red += capturedCount;
            } else {
                this.captured_blue += capturedCount;
            }
        }

        hasValidMove() {
            for (let x = 0; x < BOARD_SIZE; x++) {
                for (let y = 0; y < BOARD_SIZE; y++) {
                    if (this.canPlacePiece(x, y)) {
                        return true;
                    }
                }
            }
            return false;
        }

        gameEnd() {
            let redCount = 0;
            let blueCount = 0;
            
            for (let x = 0; x < BOARD_SIZE; x++) {
                for (let y = 0; y < BOARD_SIZE; y++) {
                    if (this.board[x][y] === RED) redCount++;
                    else if (this.board[x][y] === BLUE) blueCount++;
                }
            }
            
            if (redCount > blueCount) {
                return `Winner : Red !!\nRed: ${redCount}, Blue: ${blueCount}`;
            } else if (blueCount > redCount) {
                return `Winner : Blue!!\nRed: ${redCount}, Blue: ${blueCount}`;
            } else {
                return `Winner : Red !! \nRed: ${redCount}, Blue: ${blueCount}`;
            }
        }

        nextMove(x, y) {
            if (!this.canPlacePiece(x, y)) {
                return { success: false, board: this.board, turn: this.turn, 
                        captured_red: this.captured_red, captured_blue: this.captured_blue };
            }

            this.saveState();
            this.board[x][y] = this.turn;
            this.checkAndRemoveOpponentStones(x, y);
            this.moveCount++;

            const response = {
                success: true,
                board: this.board,
                captured_red: this.captured_red,
                captured_blue: this.captured_blue,
                result: null,
                swapOffered: false
            };

            // 最初の手（赤の1手目）後にスワップを提案
            if (this.moveCount === 1 && this.turn === RED && !this.swapUsed) {
                this.swapOffered = true;
                response.swapOffered = true;
                return response;
            }

            this.turn = this.turn === RED ? BLUE : RED;

            if (!this.hasValidMove()) {
                this.turn = this.turn === RED ? BLUE : RED;
                if (!this.hasValidMove()) {
                    response.result = this.gameEnd();
                    return response;
                }
            }

            return response;
        }

        swapColors() {
            // 盤上の全駒の色を交換
            for (let x = 0; x < BOARD_SIZE; x++) {
                for (let y = 0; y < BOARD_SIZE; y++) {
                    if (this.board[x][y] === RED) {
                        this.board[x][y] = BLUE;
                    } else if (this.board[x][y] === BLUE) {
                        this.board[x][y] = RED;
                    }
                }
            }
            
            // 取り駒数も交換
            [this.captured_red, this.captured_blue] = [this.captured_blue, this.captured_red];
            
            // ターンを赤に戻す（青がスワップしたので、次は赤の手番）
            this.turn = RED;
            this.swapUsed = true;
            this.swapOffered = false;

            return {
                success: true,
                board: this.board,
                captured_red: this.captured_red,
                captured_blue: this.captured_blue,
                result: null,
                swapCompleted: true
            };
        }
    }

    // ゲームインスタンス
    const game = new ZoneGame();

    // 盤面を生成する関数
    function createBoard(boardData = null) {
        board.innerHTML = "";
        for (let y = 0; y < 9; y++) {
            for (let x = 0; x < 9; x++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.x = x;
                cell.dataset.y = y;
                if (boardData && boardData[x][y] === "R") {
                    const redStone = document.createElement("div");
                    redStone.classList.add("stone", "red-stone");
                    cell.appendChild(redStone);
                } else if (boardData && boardData[x][y] === "B") {
                    const blueStone = document.createElement("div");
                    blueStone.classList.add("stone", "blue-stone");
                    cell.appendChild(blueStone);
                }
                cell.addEventListener("click", makeMove);
                cell.addEventListener("mouseenter", function(event) {
                    if (showCoordinates) {
                        displayCoordinates(event);
                    }
                });
                cell.addEventListener("mouseleave", function() {
                    if (showCoordinates) {
                        hideCoordinates();
                    }
                });
                board.appendChild(cell);
            }
        }
    }

    // 座標を表示する関数
    function displayCoordinates(event) {
        const x = parseInt(event.target.dataset.x);
        const y = parseInt(event.target.dataset.y);
        
        // 座標を計算（A-I, 1-9）
        const colLetter = String.fromCharCode(65 + x); // A-I
        const rowNumber = y + 1; // 1-9
        const coordinate = `${colLetter}${rowNumber}`;
        
        // 座標表示要素を作成
        const coordDisplay = document.createElement("div");
        coordDisplay.id = "coordinate-display";
        coordDisplay.textContent = coordinate;
        coordDisplay.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.6);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-family: Arial, sans-serif;
            pointer-events: none;
            z-index: 1000;
            transform: translate(-50%, -50%);
        `;
        
        // マスの中央に表示
        const rect = event.target.getBoundingClientRect();
        coordDisplay.style.left = rect.left + rect.width / 2 + 'px';
        coordDisplay.style.top = rect.top + rect.height / 2 + 'px';
        
        document.body.appendChild(coordDisplay);
    }

    // Sign確認ダイアログを表示
    function showSignDialog() {
        const signDialog = document.createElement("div");
        signDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 3vh 3.5vw;
            border-radius: 1.2vw;
            box-shadow: 0 0.3vw 1.8vw rgba(0,0,0,0.3);
            text-align: center;
            z-index: 1000;
        `;
        
        signDialog.innerHTML = `
            <h3 style="margin: 0 0 2vh 0; color: #333; font-size: 2vw;">マスの座標を表示しますか？</h3>
            <button id="accept-sign" style="margin: 0 0.8vw; padding: 1.2vh 2.5vw; background: #4CAF50; color: white; border: none; border-radius: 0.8vw; cursor: pointer; font-size: 1.5vw;">はい</button>
            <button id="decline-sign" style="margin: 0 0.8vw; padding: 1.2vh 2.5vw; background: #f44336; color: white; border: none; border-radius: 0.8vw; cursor: pointer; font-size: 1.5vw;">いいえ</button>
        `;
        
        document.body.appendChild(signDialog);
        
        // 盤面とコントロールボタンを無効化
        const controls = document.querySelector(".controls");
        controls.style.pointerEvents = "none";
        controls.style.opacity = "0.5";
        
        // イベントリスナーを設定
        document.getElementById("accept-sign").addEventListener("click", () => {
            document.body.removeChild(signDialog);
            // コントロールボタンを有効化
            controls.style.pointerEvents = "auto";
            controls.style.opacity = "1";
            // 座標表示を有効化
            showCoordinates = true;
            showNotification("座標の表示を有効にしました");
        });
        
        document.getElementById("decline-sign").addEventListener("click", () => {
            document.body.removeChild(signDialog);
            // コントロールボタンを有効化
            controls.style.pointerEvents = "auto";
            controls.style.opacity = "1";
            // 座標表示を無効化
            showCoordinates = false;
            showNotification("座標の表示を無効にしました");
            hideCoordinates(); // 現在表示中の座標を隠す
        });
    }

    // 座標表示を隠す関数
    function hideCoordinates() {
        const coordDisplay = document.getElementById("coordinate-display");
        if (coordDisplay) {
            document.body.removeChild(coordDisplay);
        }
    }

    // ゲームをリセットする関数
    function resetGame() {
        game.board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
        game.turn = RED;
        game.history = [];
        game.captured_red = 0;
        game.captured_blue = 0;
        game.captured_history = [];
        game.moveCount = 0;
        game.swapOffered = false;
        game.swapUsed = false;
        createBoard();
        updateCapturedDisplay();
        document.getElementById("game-result").style.display = "none";
    }

    // ボードを更新する関数
    function updateBoard(data) {
        const cells = document.querySelectorAll(".cell");
        cells.forEach(cell => {
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            const piece = data.board[x][y];
            cell.innerHTML = "";
            if (piece === "R") {
                const redStone = document.createElement("div");
                redStone.classList.add("stone", "red-stone");
                cell.appendChild(redStone);
            } else if (piece === "B") {
                const blueStone = document.createElement("div");
                blueStone.classList.add("stone", "blue-stone");
                cell.appendChild(blueStone);
            }
        });

        updateCapturedDisplay();

        // スワップが提案された場合
        if (data.swapOffered) {
            // すぐに盤面を無効化
            const board = document.getElementById("board");
            board.style.pointerEvents = "none";
            board.style.opacity = "1"; // 色の変化をなくす
            showSwapDialog();
        }

        // スワップが完了した場合は通知しない（ダイアログ内で処理済み）

        if (data.result) {
            setTimeout(() => {
                document.getElementById("game-result").style.display = "block";
                document.getElementById("result-text").innerHTML = data.result.replace("\n", "<br>");
            }, 1000);
        }
    }

    // スワップ確認ダイアログを表示
    function showSwapDialog() {
        // 1秒後にダイアログを表示
        setTimeout(() => {
            const swapDialog = document.createElement("div");
            swapDialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 255, 255, 0.4);
                padding: 3vh 3.5vw;
                border-radius: 1.2vw;
                box-shadow: 0 0.3vw 1.8vw rgba(0,0,0,0.3);
                text-align: center;
                z-index: 1000;
            `;
            
            swapDialog.innerHTML = `
                <h3 style="margin: 0 0 2vh 0; color: #333; font-size: 2vw;">スワップルール</h3>
                <p style="margin: 0 0 2vh 0; color: #333; font-size: 1.8vw; font-weight: 500;">赤の最初の１手が打たれました<br>手番を入れ替えますか？</p>
                <button id="accept-swap" style="margin: 0 0.8vw; padding: 1.2vh 2.5vw; background: #4CAF50; color: white; border: none; border-radius: 0.8vw; cursor: pointer; font-size: 1.5vw;">はい</button>
                <button id="decline-swap" style="margin: 0 0.8vw; padding: 1.2vh 2.5vw; background: #f44336; color: white; border: none; border-radius: 0.8vw; cursor: pointer; font-size: 1.5vw;">いいえ</button>
            `;
            
            document.body.appendChild(swapDialog);
            
            // 盤面を無効化
            const board = document.getElementById("board");
            board.style.pointerEvents = "none";
            board.style.opacity = "1";
            
            // イベントリスナーを設定
            document.getElementById("accept-swap").addEventListener("click", () => {
                const data = game.swapColors();
                updateBoard(data);
                document.body.removeChild(swapDialog);
                // 盤面を有効化
                board.style.pointerEvents = "auto";
                board.style.opacity = "1";
                showNotification("スワップしました\n手番が入れ替わります");
            });
            
            document.getElementById("decline-swap").addEventListener("click", () => {
                game.turn = BLUE; // 青の手番にしてゲーム続行
                game.swapOffered = false;
                document.body.removeChild(swapDialog);
                // 盤面を有効化
                board.style.pointerEvents = "auto";
                board.style.opacity = "1";
                showNotification("スワップしません\nこのままゲームを続けていきます");
            });
        }, 1000); // 1秒後に表示
    }

    // Homeボタンのイベントリスナー
    document.getElementById("home-btn").addEventListener("click", function() {
        showHomeDialog();
    });

    // Home確認ダイアログを表示
    function showHomeDialog() {
        const homeDialog = document.createElement("div");
        homeDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 3vh 3.5vw;
            border-radius: 1.2vw;
            box-shadow: 0 0.3vw 1.8vw rgba(0,0,0,0.3);
            text-align: center;
            z-index: 1000;
        `;
        
        homeDialog.innerHTML = `
            <h3 style="margin: 0 0 2vh 0; color: #333; font-size: 2vw;">ホームに戻りますか？</h3>
            <button id="accept-home" style="margin: 0 0.8vw; padding: 1.2vh 2.5vw; background: #4CAF50; color: white; border: none; border-radius: 0.8vw; cursor: pointer; font-size: 1.5vw;">はい</button>
            <button id="decline-home" style="margin: 0 0.8vw; padding: 1.2vh 2.5vw; background: #f44336; color: white; border: none; border-radius: 0.8vw; cursor: pointer; font-size: 1.5vw;">いいえ</button>
        `;
        
        document.body.appendChild(homeDialog);
        
        // 盤面とコントロールボタンを無効化
        const board = document.getElementById("board");
        const controls = document.querySelector(".controls");
        board.style.pointerEvents = "none";
        board.style.opacity = "1";
        controls.style.pointerEvents = "none";
        controls.style.opacity = "0.5";
        
        // イベントリスナーを設定
        document.getElementById("accept-home").addEventListener("click", () => {
            document.body.removeChild(homeDialog);
            // 盤面とコントロールボタンを有効化
            board.style.pointerEvents = "auto";
            board.style.opacity = "1";
            controls.style.pointerEvents = "auto";
            controls.style.opacity = "1";
            // ゲームをリセット
            location.reload();
        });
        
        document.getElementById("decline-home").addEventListener("click", () => {
            document.body.removeChild(homeDialog);
            // 盤面とコントロールボタンを有効化
            board.style.pointerEvents = "auto";
            board.style.opacity = "1";
            controls.style.pointerEvents = "auto";
            controls.style.opacity = "1";
        });
    }

    // 通知を表示する関数
    function showNotification(message) {
        // 盤面を無効化（色は変えない）
        const board = document.getElementById("board");
        board.style.pointerEvents = "none";
        board.style.opacity = "1"; // 画面はそのまま
        
        const notification = document.createElement("div");
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 1.5vh 2.5vw;
            border-radius: 0.8vw;
            font-size: 1.9vw;
            font-family: Arial, sans-serif;
            text-align: center;
            z-index: 2000;
        `;
        notification.innerHTML = message.replace(/\n/g, '<br>');
        
        document.body.appendChild(notification);
        
        // 1.5秒後に削除して盤面を有効化
        setTimeout(() => {
            document.body.removeChild(notification);
            board.style.pointerEvents = "auto";
            board.style.opacity = "1";
        }, 1500);
    }

    // 取った駒の数を更新する関数
    function updateCapturedDisplay() {
        // 取り駒表示は削除されたため、この関数は空にする
    }

    // 駒を置く処理
    function makeMove(event) {
        const x = parseInt(event.target.dataset.x);
        const y = parseInt(event.target.dataset.y);
        
        if (isNaN(x) || isNaN(y)) {
            // 無効な座標の場合は何もしない（サイレント）
            return;
        }

        const data = game.nextMove(x, y);
        
        if (data.success) {
            updateBoard(data);
        }
        // 駒を置けない場合は何もしない（サイレント）
    }

    // 1手戻す処理
    function undoMove() {
        const success = game.undo();
        if (success) {
            updateBoard({
                board: game.board,
                captured_red: game.captured_red,
                captured_blue: game.captured_blue
            });
            showNotification("1手戻されました");
        }
    }

    // パスする処理
    function passTurn() {
        game.passTurn();
        showNotification("手番をパスしました");
    }

    // 初期化
    createBoard();
    updateCapturedDisplay();
});

// ページ離脱時の確認を復活
window.addEventListener("beforeunload", function (event) {
    event.preventDefault();
    event.returnValue = "ゲームをリセットしてもよろしいですか？";
});
