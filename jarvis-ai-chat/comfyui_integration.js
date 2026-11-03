// ComfyUI Integration for Jarvis Chat
// Add this to your jarvis-ai-chat/index.html before </script>

// Configuration
const COMFYUI_BRIDGE_URL = 'http://localhost:7860';

// Enhanced fetchAIResponse with image support
async function fetchAIResponseWithImage() {
    const text = messageInput.value.trim();
    if (!text) return;

    // Check if user wants image generation
    const imageKeywords = ['create image', 'generate image', 'draw', 'paint', 'make image', 'image of'];
    const wantsImage = imageKeywords.some(keyword => text.toLowerCase().includes(keyword));

    if (wantsImage) {
        // Extract image prompt
        let imagePrompt = text;
        imageKeywords.forEach(keyword => {
            imagePrompt = imagePrompt.replace(new RegExp(keyword, 'gi'), '');
        });
        imagePrompt = imagePrompt.trim();

        // Show user message
        appendMessage("user", text);
        messageInput.value = "";
        
        // Show typing
        typingIndicator.classList.remove('hidden');
        chatContainer.scrollTop = chatContainer.scrollHeight;
        messageInput.disabled = true;
        sendBtn.disabled = true;

        try {
            // Call ComfyUI Bridge
            const response = await fetch(`${COMFYUI_BRIDGE_URL}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: imagePrompt,
                    width: 512,
                    height: 512
                })
            });

            const data = await response.json();

            if (data.success) {
                // Display image
                appendImageMessage(imagePrompt, `${COMFYUI_BRIDGE_URL}${data.path}`);
            } else {
                appendMessage("assistant", `Error generating image: ${data.error}`);
            }
        } catch (error) {
            appendMessage("assistant", `Failed to connect to ComfyUI Bridge. Make sure it's running on port 7860. Error: ${error.message}`);
        } finally {
            typingIndicator.classList.add('hidden');
            messageInput.disabled = false;
            sendBtn.disabled = false;
            messageInput.focus();
        }
    } else {
        // Regular chat - use OpenAI
        fetchAIResponse();
    }
}

// Function to display image in chat
function appendImageMessage(prompt, imageUrl) {
    const msgWrapper = document.createElement('div');
    msgWrapper.className = 'flex flex-col gap-1 w-full max-w-[85%] animate-message self-start';
    
    msgWrapper.innerHTML = `
        <div class="flex items-center gap-2 mb-1 ml-1 text-xs text-slate-400">
            <i class="fa-solid fa-robot text-cyan-400"></i> JARVIS-X
        </div>
        <div class="bg-slate-700/60 text-slate-100 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-md border border-slate-600/30 text-sm leading-relaxed">
            <p class="mb-3">I've created an image based on your request: "<em>${prompt}</em>"</p>
            <img src="${imageUrl}" alt="Generated Image" class="max-w-full rounded-lg border border-slate-600/50" style="max-height: 400px;" />
            <p class="mt-3 text-xs text-slate-400">Generated with ComfyUI via Stable Diffusion</p>
        </div>
    `;
    
    chatContainer.appendChild(msgWrapper);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Replace the original form submit handler
chatForm.removeEventListener('submit', null);
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    fetchAIResponseWithImage();
});

// Also handle enter key
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        fetchAIResponseWithImage();
    }
});
