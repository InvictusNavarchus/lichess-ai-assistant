// ==UserScript==
// @name         Lichess AI Assistant
// @namespace    http://tampermonkey.net/
// @version      0.5.0
// @description  AI-powered chess coach with FEN stack context and a redesigned, modern chat interface.
// @author       Invictus Navarchus & Gemini
// @match        https://lichess.org/analysis*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';

  // --- LOGGING HELPER ---
  /**
   * Generates a formatted prefix for console logging.
   * @param {string} level - The log level (e.g., 'info', 'success', 'error')
   * @param {string} action - The action being logged.
   * @returns {string} A formatted string for console output.
   */
  function getPrefix(level = 'info', action = '') {
    const now = new Date();
    const timestamp = now.toTimeString().slice(0, 8); // HH:mm:ss format

    const emojis = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      init: '🚀',
      ui: '🎨',
      chess: '♟️',
      api: '🌐',
      data: '📊',
      event: '🎯',
    };

    const emoji = emojis[level] || emojis.info;
    const actionText = action ? ` ${action}` : '';

    return `[${timestamp}] ${emoji}${actionText}:`;
  }

  // --- STYLES (Modern Redesign) ---
  // Injects all the necessary CSS for the button and sidebar panel into the page.
  GM_addStyle(`
        /* --- MODERN AI CHAT STYLES --- */
        :root {
            /* Default to Dark Theme (matches Lichess 'dark' and 'system' on dark OS) */
            --ai-bg-primary: #262421; /* Lichess bg-alt */
            --ai-bg-secondary: #201f1c; /* Lichess bg */
            --ai-bg-tertiary: #4a4a4a;
            --ai-text-primary: #e3e3e3;
            --ai-text-secondary: #b0b0b0;
            --ai-accent-primary: #00aaff;
            --ai-accent-hover: #33bbff;
            --ai-user-msg-bg: #005c99;
            --ai-ai-msg-bg: #3a3835;
            --ai-border-color: #403e3a;
            --ai-font-family: 'Roboto', 'Noto Sans', 'Helvetica Neue', sans-serif;
            --ai-send-btn-color: #e3e3e3;
            --ai-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        /* Light Theme overrides */
        body[data-theme="light"], body.light {
            --ai-bg-primary: #ffffff;
            --ai-bg-secondary: #f3f3f3;
            --ai-bg-tertiary: #e9e9e9;
            --ai-text-primary: #222222;
            --ai-text-secondary: #666666;
            --ai-accent-primary: #007bff;
            --ai-accent-hover: #0056b3;
            --ai-user-msg-bg: #e3f2fd;
            --ai-ai-msg-bg: #f1f1f1;
            --ai-border-color: #e0e0e0;
            --ai-send-btn-color: #ffffff;
            --ai-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        @media (prefers-color-scheme: light) {
            body[data-theme="system"] {
                --ai-bg-primary: #ffffff;
                --ai-bg-secondary: #f3f3f3;
                --ai-bg-tertiary: #e9e9e9;
                --ai-text-primary: #222222;
                --ai-text-secondary: #666666;
                --ai-accent-primary: #007bff;
                --ai-accent-hover: #0056b3;
                --ai-user-msg-bg: #e3f2fd;
                --ai-ai-msg-bg: #f1f1f1;
                --ai-border-color: #e0e0e0;
                --ai-send-btn-color: #ffffff;
                --ai-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
        }

        /* Main "Ask AI" Button */
        .ai-helper-button {
            background: var(--ai-accent-primary);
            color: var(--ai-send-btn-color);
            border: none;
            padding: 0 16px;
            height: 36px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-left: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .ai-helper-button:hover {
            background: var(--ai-accent-hover);
            transform: translateY(-1px);
            box-shadow: var(--ai-shadow);
        }



        /* Main AI Panel */
        #ai-coach-field {
            border: 1px solid var(--ai-border-color) !important;
            background-color: var(--ai-bg-primary);
            border-radius: 8px;
            margin-top: 1rem;
            padding: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        #ai-coach-field legend {
            font-size: 1.1em;
            font-weight: 600;
            padding: 0 10px;
            color: var(--ai-text-primary);
        }
        .ai-chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 450px;
            max-height: 70vh;
            font-family: var(--ai-font-family);
            flex-grow: 1;
        }

        /* Messages Area */
        .ai-chat-messages {
            flex: 1;
            padding: 20px 15px 10px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .ai-chat-messages::-webkit-scrollbar { width: 6px; }
        .ai-chat-messages::-webkit-scrollbar-track { background: transparent; }
        .ai-chat-messages::-webkit-scrollbar-thumb { background: var(--ai-bg-tertiary); border-radius: 3px; }
        .ai-chat-messages::-webkit-scrollbar-thumb:hover { background: var(--ai-text-secondary); }

        /* Individual Messages */
        .ai-chat-message {
            padding: 12px 16px;
            border-radius: 18px;
            line-height: 1.5;
            max-width: 85%;
            word-wrap: break-word;
        }
        .ai-chat-message.user {
            background-color: var(--ai-user-msg-bg);
            color: var(--ai-text-primary);
            border-bottom-right-radius: 4px;
            align-self: flex-end;
        }
        .ai-chat-message.ai {
            background-color: var(--ai-ai-msg-bg);
            color: var(--ai-text-primary);
            border-bottom-left-radius: 4px;
            align-self: flex-start;
        }
        .ai-message-author {
            font-size: 12px;
            font-weight: 700;
            color: var(--ai-text-secondary);
            margin-bottom: 6px;
        }
        .ai-chat-message.user .ai-message-author {
            color: var(--ai-accent-hover);
        }
        .ai-message-content {
            font-size: 14px;
            color: var(--ai-text-primary);
        }
        .ai-message-content p { margin: 0; }
        .ai-message-content strong { color: var(--ai-accent-primary); font-weight: 600; }
        .ai-message-content br { content: ""; display: block; margin-bottom: 8px; }

        /* Welcome & Special Messages */
        .ai-chat-welcome {
            text-align: center;
            padding: 20px;
            color: var(--ai-text-secondary);
            font-size: 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            height: 100%;
            justify-content: center;
        }
        .ai-chat-welcome::before {
            content: '🤖';
            font-size: 48px;
        }
        .ai-error, .ai-chat-message.ai.error {
            background-color: #5c1c1c;
            color: #ffc1c1;
            border: 1px solid #c53030;
            align-self: stretch;
            max-width: 100%;
        }
        body[data-theme="light"] .ai-error, body[data-theme="light"] .ai-chat-message.ai.error {
             background-color: #ffebee;
             color: #c62828;
             border: 1px solid #ffcdd2;
        }


        /* Input Area */
        .ai-chat-input-container {
            padding: 12px;
            border-top: 1px solid var(--ai-border-color);
            background-color: var(--ai-bg-secondary);
        }
        .ai-chat-input-row {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }
        .ai-chat-input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid var(--ai-border-color);
            border-radius: 18px;
            font-size: 14px;
            background-color: var(--ai-bg-primary);
            color: var(--ai-text-primary);
            resize: none;
            min-height: 42px;
            max-height: 150px;
            font-family: inherit;
            line-height: 1.4;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ai-chat-input:focus {
            outline: none;
            border-color: var(--ai-accent-primary);
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15);
        }
        .ai-chat-send-btn {
            background: var(--ai-accent-primary);
            border: none;
            border-radius: 50%;
            width: 42px;
            height: 42px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: background-color 0.2s, transform 0.1s;
        }
        .ai-chat-send-btn svg { stroke: var(--ai-send-btn-color); }
        .ai-chat-send-btn:hover { background: var(--ai-accent-hover); }
        .ai-chat-send-btn:disabled { background: var(--ai-bg-tertiary); cursor: not-allowed; transform: scale(1); }
        .ai-chat-send-btn:active:not(:disabled) { transform: scale(0.95); }

        /* Shortcut Buttons / Chips */
        .ai-chat-shortcut-row {
            margin-top: 10px;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .ai-chat-shortcut-btn {
            background: var(--ai-bg-tertiary);
            border: 1px solid transparent;
            padding: 6px 12px;
            border-radius: 16px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            color: var(--ai-text-secondary);
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .ai-chat-shortcut-btn:hover {
            background: var(--ai-accent-primary);
            color: var(--ai-send-btn-color);
        }
        .ai-chat-shortcut-btn .icon { font-size: 14px; }

        /* Loading Spinner */
        .ai-loader {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: var(--ai-text-secondary);
            padding: 10px;
        }
        .spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--ai-text-secondary);
            border-top-color: var(--ai-accent-primary);
            border-radius: 50%;
            animation: rotation 0.8s linear infinite;
        }
        @keyframes rotation { to { transform: rotate(360deg); } }

        /* Ensure AI Coach panel stays visible */
        #ai-coach-field.empty { display: flex !important; visibility: visible !important; }
        #ai-coach-field.empty .ai-coach-content { display: block !important; visibility: visible !important; }

        /* Fix for chat interface sinking issue */
        .analyse__side {
            display: block !important;
        }
    `);

  // --- UI ELEMENTS ---
  let aiCoachPanel;
  let mutationObserver;
  let conversationHistory = [];

  // --- FEN STATE TRACKING ---
  /**
   * LIFO stack to track the latest 3 FEN positions.
   * @type {Array<string>}
   */
  let fenStack = [];
  let boardMutationObserver; // Observer for move list changes
  let lastKnownFen = null;

  /**
   * Adds a FEN position to the LIFO stack, maintaining a maximum of 3 positions.
   * @param {string} fen - The FEN string to add.
   */
  function addFenToStack(fen) {
    if (!fen || fen === lastKnownFen) return;

    console.log(getPrefix('chess', `Adding FEN to stack: ${fen}`));

    // Remove the FEN if it already exists in the stack to avoid duplicates
    const existingIndex = fenStack.indexOf(fen);
    if (existingIndex !== -1) {
      fenStack.splice(existingIndex, 1);
    }

    // Add to the end (top of LIFO stack)
    fenStack.push(fen);

    // Maintain only the latest 3 positions
    if (fenStack.length > 3) {
      fenStack.shift(); // Remove the oldest (first) element
    }

    lastKnownFen = fen;
    console.log(
      getPrefix('data', `FEN stack updated: [${fenStack.length}] ${fenStack.join(' | ')}`)
    );
  }

  /**
   * Gets the current FEN from the page's FEN input box.
   * @returns {string|null} The current FEN string or null if not found.
   */
  function getCurrentFen() {
    const fenInput = document.querySelector('.copyables .pair input.copyable');
    return fenInput ? fenInput.value : null;
  }

  /**
   * Sets up a MutationObserver to watch for move changes by monitoring the moves list.
   * When a move is made, it captures the new FEN and adds it to the stack.
   */
  function setupBoardMutationObserver() {
    console.log(getPrefix('event', 'Setting up MutationObserver for move list tracking'));

    const movesContainer = document.querySelector('.analyse__moves .tview2');
    if (!movesContainer) {
      console.log(getPrefix('warning', 'Could not find moves container for FEN tracking'));
      return;
    }

    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    };

    boardMutationObserver = new MutationObserver((mutationsList) => {
      let movesChanged = false;

      for (const mutation of mutationsList) {
        // Check for changes in move elements or their classes (especially 'active' class)
        if (mutation.type === 'attributes' && mutation.target.tagName === 'MOVE') {
          if (mutation.attributeName === 'class') {
            console.log(
              getPrefix('event', `Move element class changed: ${mutation.target.className}`)
            );
            movesChanged = true;
            break;
          }
        }

        // Check for added/removed move elements
        if (mutation.type === 'childList') {
          for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the node is a move element or contains move elements
              if (node.tagName === 'MOVE' || (node.querySelector && node.querySelector('move'))) {
                console.log(
                  getPrefix(
                    'event',
                    `Move element ${mutation.addedNodes.length > 0 ? 'added' : 'removed'}`
                  )
                );
                movesChanged = true;
                break;
              }
            }
          }
          if (movesChanged) break;
        }
      }

      if (movesChanged) {
        console.log(getPrefix('event', 'Move list changed, checking FEN'));

        // Small delay to ensure FEN is updated
        setTimeout(() => {
          const currentFen = getCurrentFen();
          if (currentFen) {
            addFenToStack(currentFen);
          }
        }, 50);
      }
    });

    boardMutationObserver.observe(movesContainer, config);
    console.log(getPrefix('success', 'Move list MutationObserver setup complete'));

    // Initialize with current position
    const initialFen = getCurrentFen();
    if (initialFen) {
      addFenToStack(initialFen);
    }
  }

  /**
   * Gets the latest FEN from the stack (most recent position).
   * @returns {string|null} The latest FEN or null if the stack is empty.
   */
  function getLatestFen() {
    return fenStack.length > 0 ? fenStack[fenStack.length - 1] : null;
  }

  /**
   * Gets the previous FEN from the stack (the position before the last move).
   * @returns {string|null} The previous FEN or null if not available.
   */
  function getPreviousFen() {
    return fenStack.length > 1 ? fenStack[fenStack.length - 2] : null;
  }

  /**
   * Gets all FENs in the stack from oldest to newest.
   * @returns {Array<string>} Array of FEN strings.
   */
  function getAllFens() {
    return [...fenStack];
  }

  /**
   * Clears the FEN stack and resets the last known FEN.
   */
  function clearFenStack() {
    console.log(getPrefix('data', 'Clearing FEN stack'));
    fenStack = [];
    lastKnownFen = null;
  }

  /**
   * Adds a message to the conversation history and updates the UI.
   * @param {string} message - The message content
   * @param {string} role - Either 'user' or 'ai'
   * @param {boolean} isError - True if the message is an error
   */
  function addMessageToHistory(message, role, isError = false) {
    console.log(getPrefix('data', `Adding ${role} message to history`));

    conversationHistory.push({
      role: role,
      content: message,
      timestamp: new Date(),
      isError: isError,
    });

    updateChatUI();
  }

  /**
   * Updates the chat UI to display all messages in the conversation history.
   */
  function updateChatUI() {
    console.log(getPrefix('ui', 'Updating chat UI'));

    const messagesContainer = document.getElementById('ai-chat-messages');
    if (!messagesContainer) return;

    if (conversationHistory.length === 0) {
      messagesContainer.innerHTML = `
                <div class="ai-chat-welcome">
                    <strong>Welcome to AI Chess Coach</strong>
                    <span>Ask about the current position, why a move is good or bad, or general chess principles.</span>
                </div>`;
      return;
    }

    messagesContainer.innerHTML = conversationHistory
      .map((msg) => {
        const messageClass = msg.role === 'user' ? 'user' : msg.isError ? 'ai error' : 'ai';
        let content = msg.content;

        // Handle loaders, which have their own HTML
        if (msg.id) {
          return `<div class="ai-chat-message ai">${content}</div>`;
        }

        // Sanitize and format content
        if (msg.role === 'user') {
          content = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>');
        } else if (!msg.isError) {
          // Convert basic markdown for AI messages
          content = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
        }

        const authorName = msg.role === 'user' ? 'You' : 'AI Coach';

        return `
                <div class="ai-chat-message ${messageClass}">
                    <div class="ai-message-author">${authorName}</div>
                    <div class="ai-message-content">${content}</div>
                </div>`;
      })
      .join('');

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Builds a comprehensive system prompt with current chess context, including FEN history.
   * The previous FEN (middle in stack) is the most critical as it's the position Stockfish analyzed.
   * @returns {string} The system prompt with chess position data.
   */
  function buildSystemPrompt() {
    console.log(getPrefix('data', 'Building system prompt with FEN stack context'));

    const chessData = extractChessData();
    if (!chessData) {
      console.log(getPrefix('warning', 'No chess data available for system prompt'));
      return 'You are an AI chess coach. Help the user improve their chess skills with clear, beginner-friendly explanations.';
    }

    const latestFen = getLatestFen(); // The current position after opponent's response.
    const previousFen = getPreviousFen(); // The position that Stockfish analyzed (MOST CRITICAL).
    const allFens = getAllFens();

    // Construct the FEN history part of the prompt.
    // The previous FEN is the most critical as it's what Stockfish analyzed.
    let fenContext = `- **ANALYZED FEN (Stockfish evaluated this position):** ${previousFen || 'Not available'}`;
    if (latestFen) {
      fenContext += `\n- **Current FEN (after opponent's response):** ${latestFen}`;
    }
    // Include the third FEN if it exists for more context.
    if (allFens.length > 2) {
      const oldestFen = allFens[allFens.length - 3];
      fenContext += `\n- **FEN (two moves ago):** ${oldestFen}`;
    }

    return `You are an expert AI chess coach designed to help beginner players improve. Your analysis must be clear, concise, and focused on fundamental principles.

Here is the game context:

---

**GAME STATE:**
- **Player to Analyze For:** ${chessData.playerSide}
- **Lichess's Evaluation of Last Move:** "${chessData.feedback}"
- **Lichess's Comment on Last Move:** ${chessData.comment}

**POSITION HISTORY (from FEN stack):**
This stack shows the sequence of positions leading to the current state. Use this to understand the impact of the most recent move.
${fenContext}

**FULL GAME HISTORY (PGN):**
${chessData.pgn}

---

**YOUR TASK & INSTRUCTIONS:**
You are a patient and knowledgeable coach. Your goal is to provide educational responses that help the user understand *why* moves are good or bad.

1.  **Analyze the Move:** Use the **ANALYZED FEN** as your primary reference - this is the position Stockfish evaluated and provided feedback on. Compare it with the **Current FEN** to understand the opponent's response.
2.  **Explain in Simple Terms:** Avoid complex jargon. Focus on core concepts like piece activity, king safety, pawn structure, and control of the center.
3.  **Focus on Fundamentals:** Prioritize explaining the *most important* strategic or tactical idea in the position. Don't overwhelm the user with too many variations.
4.  **Be Direct:** Get straight to the point. The user is here to learn, not for conversational fluff.
5.  **Use the Player's Perspective:** Always frame your advice from the perspective of the player whose turn it is (${chessData.playerSide}).

**IMPORTANT:** Your analysis should focus on the **ANALYZED FEN** as this is the position that received Stockfish's evaluation and feedback.`;
  }

  /**
   * Sends a message to the AI and handles the response.
   * @param {string} message - The message to send
   */
  async function sendMessageToAI(message) {
    console.log(getPrefix('api', 'Sending message to AI'));

    // Build conversation context BEFORE adding the current message
    const systemPrompt = buildSystemPrompt();
    const conversationContext = conversationHistory
      .filter((msg) => (msg.role === 'user' || msg.role === 'ai') && !msg.id) // Exclude loading messages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    let fullPrompt;
    if (conversationContext.length > 0) {
      fullPrompt = `${systemPrompt}\n\n**CONVERSATION HISTORY:**\n${conversationContext}\n\nUser: ${message}`;
    } else {
      fullPrompt = `${systemPrompt}\n\nUser: ${message}`;
    }

    // Add user message to history AFTER building the prompt
    addMessageToHistory(message, 'user');

    // Show loading in AI message
    const tempLoadingId = 'ai-loading-' + Date.now();
    conversationHistory.push({
      role: 'ai',
      content: '<div class="ai-loader"><div class="spinner"></div><span>Thinking...</span></div>',
      timestamp: new Date(),
      id: tempLoadingId,
    });
    updateChatUI();

    const encodedPrompt = encodeURIComponent(fullPrompt);
    const baseEndpoint = 'https://api.zpi.my.id/v1/ai/copilot';
    const fullUrl = `${baseEndpoint}?text=${encodedPrompt}`;
    const proxiedUrl = `https://cors.fadel.web.id/${fullUrl}`;

    // Debug logging for request parameters and message
    console.debug(
      '%c🔍 API REQUEST DEBUG INFO',
      'background: #1e40af; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;'
    );
    console.debug(
      '%c📝 USER MESSAGE:',
      'background: #059669; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      message
    );
    console.debug(
      '%c🧠 SYSTEM PROMPT:',
      'background: #7c3aed; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;'
    );
    console.debug(systemPrompt);
    console.debug(
      '%c💬 CONVERSATION CONTEXT:',
      'background: #dc2626; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      conversationContext
    );
    console.debug(
      '%c📄 FULL PROMPT (before encoding):',
      'background: #ea580c; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;'
    );
    console.debug(fullPrompt);
    console.debug(
      '%c🔗 REQUEST URLS:',
      'background: #0891b2; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;'
    );
    console.debug('Base endpoint:', baseEndpoint);
    console.debug('Full URL (before proxy):', fullUrl);
    console.debug('Proxied URL (final request):', proxiedUrl);
    console.debug(
      '%c📊 REQUEST STATS:',
      'background: #be185d; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;',
      {
        method: 'GET',
        originalLength: fullPrompt.length,
        encodedLength: encodedPrompt.length,
        compressionRatio:
          (((fullPrompt.length - encodedPrompt.length) / fullPrompt.length) * 100).toFixed(1) + '%',
      }
    );

    console.log(getPrefix('api', `Making request with conversation context`));

    GM_xmlhttpRequest({
      method: 'GET',
      url: proxiedUrl,
      onload: function (response) {
        console.log(getPrefix('api', `Response received with status: ${response.status}`));

        // Remove loading message
        conversationHistory = conversationHistory.filter((msg) => msg.id !== tempLoadingId);

        if (response.status >= 200 && response.status < 300) {
          try {
            const data = JSON.parse(response.responseText);
            if (data.code === 200 && data.response && data.response.content) {
              addMessageToHistory(data.response.content, 'ai');
            } else {
              addMessageToHistory(`Error: Unexpected API response format.`, 'ai', true);
            }
          } catch (error) {
            addMessageToHistory(`Error parsing AI response: ${error.message}`, 'ai', true);
          }
        } else {
          addMessageToHistory(`Error fetching AI response. Status: ${response.status}`, 'ai', true);
        }

        // Re-enable send button
        const sendButton = document.getElementById('ai-chat-send-btn');
        if (sendButton) sendButton.disabled = false;
      },
      onerror: function (error) {
        console.log(getPrefix('error', `Network error: ${error.statusText || 'Unknown error'}`));

        conversationHistory = conversationHistory.filter((msg) => msg.id !== tempLoadingId);
        addMessageToHistory(`Network error: ${error.statusText || 'Unknown error'}`, 'ai', true);

        // Re-enable send button
        const sendButton = document.getElementById('ai-chat-send-btn');
        if (sendButton) sendButton.disabled = false;
      },
    });
  }

  /**
   * Sets up a MutationObserver to prevent the AI Coach panel from being hidden by Lichess scripts.
   */
  function setupMutationObserver() {
    console.log(getPrefix('event', 'Setting up MutationObserver for AI Coach panel'));
    const targetNode = document.querySelector('.analyse__side');
    if (!targetNode) {
      console.log(getPrefix('error', 'Could not find sidebar for MutationObserver'));
      return;
    }

    const config = { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] };

    mutationObserver = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class' &&
          mutation.target.id === 'ai-coach-field'
        ) {
          if (mutation.target.classList.contains('empty')) {
            console.log(getPrefix('event', 'Detected "empty" class, removing it.'));
            mutation.target.classList.remove('empty');
          }
        }
        if (mutation.type === 'childList') {
          if (!document.getElementById('ai-coach-field') && aiCoachPanel) {
            console.log(getPrefix('event', 'AI Coach panel was removed, re-injecting'));
            document.querySelector('.analyse__side')?.appendChild(aiCoachPanel);
          }
        }
      }
    });

    mutationObserver.observe(targetNode, config);
    console.log(getPrefix('success', 'MutationObserver setup completed'));
  }

  /**
   * Creates and injects the UI elements into the DOM.
   */
  function setupUI() {
    console.log(getPrefix('init', 'Setting up UI'));

    // Create the AI Chat interface
    aiCoachPanel = document.createElement('fieldset');
    aiCoachPanel.className = 'analyse__wiki toggle-box toggle-box--toggle toggle-box--ready';
    aiCoachPanel.id = 'ai-coach-field';
    aiCoachPanel.innerHTML = `
            <legend tabindex="0">AI Chess Coach</legend>
            <div class="ai-chat-container">
                <div class="ai-chat-messages" id="ai-chat-messages"></div>
                <div class="ai-chat-input-container">
                    <div class="ai-chat-input-row">
                        <textarea class="ai-chat-input" id="ai-chat-input" placeholder="Ask your AI coach..." rows="1"></textarea>
                        <button class="ai-chat-send-btn" id="ai-chat-send-btn" title="Send (Ctrl+Enter)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                    <div class="ai-chat-shortcut-row">
                        <button class="ai-chat-shortcut-btn" id="ai-ask-position-btn">
                            <span class="icon">💡</span> Explain Position
                        </button>
                        <button class="ai-chat-shortcut-btn" id="ai-copy-prompt-btn">
                            <span class="icon">📋</span> Copy Prompt
                        </button>
                        <button class="ai-chat-shortcut-btn" id="ai-clear-chat-btn">
                            <span class="icon">🗑️</span> Clear Chat
                        </button>
                    </div>
                </div>
            </div>`;

    // Inject UI elements
    const sidebar = document.querySelector('.analyse__side');
    if (sidebar) {
      sidebar.appendChild(aiCoachPanel);
      updateChatUI(); // Initialize with welcome message
      setupChatEventListeners();
    } else {
      console.log(getPrefix('error', 'Could not find sidebar to inject AI Chat interface.'));
    }
  }

  /**
   * Sets up event listeners for the chat interface.
   */
  function setupChatEventListeners() {
    console.log(getPrefix('event', 'Setting up chat event listeners'));

    const chatInput = document.getElementById('ai-chat-input');
    const sendButton = document.getElementById('ai-chat-send-btn');
    const askPositionButton = document.getElementById('ai-ask-position-btn');
    const copyPromptButton = document.getElementById('ai-copy-prompt-btn');
    const clearChatButton = document.getElementById('ai-clear-chat-btn');

    sendButton?.addEventListener('click', handleSendMessage);
    askPositionButton?.addEventListener('click', handleAskAIShortcut);
    copyPromptButton?.addEventListener('click', handleCopyToClipboard);
    clearChatButton?.addEventListener('click', () => {
      console.log(getPrefix('event', 'Clear chat button clicked'));
      conversationHistory = [];
      updateChatUI();
    });

    chatInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.shiftKey)) {
        event.preventDefault();
        handleSendMessage();
      }
    });
  }

  /**
   * Handles sending a message from the chat input.
   */
  function handleSendMessage() {
    console.log(getPrefix('event', 'Send message triggered'));
    const chatInput = document.getElementById('ai-chat-input');
    const sendButton = document.getElementById('ai-chat-send-btn');

    if (!chatInput || !sendButton) return;
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    sendButton.disabled = true;

    if (aiCoachPanel && !aiCoachPanel.classList.contains('toggle-box--expanded')) {
      aiCoachPanel.querySelector('legend')?.click();
    }

    sendMessageToAI(message);
  }

  /**
   * Copies the full AI analysis prompt to clipboard for debugging or use with external LLMs.
   */
  async function handleCopyToClipboard() {
    console.log(getPrefix('event', 'Copy to clipboard triggered'));

    const chessData = extractChessData();
    if (!chessData) {
      console.log(getPrefix('error', 'Could not extract chess data for clipboard'));
      return;
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildPrompt(chessData);
    const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}`;

    try {
      await navigator.clipboard.writeText(fullPrompt);
      console.log(getPrefix('success', 'Full prompt copied to clipboard'));

      // Visual feedback
      const copyButton = document.getElementById('ai-copy-prompt-btn');
      if (copyButton) {
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = `<span>✅ Copied!</span>`;
        setTimeout(() => {
          copyButton.innerHTML = originalText;
        }, 2000);
      }
    } catch (err) {
      console.log(getPrefix('error', `Failed to copy to clipboard: ${err.message}`));
    }
  }

  /**
   * Extracts all relevant chess data from the page.
   * @returns {object|null} An object with chess data, or null if missing.
   */
  function extractChessData() {
    console.log(getPrefix('chess', 'Extracting chess data'));
    const fenInput = document.querySelector('.copyables .pair input.copyable');
    const pgnTextarea = document.querySelector('.copyables .pgn textarea.copyable');

    if (!fenInput || !pgnTextarea) {
      console.log(getPrefix('error', 'Could not find FEN or PGN data on page'));
      return null;
    }

    const commentEl = document.querySelector('.practice-box .comment');
    const playerRunningEl = document.querySelector('.practice-box .player.running piece');

    let feedback = 'N/A',
      commentText = 'N/A',
      playerSide = 'N/A';

    if (playerRunningEl) {
      playerSide = playerRunningEl.className.includes('white') ? 'white' : 'black';
    }

    if (commentEl) {
      const verdictEl = commentEl.querySelector('.verdict');
      if (verdictEl) {
        feedback = verdictEl.textContent.trim();
        const commentClone = commentEl.cloneNode(true);
        commentClone.querySelector('.verdict').remove();
        commentText = commentClone.textContent.trim();
      }
    }

    return {
      fen: fenInput.value,
      pgn: pgnTextarea.value,
      feedback,
      comment: commentText,
      playerSide,
    };
  }

  /**
   * Constructs a detailed, beginner-focused prompt for the AI based on the current move's evaluation.
   * @param {object} data - The extracted chess data.
   * @returns {string} The formatted prompt.
   */
  function buildPrompt(data) {
    console.log(getPrefix('data', 'Building AI prompt'));
    const isGoodMove = data.feedback === 'Good move';

    let promptSections = [
      `I'm a beginner playing as **${data.playerSide}**. My last move was evaluated as: **${data.feedback}**.`,
      `The computer's comment was: *"${data.comment}"*.`,
      `---`,
      `Please explain this position to me simply. Focus on the core principles.`,
    ];

    if (isGoodMove) {
      promptSections.push(
        `1. Why was my last move good? What fundamental principle did it follow?`,
        `2. What other good moves were available, and what was their main idea?`
      );
    } else {
      promptSections.push(
        `1. Why was my last move a "${data.feedback}"? What tactical or positional weakness did it create?`,
        `2. What would have been a better approach in this position, and what is its core idea?`
      );
    }

    return promptSections.join('\n');
  }

  /**
   * Main handler for the "Explain Position" shortcut.
   */
  function handleAskAIShortcut() {
    console.log(getPrefix('event', 'Ask AI shortcut triggered'));

    const chessData = extractChessData();
    if (!chessData) {
      addMessageToHistory(
        'Could not find required chess data (FEN/PGN) on the page to analyze.',
        'ai',
        true
      );
      return;
    }

    if (aiCoachPanel && !aiCoachPanel.classList.contains('toggle-box--expanded')) {
      aiCoachPanel.querySelector('legend')?.click();
    }

    const positionPrompt = buildPrompt(chessData);
    sendMessageToAI(positionPrompt);
  }

  // --- INITIALIZATION ---
  function init() {
    console.log(getPrefix('init', 'Lichess AI Assistant starting...'));
    // Use a timeout to ensure Lichess's UI is fully rendered.
    setTimeout(() => {
      setupUI();
      setupMutationObserver();
      setupBoardMutationObserver();
      console.log(getPrefix('success', 'Lichess AI Assistant initialization complete'));
    }, 1500); // Delay to ensure all page elements are ready.
  }

  window.addEventListener('load', init);

  window.addEventListener('beforeunload', () => {
    if (mutationObserver) {
      mutationObserver.disconnect();
      console.log(getPrefix('success', 'UI MutationObserver disconnected'));
    }
    if (boardMutationObserver) {
      boardMutationObserver.disconnect();
      console.log(getPrefix('success', 'Move list MutationObserver disconnected'));
    }
  });
})();
