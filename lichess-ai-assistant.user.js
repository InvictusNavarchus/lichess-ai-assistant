// ==UserScript==
// @name         Lichess AI Assistant
// @namespace    http://tampermonkey.net/
// @version      0.3.0
// @description  AI-powered chess coach with interactive chat interface. Analyze positions, ask follow-up questions, and get personalized guidance in real-time.
// @author       Invictus Navarchus
// @match        https://lichess.org/analysis*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';

  // --- LOGGING HELPER ---
  /**
   * Generates a formatted prefix for console logging with timestamp and emoji.
   * @param {string} level - The log level (info, success, warning, error)
   * @param {string} action - The action being performed
   * @returns {string} Formatted prefix with timestamp and emoji
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

  // --- STYLES ---
  // Injects all the necessary CSS for the button and sidebar panel into the page.
  GM_addStyle(`
        :root {
            --ai-helper-blue: #007bff;
            --ai-helper-blue-dark: #0056b3;
            --ai-helper-gray: #f0f0f0;
            --ai-helper-white: #ffffff;
            --ai-helper-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }

        .ai-helper-button {
            background: linear-gradient(145deg, var(--ai-helper-blue), var(--ai-helper-blue-dark));
            color: var(--ai-helper-white);
            border: none;
            padding: 0 15px;
            height: 36px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin-left: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease-in-out;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
        }

        .ai-helper-button:hover {
            transform: translateY(-2px);
            box-shadow: var(--ai-helper-shadow);
        }

        .ai-helper-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
        }

        /* AI Chat interface - styled to match WikiBook */
        #ai-coach-field {
            margin-top: 1rem;
            min-height: 500px;
            max-height: none;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
        }

        .ai-chat-container {
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 450px;
        }

        .ai-chat-messages {
            flex: 1;
            padding: 15px;
            overflow-y: auto;
            max-height: 400px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 14px;
            line-height: 1.6;
        }

        .ai-chat-message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 8px;
        }

        .ai-chat-message.user {
            background-color: #e3f2fd;
            margin-left: 20px;
            position: relative;
        }

        .ai-chat-message.user::before {
            content: "You";
            position: absolute;
            top: -5px;
            right: 10px;
            font-size: 12px;
            font-weight: 600;
            color: #1976d2;
        }

        .ai-chat-message.ai {
            background-color: #f5f5f5;
            margin-right: 20px;
            position: relative;
        }

        .ai-chat-message.ai::before {
            content: "AI Coach";
            position: absolute;
            top: -5px;
            left: 10px;
            font-size: 12px;
            font-weight: 600;
            color: #666;
        }

        .ai-chat-message p {
            margin: 0 0 8px 0;
        }

        .ai-chat-message strong {
            font-weight: 600;
        }

        .ai-chat-input-container {
            padding: 15px;
            border-top: 1px solid #e0e0e0;
            background-color: #fafafa;
        }

        .ai-chat-input-row {
            display: flex;
            gap: 8px;
            align-items: flex-end;
        }

        .ai-chat-input {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            resize: vertical;
            min-height: 40px;
            max-height: 120px;
            font-family: inherit;
        }

        .ai-chat-input:focus {
            outline: none;
            border-color: var(--ai-helper-blue);
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .ai-chat-send-btn {
            background: var(--ai-helper-blue);
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            min-width: 60px;
            transition: background-color 0.2s;
        }

        .ai-chat-send-btn:hover {
            background: var(--ai-helper-blue-dark);
        }

        .ai-chat-send-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .ai-chat-shortcut-row {
            margin-top: 8px;
            display: flex;
            gap: 8px;
        }

        .ai-chat-shortcut-btn {
            background: #f0f0f0;
            border: 1px solid #ddd;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }

        .ai-chat-shortcut-btn:hover {
            background: #e0e0e0;
            border-color: #ccc;
        }

        .ai-chat-welcome {
            padding: 20px;
            text-align: center;
            color: #666;
            font-style: italic;
        }

        /* Loading Spinner */
        .ai-loader {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .ai-loader .spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #f3f3f3;
            border-bottom-color: var(--ai-helper-blue);
            border-radius: 50%;
            animation: rotation 1s linear infinite;
        }

        @keyframes rotation {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .ai-error, .ai-chat-message.ai.error {
            color: #d32f2f;
            padding: 15px;
            font-size: 14px;
            background-color: #ffebee;
            border-radius: 6px;
            border: 1px solid #ffcdd2;
        }

        /* Ensure AI Coach panel stays visible even when marked as empty */
        #ai-coach-field.empty {
            display: block !important;
            visibility: visible !important;
        }

        #ai-coach-field.empty .ai-coach-content {
            display: block !important;
            visibility: visible !important;
        }
    `);

  // --- UI ELEMENTS ---
  let aiButton;
  let aiCoachPanel;
  let mutationObserver;
  let conversationHistory = []; // Store conversation history

  /**
   * Adds a message to the conversation history and updates the UI.
   * @param {string} message - The message content
   * @param {string} role - Either 'user' or 'ai'
   */
  function addMessageToHistory(message, role) {
    console.log(getPrefix('data', `Adding ${role} message to history`));

    conversationHistory.push({
      role: role,
      content: message,
      timestamp: new Date(),
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
      messagesContainer.innerHTML =
        '<div class="ai-chat-welcome">Start a conversation with your AI Chess Coach! Use the "Ask AI" button below or type your own question.</div>';
      return;
    }

    messagesContainer.innerHTML = conversationHistory
      .map((msg) => {
        const messageClass = msg.role === 'user' ? 'user' : 'ai';
        let content = msg.content;

        // Escape HTML in user messages to prevent XSS
        if (msg.role === 'user') {
          content = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/\n/g, '<br>'); // Convert newlines to <br>
        } else {
          // Convert markdown to HTML for AI messages
          content = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\n/g, '<br>'); // Newlines
        }

        return `<div class="ai-chat-message ${messageClass}">${content}</div>`;
      })
      .join('');

    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Builds a comprehensive system prompt with current chess context.
   * @returns {string} The system prompt with chess position data
   */
  function buildSystemPrompt() {
    console.log(getPrefix('data', 'Building system prompt with chess context'));

    const chessData = extractChessData();
    if (!chessData) {
      console.log(getPrefix('warning', 'No chess data available for system prompt'));
      return 'You are an AI chess coach. Help the user improve their chess skills with clear, beginner-friendly explanations.';
    }

    return `You are an AI chess coach helping a beginner chess player. Here is the current game context:

**CURRENT POSITION DATA:**
- FEN: ${chessData.fen}
- Player Side: ${chessData.playerSide}
- Last Move Evaluation: ${chessData.feedback}
- Stockfish Analysis: ${chessData.comment}

**GAME HISTORY (PGN):**
${chessData.pgn}

**YOUR ROLE:**
You are a patient, knowledgeable chess coach. Provide clear, educational responses that help beginners understand chess concepts. When analyzing positions or moves:

1. Use simple, easy-to-understand language
2. Explain the "why" behind chess principles
3. Focus on fundamental concepts over complex variations
4. When discussing tactics, explain the underlying patterns
5. For strategic concepts, relate them to the current position
6. If asked about alternatives, explain the trade-offs in beginner-friendly terms
7. Always consider the player's side (${chessData.playerSide}) when giving advice

**IMPORTANT:** Base your analysis on the current position (FEN: ${chessData.fen}) and maintain context throughout our conversation. The user can ask follow-up questions, request clarifications, or discuss general chess topics.`;
  }

  /**
   * Sends a message to the AI and handles the response.
   * @param {string} message - The message to send
   */
  async function sendMessageToAI(message) {
    console.log(getPrefix('api', 'Sending message to AI'));

    // Add user message to history
    addMessageToHistory(message, 'user');

    // Show loading in AI message
    const tempLoadingId = 'ai-loading-' + Date.now();
    conversationHistory.push({
      role: 'ai',
      content: '<div class="ai-loader"><div class="spinner"></div></div>',
      timestamp: new Date(),
      id: tempLoadingId,
    });
    updateChatUI();

    // Build comprehensive prompt with system context and conversation history
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

    const encodedPrompt = encodeURIComponent(fullPrompt);
    const baseEndpoint = 'https://api.zpi.my.id/v1/ai/copilot';
    const fullUrl = `${baseEndpoint}?text=${encodedPrompt}`;
    const proxiedUrl = `https://cors.fadel.web.id/${fullUrl}`;

    console.log(getPrefix('api', `Making request with conversation context`));

    GM_xmlhttpRequest({
      method: 'GET',
      url: proxiedUrl,
      onload: function (response) {
        console.log(getPrefix('api', `Response received with status: ${response.status}`));

        // Remove loading message
        conversationHistory = conversationHistory.filter((msg) => msg.id !== tempLoadingId);

        if (response.status >= 200 && response.status < 300) {
          console.log(getPrefix('success', 'API request successful, parsing response'));
          try {
            const data = JSON.parse(response.responseText);
            console.log(getPrefix('data', `API response code: ${data.code}`));

            if (data.code === 200 && data.response && data.response.content) {
              console.log(getPrefix('success', 'AI response received, adding to history'));
              addMessageToHistory(data.response.content, 'ai');
            } else {
              console.log(getPrefix('error', 'Unexpected API response format'));
              addMessageToHistory('Error: Unexpected API response format', 'ai');
            }
          } catch (error) {
            console.log(getPrefix('error', `Error parsing response: ${error.message}`));
            addMessageToHistory(`Error parsing AI response: ${error.message}`, 'ai');
          }
        } else {
          console.log(getPrefix('error', `API request failed with status: ${response.status}`));
          addMessageToHistory(`Error fetching AI response. Status: ${response.status}`, 'ai');
        }

        // Re-enable send button
        const sendButton = document.getElementById('ai-chat-send-btn');
        if (sendButton) sendButton.disabled = false;
      },
      onerror: function (error) {
        console.log(getPrefix('error', `Network error: ${error.statusText || 'Unknown error'}`));

        // Remove loading message
        conversationHistory = conversationHistory.filter((msg) => msg.id !== tempLoadingId);
        addMessageToHistory(`Network error: ${error.statusText || 'Unknown error'}`, 'ai');

        // Re-enable send button
        const sendButton = document.getElementById('ai-chat-send-btn');
        if (sendButton) sendButton.disabled = false;
      },
    });
  }

  /**
   * Sets up a MutationObserver to prevent the AI Coach panel from being hidden
   * when Lichess adds the 'empty' class due to WikiBook changes.
   */
  function setupMutationObserver() {
    console.log(getPrefix('event', 'Setting up MutationObserver for AI Coach panel'));

    const targetNode = document.querySelector('.analyse__side');
    if (!targetNode) {
      console.log(getPrefix('error', 'Could not find sidebar for MutationObserver'));
      return;
    }

    const config = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    };

    mutationObserver = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        // Check if the AI Coach panel's classes were modified
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'class' &&
          mutation.target.id === 'ai-coach-field'
        ) {
          const aiCoachField = mutation.target;
          const classes = aiCoachField.classList;

          // If the 'empty' class was added, remove it to keep the panel visible
          if (classes.contains('empty')) {
            console.log(
              getPrefix('event', 'Detected empty class added to AI Coach panel, removing it')
            );
            classes.remove('empty');
          }
        }

        // Also watch for the panel being removed and re-inject it if necessary
        if (mutation.type === 'childList') {
          const aiCoachExists = document.getElementById('ai-coach-field');
          if (!aiCoachExists && aiCoachPanel) {
            console.log(getPrefix('event', 'AI Coach panel was removed, re-injecting'));
            const sidebar = document.querySelector('.analyse__side');
            if (sidebar) {
              sidebar.appendChild(aiCoachPanel);
              console.log(getPrefix('success', 'AI Coach panel re-injected successfully'));
            }
          }
        }
      }
    });

    mutationObserver.observe(targetNode, config);
    console.log(getPrefix('success', 'MutationObserver setup completed'));
  }

  /**
   * Creates and injects the "Ask AI" button and the AI Coach sidebar panel into the DOM.
   */
  function setupUI() {
    console.log(getPrefix('init', 'Setting up UI'));

    // Create the "Ask AI" button
    console.log(getPrefix('ui', 'Creating Ask AI button'));
    aiButton = document.createElement('button');
    aiButton.className = 'ai-helper-button';
    aiButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M4.5 9.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m2-3a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5"/>
                <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
            </svg>
            <span>Ask AI</span>
        `;
    aiButton.onclick = handleAskAIShortcut;

    // Create the AI Chat interface (similar to WikiBook)
    console.log(getPrefix('ui', 'Creating AI Chat interface'));
    aiCoachPanel = document.createElement('fieldset');
    aiCoachPanel.className = 'analyse__wiki toggle-box toggle-box--toggle toggle-box--ready';
    aiCoachPanel.id = 'ai-coach-field';
    aiCoachPanel.innerHTML = `
            <legend tabindex="0">AI Chess Coach</legend>
            <div class="ai-chat-container">
                <div class="ai-chat-messages" id="ai-chat-messages">
                    <div class="ai-chat-welcome">Start a conversation with your AI Chess Coach! Use the "Ask AI" button below or type your own question.</div>
                </div>
                <div class="ai-chat-input-container">
                    <div class="ai-chat-input-row">
                        <textarea class="ai-chat-input" id="ai-chat-input" placeholder="Ask me anything about this position or chess in general..." rows="2"></textarea>
                        <button class="ai-chat-send-btn" id="ai-chat-send-btn">Send</button>
                    </div>
                    <div class="ai-chat-shortcut-row">
                        <button class="ai-chat-shortcut-btn" id="ai-ask-position-btn">📋 Ask AI about Position</button>
                        <button class="ai-chat-shortcut-btn" id="ai-clear-chat-btn">🗑️ Clear Chat</button>
                    </div>
                </div>
            </div>
        `;

    // Append button to controls
    console.log(getPrefix('ui', 'Injecting button to controls container'));
    const controlsContainer = document.querySelector('.analyse__controls .features');
    if (controlsContainer) {
      controlsContainer.appendChild(aiButton);
      console.log(getPrefix('success', 'Ask AI button successfully injected'));
    } else {
      console.log(getPrefix('error', 'Could not find controls container to inject button'));
    }

    // Append AI Coach panel to sidebar (after WikiBook)
    console.log(getPrefix('ui', 'Injecting AI Chat interface to sidebar'));
    const sidebar = document.querySelector('.analyse__side');
    if (sidebar) {
      sidebar.appendChild(aiCoachPanel);
      console.log(getPrefix('success', 'AI Chat interface successfully injected'));

      // Setup event listeners for chat interface
      setupChatEventListeners();

      // Setup MutationObserver after the panel is injected
      setupMutationObserver();
    } else {
      console.log(getPrefix('error', 'Could not find sidebar to inject AI Chat interface'));
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
    const clearChatButton = document.getElementById('ai-clear-chat-btn');

    // Send button click
    if (sendButton) {
      sendButton.addEventListener('click', handleSendMessage);
    }

    // Enter key in chat input (Ctrl+Enter or Shift+Enter to send)
    if (chatInput) {
      chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.shiftKey)) {
          event.preventDefault();
          handleSendMessage();
        }
      });
    }

    // Ask about position shortcut button
    if (askPositionButton) {
      askPositionButton.addEventListener('click', handleAskAIShortcut);
    }

    // Clear chat button
    if (clearChatButton) {
      clearChatButton.addEventListener('click', () => {
        console.log(getPrefix('event', 'Clear chat button clicked'));
        conversationHistory = [];
        updateChatUI();
      });
    }
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

    // Clear input and disable send button during processing
    chatInput.value = '';
    sendButton.disabled = true;

    // Ensure the AI Coach panel is expanded
    const aiCoachField = document.getElementById('ai-coach-field');
    if (aiCoachField && !aiCoachField.classList.contains('toggle-box--expanded')) {
      console.log(getPrefix('ui', 'Expanding AI Coach panel'));
      aiCoachField.querySelector('legend').click();
    }

    sendMessageToAI(message);
  }

  /**
   * Extracts all relevant chess data from the page.
   * @returns {object|null} An object with fen, pgn, feedback, comment, and playerSide, or null if data is missing.
   */
  function extractChessData() {
    console.log(getPrefix('chess', 'Extracting chess data from page'));

    const fenInput = document.querySelector('.copyables .pair input.copyable');
    const pgnTextarea = document.querySelector('.copyables .pgn textarea.copyable');
    const commentEl = document.querySelector('.practice-box .comment');

    if (!fenInput || !pgnTextarea) {
      console.log(getPrefix('error', 'Could not find FEN or PGN data on page'));
      alert('AI Helper: Could not find FEN or PGN data on the page.');
      return null;
    }

    console.log(getPrefix('data', 'Found FEN and PGN data'));

    let feedback = 'N/A';
    let commentText = 'N/A';
    let playerSide = 'N/A';

    // Extract player's side from the practice box
    const playerRunningEl = document.querySelector('.practice-box .player.running');
    if (playerRunningEl) {
      console.log(getPrefix('data', 'Found player running element, extracting side'));
      const pieceEl = playerRunningEl.querySelector('piece');
      if (pieceEl) {
        const pieceClasses = pieceEl.className;
        if (pieceClasses.includes('white')) {
          playerSide = 'white';
        } else if (pieceClasses.includes('black')) {
          playerSide = 'black';
        }
        console.log(getPrefix('data', `Extracted player side: ${playerSide}`));
      }
    } else {
      console.log(getPrefix('warning', 'No player running element found'));
    }

    if (commentEl) {
      console.log(getPrefix('data', 'Found comment element, extracting feedback'));
      const verdictEl = commentEl.querySelector('.verdict');
      if (verdictEl) {
        feedback = verdictEl.textContent.trim();
        console.log(getPrefix('data', `Extracted feedback: ${feedback}`));
        // To get only the suggestion text, we clone the element and remove the verdict part.
        const commentClone = commentEl.cloneNode(true);
        commentClone.querySelector('.verdict').remove();
        commentText = commentClone.textContent.trim();
        console.log(getPrefix('data', `Extracted comment: ${commentText.substring(0, 50)}...`));
      }
    } else {
      console.log(getPrefix('warning', 'No comment element found'));
    }

    const extractedData = {
      fen: fenInput.value,
      pgn: pgnTextarea.value,
      feedback,
      comment: commentText,
      playerSide,
    };

    console.log(getPrefix('success', 'Chess data extraction completed'));
    return extractedData;
  }

  /**
   * Constructs a detailed, beginner-focused prompt for the AI.
   * @param {object} data - The extracted chess data.
   * @returns {string} The formatted prompt.
   */
  function buildPrompt(data) {
    console.log(getPrefix('data', 'Building AI prompt'));

    const isGoodMove = data.feedback === 'Good move';
    console.log(getPrefix('data', `Move evaluation: ${data.feedback} (isGoodMove: ${isGoodMove})`));

    let promptSections = [
      `I am a beginner chess player seeking help. Here is the current game state:`,
      ``,
      `**FEN:** ${data.fen}`,
      `**PGN:** ${data.pgn}`,
      `**Playing as:** ${data.playerSide}`,
      ``,
      `**My Last Move's Analysis:**`,
      `**Feedback:** ${data.feedback}`,
      `**Stockfish Comment:** ${data.comment}`,
      ``,
      `Please explain in simple, easy-to-understand terms for a beginner:`,
    ];

    if (isGoodMove) {
      console.log(getPrefix('data', 'Building prompt for good move scenario'));
      // Handle "Good Move" evaluation specially with critical analysis
      promptSections.push(
        `1. Why was my last move considered a "Good move"? What made it a solid choice? If this move involves trading pieces or making what might seem like a sacrifice, explain exactly why this trade/sacrifice is beneficial and whether it's truly the best move available in this position.`
      );

      if (data.comment && data.comment.includes('Another was ')) {
        console.log(getPrefix('data', 'Found alternative move suggestion'));
        // There's an alternative move suggestion
        const alternativeMove = data.comment
          .replace('Good move. Another was ', '')
          .replace('Another was ', '');
        promptSections.push(
          `2. The analysis mentions "Another was ${alternativeMove}". Why is this alternative move also good? What are the differences between my move and this alternative? If my move seems counterintuitive compared to the alternative (e.g., trading valuable pieces), explain which move would be better for a beginner and why.`
        );
      } else {
        console.log(getPrefix('data', 'No alternative move found, using general principles'));
        // No alternative move mentioned
        promptSections.push(
          `2. What key principles or ideas did my move follow that made it effective? If this move seems counterintuitive to basic chess principles (like trading a more valuable piece for a less valuable one), explain the deeper strategic reason and whether a beginner should prioritize this type of move.`
        );
      }

      promptSections.push(
        `3. Based on the current position, what is a simple, general plan or strategy I should be trying to follow over the next few moves?`
      );
    } else {
      console.log(getPrefix('data', 'Building prompt for non-good move scenario'));
      // Handle other move evaluations (mistakes, blunders, etc.)
      promptSections.push(
        `1. Why was my last move considered a "${data.feedback}"? What tactical or positional weaknesses did it create?`
      );

      if (
        data.comment &&
        (data.comment.includes('Best was ') || data.comment.includes('Better was '))
      ) {
        console.log(getPrefix('data', 'Found suggested better move'));
        const suggestedMove = data.comment.replace('Best was ', '').replace('Better was ', '');
        promptSections.push(
          `2. Why is the suggested move "${suggestedMove}" considered better? What is the idea or plan behind it?`
        );
      } else {
        console.log(getPrefix('data', 'No specific better move found, using general approach'));
        promptSections.push(`2. What would have been a better approach in this position?`);
      }

      promptSections.push(
        `3. Based on the current position, what is a simple, general plan or strategy I should be trying to follow over the next few moves?`
      );
    }

    promptSections.push(
      ``,
      `Focus on fundamental concepts and avoid overly complex variations. When evaluating "Good move" assessments, be especially critical - if a move seems counterintuitive to basic chess principles (like material trades that don't make obvious sense), explain the deeper reasoning and whether it's truly optimal for a beginner's development. Provide a direct, instructional response without conversational openings, closings, or questions. Do not use phrases like "Great question!" or "Want to dive deeper?" - just provide clear, educational explanations.`
    );

    const finalPrompt = promptSections.join('\n').trim();
    console.log(
      getPrefix('success', `Prompt built successfully (${finalPrompt.length} characters)`)
    );
    return finalPrompt;
  }

  /**
   * Main handler function for the "Ask AI about Position" shortcut button.
   * This sends a position analysis request to the chat interface.
   */
  function handleAskAIShortcut() {
    console.log(getPrefix('event', 'Ask AI shortcut button clicked or spacebar pressed'));

    const chessData = extractChessData();
    if (!chessData) {
      console.log(getPrefix('error', 'Chess data extraction failed, aborting'));
      return;
    }

    // Ensure the AI Coach panel is expanded
    console.log(getPrefix('ui', 'Ensuring AI Coach panel is expanded'));
    const aiCoachField = document.getElementById('ai-coach-field');
    if (aiCoachField && !aiCoachField.classList.contains('toggle-box--expanded')) {
      console.log(getPrefix('ui', 'Expanding AI Coach panel'));
      aiCoachField.querySelector('legend').click();
    } else {
      console.log(getPrefix('info', 'AI Coach panel already expanded'));
    }

    // Build comprehensive position analysis prompt using buildPrompt()
    console.log(getPrefix('data', 'Building comprehensive prompt for position analysis'));
    const positionPrompt = buildPrompt(chessData);

    // Send the position analysis question directly to the chat
    console.log(getPrefix('api', 'Sending position analysis question to chat'));
    sendMessageToAI(positionPrompt);
  }

  // --- INITIALIZATION ---
  window.addEventListener('load', () => {
    console.log(getPrefix('init', 'Window loaded, starting initialization'));

    // Wait a bit for the dynamic page content to be fully loaded
    console.log(getPrefix('init', 'Waiting 500ms for dynamic content to load'));
    setTimeout(() => {
      console.log(getPrefix('init', 'Setting up UI after delay'));
      setupUI();
    }, 500);

    // Add spacebar shortcut
    console.log(getPrefix('event', 'Setting up spacebar keyboard shortcut'));
    document.addEventListener('keydown', (event) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);

      if (event.code === 'Space' && !isTyping) {
        console.log(getPrefix('event', 'Spacebar shortcut triggered'));
        event.preventDefault(); // Prevent default spacebar action (e.g., scrolling)
        handleAskAIShortcut();
      }
    });

    console.log(getPrefix('success', 'Lichess AI Assistant initialization completed'));
  });

  // Cleanup when page unloads
  window.addEventListener('beforeunload', () => {
    console.log(getPrefix('init', 'Cleaning up before page unload'));
    if (mutationObserver) {
      mutationObserver.disconnect();
      console.log(getPrefix('success', 'MutationObserver disconnected'));
    }
  });
})();
