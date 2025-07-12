const chatBody = document.getElementById('chat-body');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const viewHistoryBtn = document.getElementById('view-history-btn');
const historyModal = document.getElementById('history-modal');
const closeHistoryBtn = document.getElementById('close-history-btn');
const historyList = document.getElementById('history-list');
let isMinimized = false;

// Conversation history
let conversationHistory = [];

let sessionId = null;

async function createSession() {
    try {
        const response = await fetch('/session', {
            method: 'POST'
        });
        if (!response.ok) {
            throw new Error('Failed to create session');
        }
        const data = await response.json();
        sessionId = data.session_id;
        conversationHistory = [
            {
                role: "system",
                content: "You are a helpful AI assistant. Be friendly, concise, and helpful."
            }
        ];
    } catch (error) {
        console.error('Error creating session:', error);
        addMessage("Sorry, I encountered an error. Please try again.");
    }
}

function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isUser ? 'user-message' : 'bot-message');
    messageDiv.textContent = text;
    chatBody.appendChild(messageDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'bot-message', 'typing-indicator');
    typingDiv.id = 'typing-indicator';
    typingDiv.innerHTML = `
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
    `;
    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

async function getAIResponse(userMessage) {
    if (!sessionId) {
        await createSession();
        if (!sessionId) {
            return;
        }
    }

    // Add user message to history
    conversationHistory.push({
        role: "user",
        content: userMessage
    });

    showTypingIndicator();
    sendBtn.disabled = true;

    try {
        const response = await fetch(`/session/${sessionId}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: userMessage
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const aiMessage = data.response;

        // Add AI response to history
        conversationHistory.push({
            role: "assistant",
            content: aiMessage
        });

        hideTypingIndicator();
        addMessage(aiMessage);
    } catch (error) {
        hideTypingIndicator();
        console.error("Error fetching AI response:", error);
        addMessage("Sorry, I encountered an error. Please try again.");
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

function handleUserInput() {
    const message = userInput.value.trim();
    if (message) {
        addMessage(message, true);
        getAIResponse(message);
        userInput.value = '';
    }
}

function openHistoryModal() {
    // Clear previous history list
    historyList.innerHTML = '';

    // Populate history list with conversationHistory messages (skip system role)
    conversationHistory.forEach(msg => {
        if (msg.role === 'system') return;
        const li = document.createElement('li');
        li.textContent = msg.content;
        li.classList.add(msg.role === 'user' ? 'user' : 'bot');
        historyList.appendChild(li);
    });

    historyModal.style.display = 'flex';
}

function closeHistoryModal() {
    historyModal.style.display = 'none';
}

// Event Listeners
sendBtn.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserInput();
});

minimizeBtn.addEventListener('click', () => {
    isMinimized = !isMinimized;
    chatBody.classList.toggle('hidden');
    document.querySelector('.input-container').classList.toggle('hidden');
    minimizeBtn.textContent = isMinimized ? '+' : '−';
});

closeBtn.addEventListener('click', () => {
    document.querySelector('.chat-container').style.display = 'none';
});

viewHistoryBtn.addEventListener('click', openHistoryModal);
closeHistoryBtn.addEventListener('click', closeHistoryModal);

// Focus input on load
userInput.focus();
