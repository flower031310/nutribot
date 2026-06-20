document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const voiceOutputBtn = document.getElementById('voice-output-btn');
    const micBtn = document.getElementById('mic-btn');
    const imageUpload = document.getElementById('image-upload');
    const landingOverview = document.getElementById('landing-overview');
    const appContent = document.getElementById('app-content');
    const enterAppBtn = document.getElementById('enter-app-btn');

    let isVoiceOutputEnabled = true;
    let selectedImageBase64 = null;

    // --- Landing Page Transition ---
    if (enterAppBtn) {
        enterAppBtn.addEventListener('click', () => {
            landingOverview.classList.add('hidden');
            appContent.classList.remove('hidden');
            void appContent.offsetWidth; // Force reflow
            appContent.style.opacity = '1';
        });
    }

    // --- Feature 1: Dark Mode Toggle ---
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeToggle) themeToggle.textContent = '☀️';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeToggle.textContent = isDark ? '☀️' : '🌙';
        });
    }

    // --- Feature 2: PDF Export ---
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', () => {
            const element = document.getElementById('chat-window');
            const opt = {
                margin:       10,
                filename:     'NutriBot-Diet-Plan.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            if (window.html2pdf) {
                html2pdf().set(opt).from(element).save();
            } else {
                alert("PDF export library is still loading. Please try again.");
            }
        });
    }

    // --- Feature 3: Voice Assistant ---
    if (voiceOutputBtn) {
        voiceOutputBtn.addEventListener('click', () => {
            isVoiceOutputEnabled = !isVoiceOutputEnabled;
            voiceOutputBtn.classList.toggle('active', isVoiceOutputEnabled);
            voiceOutputBtn.textContent = isVoiceOutputEnabled ? '🔊' : '🔇';
        });
    }

    const speakText = (text) => {
        if (!isVoiceOutputEnabled) return;
        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        synth.speak(utterance);
    };

    let recognition;
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            if (micBtn) micBtn.classList.add('listening');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            chatInput.value = transcript;
            if (micBtn) micBtn.classList.remove('listening');
            handleSend(); // Auto-send after speaking
        };

        recognition.onerror = () => {
            if (micBtn) micBtn.classList.remove('listening');
        };

        recognition.onend = () => {
            if (micBtn) micBtn.classList.remove('listening');
        };
    } else {
        if (micBtn) micBtn.style.display = 'none'; // Hide if not supported
    }

    if (micBtn) {
        micBtn.addEventListener('click', () => {
            if (recognition) {
                recognition.start();
            }
        });
    }

    // --- Feature 4: Meal Vision AI (Image Upload) ---
    if (imageUpload) {
        imageUpload.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    selectedImageBase64 = e.target.result;
                    chatInput.placeholder = "Image selected! Ask a question about it...";
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Smooth scrolling for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // --- Scroll Animations (Intersection Observer) ---
    const revealElements = document.querySelectorAll('.reveal');
    const revealOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
    const revealOnScroll = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);
    
    revealElements.forEach(el => revealOnScroll.observe(el));

    // Chatbot Logic
    const addMessage = (text, sender, imageUrl = null) => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);

        const avatar = document.createElement('div');
        avatar.classList.add('avatar');
        avatar.textContent = sender === 'ai' ? '🌿' : '👤';

        const textDiv = document.createElement('div');
        textDiv.classList.add('text');
        
        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.classList.add('uploaded-image');
            textDiv.appendChild(img);
        }
        
        if (text) {
            if (sender === 'ai' && window.marked) {
                textDiv.innerHTML += marked.parse(text);
            } else {
                const p = document.createElement('p');
                p.textContent = text;
                textDiv.appendChild(p);
            }
        }

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

    const generateAIResponse = async (userMessage, imageBase64) => {
        const apiKey = await getApiKey();
        if (!apiKey) return "API key not found";
        
        try {
            let modelName = "llama-3.3-70b-versatile";
            let messages = [
                { role: "system", content: "You are NutriBot, an AI Healthy Foods and Nutrients Assistant. Provide concise advice on nutrition without formatting with markdown asterisks if possible, so it speaks well. CRITICAL: When recommending foods, creating a diet plan, or providing a food chart, ALWAYS format it as a Markdown Table. Include a column named 'Image' for the food picture. For the image URL, use Markdown image syntax: ![FoodName](https://image.pollinations.ai/prompt/{FoodName}?width=200&height=200). Replace {FoodName} with the actual name of the food encoded for a URL." }
            ];

            if (imageBase64) {
                modelName = "llama-3.2-11b-vision-preview";
                messages.push({
                    role: "user",
                    content: [
                        { type: "text", text: userMessage || "What food is in this image and what are its nutritional facts?" },
                        { type: "image_url", image_url: { url: imageBase64 } }
                    ]
                });
            } else {
                messages.push({ role: "user", content: userMessage });
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({ model: modelName, messages: messages })
            });

            if (!response.ok) return "I'm having trouble connecting to the AI right now.";

            const data = await response.json();
            return data.choices[0].message.content;

        } catch (error) {
            console.error(error);
            return "A network error occurred. Please check your connection.";
        }
    };

    const handleSend = async () => {
        const text = chatInput.value.trim();
        if (text === '' && !selectedImageBase64) return;

        const currentImage = selectedImageBase64;
        addMessage(text, 'user', currentImage);
        
        chatInput.value = '';
        chatInput.placeholder = "Type or say your question here...";
        selectedImageBase64 = null; // Reset image

        const typingId = showTypingIndicator();
        
        const aiResponse = await generateAIResponse(text, currentImage);
        
        removeTypingIndicator(typingId);
        addMessage(aiResponse, 'ai');
        speakText(aiResponse); // Read out loud
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
        if (el) el.remove();
    };

    if (sendBtn) sendBtn.addEventListener('click', handleSend);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }
});
