/**
 * Leaderboard Embed Script
 * 
 * This script can be used in two ways:
 * 1. Auto-detected (Hosted by Server): Include it via <script src=".../embed.js" data-leaderboard-id="..."></script>
 * 2. Standalone (Self-hosted): Download this file, edit the CONFIG object below, and include it in your page.
 */

(function () {
    // --- EDITABLE CONFIGURATION ---
    const CONFIG = {
        // If hosting manually, you can hardcode your server URL here.
        // Example: 'https://api.myleaderboard.com'
        // Leave null to auto-detect from the script tag's src.
        SERVER_URL: `https://codechallenge.techmobileohio.org`,

        // If hosting manually, you can hardcode the Leaderboard ID here.
        // Example: 'event-1'
        // Leave null to auto-detect from the script tag's 'data-leaderboard-id' attribute.
        LEADERBOARD_ID: 'session-1'
    };
    // ------------------------------

    // Internal styles injected dynamically
    function injectStyles() {
        // We check if styles are already injected to avoid duplicates
        if (document.getElementById('lb-styles')) return;

        const css = `
            /* --- Widget (Bottom Right Timer) --- */
            .lb-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background-color: #111;
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: sans-serif;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                border: 1px solid #333;
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 120px;
            }
            .lb-widget-header {
                font-size: 12px;
                color: #888;
                text-transform: uppercase;
                letter-spacing: 1px;
                text-align: center;
            }
            .lb-widget-time {
                font-size: 24px;
                font-weight: bold;
                font-family: monospace;
                text-align: center;
                margin: 5px 0;
            }
            .lb-widget-status {
                font-size: 12px;
                color: #22c55e; /* Greenish */
                text-align: center;
            }

            /* --- Submission Modal (Overlay) --- */
            .lb-modal-overlay {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background-color: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                font-family: sans-serif;
            }
            .lb-modal-content {
                background-color: #1a1a1a;
                padding: 2rem;
                border-radius: 12px;
                color: white;
                text-align: center;
                min-width: 300px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.5);
                border: 1px solid #333;
            }
            .lb-modal-title {
                margin-bottom: 1rem;
            }
            .lb-modal-time {
                font-size: 1.5rem;
                color: #4ade80;
                margin-bottom: 1.5rem;
            }
            .lb-input {
                padding: 0.8rem;
                width: 100%;
                margin-bottom: 1rem;
                border-radius: 6px;
                border: 1px solid #444;
                background-color: #333;
                color: white;
                font-size: 1rem;
                box-sizing: border-box; /* Ensures padding doesn't break width */
            }
            .lb-btn-submit {
                padding: 0.8rem 1.5rem;
                background-color: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: bold;
                width: 100%;
                transition: background 0.2s;
            }
            .lb-btn-submit:hover {
                background-color: #2563eb;
            }
            .lb-btn-cancel {
                margin-top: 0.5rem;
                background: transparent;
                color: #888;
                border: none;
                cursor: pointer;
                text-decoration: underline;
                font-size: 0.9rem;
            }
        `;
        const style = document.createElement('style');
        style.id = 'lb-styles'; // ID prevents double injection
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Helpers to resolve configuration
    const scriptTag = document.currentScript || document.querySelector('script[src*="embed.js"]');

    // Return the socket URL that we are trying to use for the leaderboard
    function getSocketUrl() {
        let foundUrl = CONFIG.SERVER_URL;

        // Auto-detect from script source if not manually configured
        if (!foundUrl && scriptTag && scriptTag.src) {
            try {
                const url = new URL(scriptTag.src);
                foundUrl = `${url.protocol}//${url.host}`;
            } catch (e) {
                console.error("Could not derive Server URL from script source.", e);
            }
        }
        return foundUrl || window.location.origin; // Fallback
    }

    // Return the id of the specific leaderboard
    function getLeaderboardId() {
        let id = CONFIG.LEADERBOARD_ID;
        if (!id && scriptTag) {
            id = scriptTag.getAttribute('data-leaderboard-id');
        }
        return id;
    }

    const SOCKET_URL = getSocketUrl();
    const TARGET_LEADERBOARD_ID = getLeaderboardId();

    if (!SOCKET_URL) {
        console.error("Leaderboard Embed: No Server URL found. Please configure CONFIG.SERVER_URL or use a valid script source.");
        return;
    }

    // Load Socket.io dynamically
    if (typeof io === 'undefined') {
        const socketScript = document.createElement('script');
        socketScript.src = `${SOCKET_URL}/socket.io/socket.io.js`;
        socketScript.onload = initLeaderboard;
        socketScript.onerror = () => console.error("Failed to load socket.io from", socketScript.src);
        document.head.appendChild(socketScript);
    } else {
        initLeaderboard();
    }

    // Creates the leaderboard object that handles the activity for the timer and finish widget
    function initLeaderboard() {
        injectStyles(); // Inject CSS immediately upon initialization 

        console.log('Leaderboard Embed Initialized. Connected to:', SOCKET_URL);
        const socket = io(SOCKET_URL);

        let startTime = 0;
        let isRunning = false;
        let timerRequest;
        let uiElements = {};

        // PERSISTENCE: Key for localStorage
        const STORAGE_KEY = 'tic_tac_toe_timer_start';

        // New Student button logic
        const newStudentBtn = document.getElementById('new-student-btn');
        if (newStudentBtn) {
            newStudentBtn.addEventListener('click', () => {
                if (confirm("Are you sure? This will wipe the timer for the next student.")) {
                    localStorage.removeItem(STORAGE_KEY);
                    window.location.reload();
                }
            });
        }

        // Public API
        window.Leaderboard = {
            // Start the leaderboard and timer
            start: function () {
                // Check if we have a saved start time from before a refresh
                const savedTime = localStorage.getItem(STORAGE_KEY);
                
                if (savedTime) {
                    if (isRunning) return; // Already running with saved time
                    startTime = parseInt(savedTime, 10);
                    isRunning = true;
                    console.log('Resuming timer from localStorage');
                } else {
                    // No saved time, start fresh
                    if (isRunning) return;
                    startTime = Date.now();
                    localStorage.setItem(STORAGE_KEY, startTime); // Save it
                    isRunning = true;
                    console.log('Timer started and saved');
                }

                timerRequest = requestAnimationFrame(updateTimer);
                
                // Widget UI updates
                if (uiElements.status) uiElements.status.textContent = "Running...";
            },
            // Finish the timer and show the submission modal
            finish: function (overrideId) {
                // Allow finishing if we have a saved time, even if isRunning state was lost momentarily
                const savedTime = localStorage.getItem(STORAGE_KEY);
                if (!isRunning && !savedTime) return;

                const endTime = Date.now();
                // Always calc duration based on the ORIGINAL saved start time
                const actualStartTime = savedTime ? parseInt(savedTime, 10) : startTime;
                const duration = endTime - actualStartTime;

                isRunning = false;
                cancelAnimationFrame(timerRequest);
                
                // Clear the storage so next game starts fresh
                localStorage.removeItem(STORAGE_KEY);

                // Reset UI
                if (uiElements.timeDisplay) uiElements.timeDisplay.innerText = "0.000s";
                if (uiElements.status) uiElements.status.textContent = "Finished";

                const finalID = overrideId || TARGET_LEADERBOARD_ID;

                if (finalID) {
                    showSubmissionModal(duration, finalID, socket);
                } else {
                    console.warn("No Leaderboard ID configured. Cannot submit score.");
                    alert("Timer finished: " + (duration / 1000).toFixed(3) + "s\n(No Leaderboard ID configured)");
                }
            }
        };

        // If ID is present, inject the Widget
        if (TARGET_LEADERBOARD_ID) {
            createWidgetUI(TARGET_LEADERBOARD_ID);
        } else {
            console.log("Leaderboard Embed: No Leaderboard ID provided. Timer widget not auto-injected.");
        }

        // Update timer for viewing
        function updateTimer() {
            if (!isRunning) return;
            const current = Date.now();
            const diff = current - startTime;
            if (uiElements.timeDisplay) {
                uiElements.timeDisplay.innerText = (diff / 1000).toFixed(3) + 's';
            }
            timerRequest = requestAnimationFrame(updateTimer);
        }

        // Create the timer widget in the bottom right hand corner
        function createWidgetUI(id) {
            const container = document.createElement('div');
            container.classList.add('lb-widget');

            const header = document.createElement('div');
            header.innerText = 'Leaderboard Timer';
            header.classList.add('lb-widget-header');

            const timeDisplay = document.createElement('div');
            timeDisplay.innerText = '0.000s';
            timeDisplay.classList.add('lb-widget-time');
            uiElements.timeDisplay = timeDisplay;

            const status = document.createElement('div');
            status.innerText = 'Ready';
            status.classList.add('lb-widget-status');
            uiElements.status = status;

            container.appendChild(header);
            container.appendChild(timeDisplay);
            container.appendChild(status);
            document.body.appendChild(container);
        }

        // Creates the modal that allows for student submission of their name into the leaderboard
        function showSubmissionModal(time, leaderboardId, socket) {
            const modal = document.createElement('div');
            modal.classList.add('lb-modal-overlay');

            const content = document.createElement('div');
            content.classList.add('lb-modal-content');

            const title = document.createElement('h2');
            title.innerText = 'Activity Complete!';
            title.classList.add('lb-modal-title');

            const timeDisplay = document.createElement('p');
            timeDisplay.innerText = `Time: ${(time / 1000).toFixed(3)}s`;
            timeDisplay.classList.add('lb-modal-time');

            const input = document.createElement('input');
            input.placeholder = 'Enter your name';
            input.classList.add('lb-input');

            const submitBtn = document.createElement('button');
            submitBtn.innerText = 'Submit Score';
            submitBtn.classList.add('lb-btn-submit');

            const closeBtn = document.createElement('button');
            closeBtn.innerText = 'Cancel';
            closeBtn.classList.add('lb-btn-cancel');
            closeBtn.onclick = () => modal.remove();

            submitBtn.onclick = () => {
                const name = input.value.trim();
                if (name) {
                    socket.emit('submit_score', { leaderboardId, name, time });
                    modal.remove();
                    alert('Score submitted!');
                }
            };

            content.appendChild(title);
            content.appendChild(timeDisplay);
            content.appendChild(input);
            content.appendChild(submitBtn);
            content.appendChild(closeBtn);
            modal.appendChild(content);
            document.body.appendChild(modal);
        }
        
        // Auto-start the leaderboard upon creation
        window.Leaderboard.start();
    }
})();