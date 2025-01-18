from flask import Flask, request, jsonify, stream_with_context, Response
from openai import OpenAI
import os
from diskcache import Cache
from dotenv import load_dotenv
import logging

# Load environment variables from .env
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Cache setup (7-day expiry)
CACHE_DIR = os.getenv("CACHE_DIR", "./cache")
CACHE_EXPIRY = int(os.getenv("CACHE_EXPIRY", 7 * 24 * 60 * 60))
cache = Cache(CACHE_DIR)
cache.expire = CACHE_EXPIRY

# Environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = os.getenv("MODEL", "gpt-4o-mini")
CLI_HISTORY_FILE = os.getenv("CLI_HISTORY_FILE", "./cli_history.txt")

# OpenAI client
client = OpenAI(api_key=OPENAI_API_KEY)


@app.route('/set-config', methods=['POST'])
def set_config():
    """Set or update configuration for OpenAI API key and model."""
    global OPENAI_API_KEY, MODEL
    try:
        data = request.json
        if not data:
            raise ValueError("No configuration data provided.")

        OPENAI_API_KEY = data.get("api_key", OPENAI_API_KEY)
        MODEL = data.get("model", MODEL)
        client.api_key = OPENAI_API_KEY

        logger.info("Configuration updated: API Key and Model")
        return jsonify({"message": "Configuration updated successfully!"}), 200
    except Exception as e:
        logger.error(f"Error updating configuration: {e}")
        return jsonify({"error": str(e)}), 400


@app.route('/analyze-history', methods=['GET'])
def analyze_history():
    """Analyze CLI history and provide suggestions."""
    try:
        if not os.path.exists(CLI_HISTORY_FILE) or os.path.getsize(CLI_HISTORY_FILE) == 0:
            error_message = f"CLI history file is missing or empty: {CLI_HISTORY_FILE}"
            logger.warning(error_message)
            return jsonify({"error": error_message}), 400

        with open(CLI_HISTORY_FILE, 'r') as f:
            history = f.readlines()

        results = []
        for command in history:
            command = command.strip()
            if not command or cache.get(command):
                continue

            logger.debug(f"Processing command: {command}")

            try:
                # Simulate OpenAI API response for debugging
                suggestions = f"Suggestions for: {command}"
                results.append({"command": command, "suggestions": suggestions})
                cache[command] = suggestions
            except Exception as e:
                logger.error(f"Error processing command '{command}': {e}")
                results.append({"command": command, "suggestions": "Error processing command."})

        return jsonify({"results": results}), 200

    except Exception as e:
        logger.exception("Error in /analyze-history endpoint.")
        return jsonify({"error": str(e)}), 500


@app.route('/get-cached-results', methods=['GET'])
def get_cached_results():
    """Retrieve cached results."""
    try:
        cached_results = [{"command": key, "suggestions": cache[key]} for key in cache.iterkeys()]
        return jsonify({"cached_results": cached_results}), 200
    except Exception as e:
        logger.exception("Error retrieving cached results.")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    try:
        logger.info("Starting Flask server...")
        app.run(port=5000, debug=True)
    except Exception as e:
        logger.exception(f"Failed to start Flask server: {e}")
