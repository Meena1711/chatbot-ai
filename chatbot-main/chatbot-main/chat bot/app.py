from flask import Flask, request, jsonify, send_from_directory
import requests
import uuid
import json

app = Flask(__name__, static_folder='.', static_url_path='')

API_KEY = "AIzaSyBH5ztTs3jfjmtqJbNxlmJgNlbDYSAAoTk"
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
MODEL = None

# Store multiple chat sessions: {session_id: [messages]}
chat_sessions = {}

def create_new_session():
    session_id = str(uuid.uuid4())
    chat_sessions[session_id] = [
        {
            "role": "system",
            "content": "You are a helpful AI assistant. Be friendly, concise, and helpful."
        }
    ]
    return session_id

@app.route('/')
def serve_chatbot():
    return send_from_directory('.', 'ChatBot.html')

@app.route('/sessions', methods=['GET'])
def list_sessions():
    # Return list of session IDs
    return jsonify(list(chat_sessions.keys()))

@app.route('/session', methods=['POST'])
def new_session():
    session_id = create_new_session()
    return jsonify({"session_id": session_id})

@app.route('/session/<session_id>/chat', methods=['POST'])
def chat(session_id):
    if session_id not in chat_sessions:
        return jsonify({"error": "Invalid session ID"}), 404

    user_message = request.json.get('message')
    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    chat_sessions[session_id].append({"role": "user", "content": user_message})

    # Prepare Gemini API payload
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": chat_sessions[session_id][-1]["content"]
                    }
                ]
            }
        ]
    }
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": API_KEY
    }

    try:
        response = requests.post(API_URL, data=json.dumps(payload), headers=headers)
        response.raise_for_status()
        data = response.json()
        print("API response data:", data)  # Log full API response for debugging
        # Extract generated content from Gemini response
        ai_message = data.get("candidates", [{}])[0].get("content", "Sorry, I couldn't generate a response.")
        # If ai_message is a dict or object, extract text from parts array
        if isinstance(ai_message, dict):
            parts = ai_message.get("parts", [])
            if parts and isinstance(parts, list):
                ai_message = parts[0].get("text", str(ai_message))
            else:
                ai_message = str(ai_message)
        elif not isinstance(ai_message, str):
            ai_message = str(ai_message)
        chat_sessions[session_id].append({"role": "assistant", "content": ai_message})
        return jsonify({"response": ai_message})
    except requests.exceptions.HTTPError as http_err:
        error_content = response.text if response else 'No response content'
        error_message = f"HTTP error occurred: {http_err} - Response content: {error_content}"
        print(error_message)
        return jsonify({"error": error_message}), 500
    except Exception as e:
        error_message = f"Other error occurred: {str(e)}"
        print(error_message)
        return jsonify({"error": error_message}), 500

@app.route('/session/<session_id>/history', methods=['GET'])
def history(session_id):
    if session_id not in chat_sessions:
        return jsonify({"error": "Invalid session ID"}), 404
    filtered_history = [msg for msg in chat_sessions[session_id] if msg['role'] != 'system']
    return jsonify(filtered_history)

@app.route('/reset/<session_id>', methods=['POST'])
def reset(session_id):
    if session_id not in chat_sessions:
        return jsonify({"error": "Invalid session ID"}), 404
    chat_sessions[session_id] = [
        {
            "role": "system",
            "content": "You are a helpful AI assistant. Be friendly, concise, and helpful."
        }
    ]
    return jsonify({"message": "Conversation history reset."})

if __name__ == '__main__':
    app.run(debug=True)
