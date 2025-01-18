from flask import Flask, request, jsonify
import openai
from diskcache import Cache
import os

app = Flask(__name__)

# Cache setup (7-day expiry)
cache = Cache('./cache')
cache.expire = 7 * 24 * 60 * 60

# Environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-default-api-key")
MODEL = os.getenv("MODEL", "gpt-4")
CLI_HISTORY_FILE = os.getenv("CLI_HISTORY_FILE", "./cli_history.txt")

@app.route('/set-config', methods=['POST'])
def set_config():
    """Set API token and model."""
    global OPENAI_API_KEY, MODEL
    data = request.json
    OPENAI_API_KEY = data.get("api_key", OPENAI_API_KEY)
    MODEL = data.get("model", MODEL)
    return jsonify({"message": "Configuration updated successfully!"})

@app.route('/analyze-history', methods=['GET'])
def analyze_history():
    """Analyze CLI history and provide suggestions."""
    try:
        openai.api_key = OPENAI_API_KEY
        with open(CLI_HISTORY_FILE, 'r') as f:
            history = f.readlines()

        results = []
        for command in history:
            command = command.strip()
            if not command or cache.get(command):
                continue

            response = openai.ChatCompletion.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": "You are a CLI assistant providing command optimizations."},
                    {"role": "user", "content": f"Analyze this command: {command}. Provide suggestions for improvement."}
                ]
            )
            suggestions = response.choices[0].message['content']
            cache[command] = suggestions
            results.append({"command": command, "suggestions": suggestions})

        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get-cached-results', methods=['GET'])
def get_cached_results():
    """Retrieve cached results."""
    return jsonify({"cached_results": [{"command": k, "suggestions": v} for k, v in cache.items()]})

if __name__ == "__main__":
    app.run(port=5000)
