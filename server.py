import sys
import os
import json
import urllib.request
import urllib.error

from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_url_path='', static_folder='.')

# Load environment variables from 'env' file
env_path = 'env'
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('VITE_GROQ_API_KEY='):
                os.environ['VITE_GROQ_API_KEY'] = line.split('=', 1)[1].strip()

GROQ_API_KEY = os.environ.get('VITE_GROQ_API_KEY')

@app.route('/')
def root():
    return send_from_directory('.', 'index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    
    if not user_message:
        return jsonify({'response': 'Please provide a message.'}), 400
        
    try:
        if not GROQ_API_KEY:
            return jsonify({'response': 'Groq API key is missing. Please set VITE_GROQ_API_KEY in the env file.'}), 500
            
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": "You are a helpful, professional AI Healthy Foods and Nutrients Assistant. Provide concise, clear, and encouraging advice on nutrition, diets, and healthy eating habits."},
                {"role": "user", "content": user_message}
            ]
        }
        
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method="POST"
        )
        
        with urllib.request.urlopen(req) as response:
            groq_data = json.loads(response.read().decode('utf-8'))
            ai_response = groq_data['choices'][0]['message']['content']
        
        return jsonify({'response': ai_response})
    except urllib.error.HTTPError as e:
        print(f"Groq API Error: {e.read().decode('utf-8')}")
        return jsonify({'response': 'Sorry, the AI service encountered an error processing your request.'}), 500
    except Exception as e:
        print(f"Error processing message: {e}")
        return jsonify({'response': 'Sorry, I encountered an internal error processing your request.'}), 500

if __name__ == '__main__':
    print("Starting Nutribot Backend API with Groq...")
    app.run(port=5000, debug=False)
