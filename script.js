document.addEventListener('DOMContentLoaded', () => {
    
    // Element references
    const cells = document.querySelectorAll('.cell');
    const statusText = document.getElementById('status-text');
    const resetButton = document.getElementById('reset-button');

    // State variables
    let gameBoard = ['', '', '', '', '', '', '', '', '']; // Represents the 9 squares
    let currentPlayer = 'X';
    let gameActive = true; 
    
    // PROBLEM 2: One winning combo is missing
    let winningCombos = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], // Columns
        [0, 4, 8], [2, 4, 6]  // Diagonals
    ];

    // --- SOLUTION FLAG 2 ---
    // Uncomment the line below when you have fixed Problem 2
    // window.SOLVED_PROBLEM_2 = true;


    /**
     * Resets the game to its initial state.
     */
    function initGame() {
        gameBoard = Array(9).fill(''); 
        currentPlayer = 'X';
        gameActive = true;
        statusText.textContent = `Player ${currentPlayer}'s Turn`;
        cells.forEach(cell => {
            cell.textContent = '';
            cell.classList.remove('playerX', 'playerO');
        });

        // Check if the leaderboard exists (in case it hasn't loaded yet)
        if (window.Leaderboard) {
            console.log("starting leaderboard");
            window.Leaderboard.start();
        }
    }

    /**  
     * ******************************************************
     * HARD MODE FUNCTION: checkGameEndByCounting()
     * ******************************************************
     * 
     * Checks if the game is over via counting the current player's positions in the board and seeing if they sum up to 3 in a win condition
     * @returns true if the current player has won or the game is a tie
     */
    function checkGameEndByCounting() {
        let rowCounter = 0;
        let colCounter = [0, 0 ,0];
        let slopeDownCounter = 0;
        let slopeUpCounter = 0;
        let playedSpots = 0;
        
        for (let i = 0; i < 9; i++) {
            // PROBLEM 4: This reset condition is wrong (should be i % 3 == 0)
            // HINT: Use an "if" statement block
            rowCounter = 0; 

            if (gameBoard[i] == currentPlayer) {
                rowCounter++;
                // --- SOLUTION FLAG 4 ---
                // Uncomment the line below when you have fixed Problem 4
                // window.SOLVED_PROBLEM_4 = true;
                colCounter[i % 3]++;
                if (i % 4 == 0) slopeDownCounter++;
                if (i % 2 == 0 && i % 8 != 0) slopeUpCounter++;
                if (rowCounter == 3 || colCounter[i % 3] == 3 || slopeUpCounter == 3 || slopeDownCounter == 3) {
                    statusText.textContent = `Player ${currentPlayer} wins!`;
                    checkAllProblemsSolved();
                    return true;
                }
            }
            if (gameBoard[i] != '') playedSpots++;
        }
        
        /** PROBLEM 3: The tie condition is missing
        Tie condition: */
        // if (playedSpots == 9) {
        //      statusText.textContent = "It's a tie!";
             
        //      --- SOLUTION FLAG 3 ---
        //      Uncomment the line below when you have fixed Problem 3
        //      window.SOLVED_PROBLEM_3 = true;
        //      checkAllProblemsSolved(); // Check if this was the last fix
        //      return true;
        // }
        
        return false;
    }

    /**
     * Checks that every element of array target is in array arr
     * @param {*} arr 
     * @param {*} target 
     * @returns true if every element of target is in arr, false otherwise 
     */
    function arrayContains(arr, target) {
        return target.every(v => arr.includes(v));
    } 

    /**
     * ******************************************************
     * STANDARD GAME FUNCTION: checkGameEndAgainstCombos()
     * ******************************************************
     *
     * Checks if the game is over via checking the current player's position against the winning combinations
     * @returns true if the current player has won or the game is a tie
     */
    function checkGameEndAgainstCombos() {
        let playedSpots = 0;
        let currPlayerPositions = [];
        
        for (let i = 0; i < 9; i++) {
            if (gameBoard[i] != '') playedSpots++;
            if (gameBoard[i] == currentPlayer) {
                currPlayerPositions.push(i);
            } 
        }
        console.log("currPlayerPositions: ", currPlayerPositions)
        
        for (combo of winningCombos) {
            if (arrayContains(currPlayerPositions, combo)) { 
                statusText.textContent = `Player ${currentPlayer} wins!`;
                checkAllProblemsSolved();
                return true;
            }
        }
        
        // PROBLEM 3: The tie condition is missing
        // if (playedSpots == 9) {
        //     statusText.textContent = "It's a tie!";
        //
        //     // --- SOLUTION FLAG 3 ---
        //     // Uncomment the line below when you have fixed Problem 3
        //     window.SOLVED_PROBLEM_3 = true;
        //
        //     checkAllProblemsSolved();
        //     return true;
        // }
        
        return false;
    }

    /**
     * FINAL CHECK: This function verifies if the student has marked all problems as solved.
     */
    function checkAllProblemsSolved() {
        if (window.SOLVED_PROBLEM_1 && 
            window.SOLVED_PROBLEM_2 && 
            window.SOLVED_PROBLEM_3) {
            
            if (window.Leaderboard) {
                window.Leaderboard.finish(); 
            }
        }
    }
    
    /**
     * Switches the players
     */
    function switchPlayer() {
        currentPlayer = (currentPlayer == 'X') ? 'O': 'X'; // This line just flip-flops the currentPlayer between the two symbols
        statusText.textContent = `Player ${currentPlayer}'s Turn`;
    }

    /**
     * Handles a click on a single cell.
     */
    function handleCellClick(e) {
        const clickedCell = e.target;
        const clickedIndex = parseInt(clickedCell.getAttribute('data-index'));

        // PROBLEM 1: Players can overrwrite already taken spaces or play after the game ends
        // The code below once uncommented will prevent this from happening
        // if (gameBoard[clickedIndex] !== '' || !gameActive) {
        //     return;
        // }

        // --- SOLUTION FLAG 1 ---
        // Uncomment the line below when you have fixed Problem 1
        // window.SOLVED_PROBLEM_1 = true;

        // Update the game state
        gameBoard[clickedIndex] = currentPlayer;
        clickedCell.textContent = currentPlayer;
        clickedCell.classList.add(`player${currentPlayer}`);
        
        // Check for a win or draw.
        gameActive = !checkGameEndAgainstCombos();

        if (gameActive) switchPlayer();
    }

    // Event Listeners
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });

    resetButton.addEventListener('click', initGame);

    // Start the game
    initGame();
});