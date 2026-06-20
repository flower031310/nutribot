document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // Smooth scrolling for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Chatbot Logic
    const addMessage = (text, sender) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        const avatar = document.createElement('div');
        avatar.classList.add('avatar');
        avatar.textContent = sender === 'ai' ? '🌿' : '👤';

        const textDiv = document.createElement('div');
        textDiv.classList.add('text');
        textDiv.textContent = text;

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(textDiv);

        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    };

    const getApiKey = async () => {
        try {
            const response = await fetch('env');
            const text = await response.text();
            const lines = text.split('\n');
            for (let line of lines) {
                if (line.trim().startsWith('VITE_GROQ_API_KEY=')) {
                    return line.split('=', 2)[1].trim();
                }
            }
        } catch (error) {
            console.error("Error reading env file:", error);
        }
        return null;
    };

    const generateAIResponse = async (userMessage) => {
        console.log("--- Starting AI Response Generation ---");
        console.log("User message:", userMessage);
        
        const apiKey = await getApiKey();
        
        if (!apiKey) {
            console.error("API key not found");
            return "API key not found";
        }
        
        console.log("API key found. Making request to Groq API...");
        
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: "You are a helpful AI Healthy Foods and Nutrients Assistant. Provide concise advice on nutrition." },
                        { role: "user", content: userMessage }
                    ]
                })
            });

            if (!response.ok) {
                console.error("Groq API Error:", response.status, response.statusText);
                return "I'm having trouble connecting to the AI right now. Please try again later!";
            }

            const data = await response.json();
            console.log("Received response from Groq API:", data);
            
            return data.choices[0].message.content;

        } catch (error) {
            console.error("Network or fetch error:", error);
            return "A network error occurred. Please check your connection and try again.";
        }
    };

    const handleSend = async () => {
        const text = chatInput.value.trim();
        if (text === '') return;

        // Add user message
        addMessage(text, 'user');
        chatInput.value = '';

        // Show typing indicator
        const typingId = showTypingIndicator();
        
        // Wait for real AI response
        const aiResponse = await generateAIResponse(text);
        
        // Remove typing indicator and show response
        removeTypingIndicator(typingId);
        addMessage(aiResponse, 'ai');
    };

    const showTypingIndicator = () => {
        const id = 'typing-' + Date.now();
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'ai');
        messageDiv.id = id;

        const avatar = document.createElement('div');
        avatar.classList.add('avatar');
        avatar.textContent = '🌿';

        const textDiv = document.createElement('div');
        textDiv.classList.add('text');
        textDiv.innerHTML = '<div class="typing-indicator"><span class="dot-typing"></span><span class="dot-typing"></span><span class="dot-typing"></span></div>';

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(textDiv);

        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
        
        return id;
    };

    const removeTypingIndicator = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.remove();
        }
    };

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });
});
