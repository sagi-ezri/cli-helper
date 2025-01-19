from flask import Flask, request, jsonify
from openai import OpenAI
import os
from diskcache import Cache
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Cache setup
CACHE_DIR = os.getenv("CACHE_DIR", os.path.abspath("./cache"))
CACHE_EXPIRY = int(os.getenv("CACHE_EXPIRY", 7 * 24 * 60 * 60))

try:
    cache = Cache(CACHE_DIR)
    cache.expire = CACHE_EXPIRY
except Exception as e:
    logger.exception(f"Failed to initialize cache: {e}")
    cache = None

# Environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = os.getenv("MODEL", "gpt-4o-mini")
CLI_HISTORY_FILE = os.getenv("CLI_HISTORY_FILE", "./cli_history.txt")

client = OpenAI(api_key=OPENAI_API_KEY)


@app.route('/analyze-history', methods=['GET'])
def analyze_history():
    """Analyze CLI history and provide suggestions."""
    try:
        if not os.path.exists(CLI_HISTORY_FILE):
            error_message = f"CLI history file not found: {CLI_HISTORY_FILE}"
            logger.error(error_message)
            return jsonify({"error": error_message}), 400

        with open(CLI_HISTORY_FILE, 'r') as f:
            history = f.readlines()

        results = []
        for command in history:
            command = command.strip()
            if not command:
                continue

            if cache and cache.get(command):
                logger.debug(f"Command '{command}' found in cache. Skipping.")
                continue

            try:
                # Simulate OpenAI API response
                suggestions = f"Suggestions for: {command}"
                results.append({"command": command, "suggestions": suggestions})
                if cache:
                    cache[command] = suggestions
            except Exception as e:
                logger.error(f"Error processing command '{command}': {e}")
                results.append({"command": command, "suggestions": "Error processing command."})

        logger.info(f"Processed {len(results)} commands.")
        return jsonify({"results": results}), 200

    except Exception as e:
        logger.exception("Error in /analyze-history endpoint.")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    try:
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR, exist_ok=True)
        logger.info(f"Cache directory: {CACHE_DIR}")

        app.run(port=5000, debug=True)
    except Exception as e:
        logger.exception(f"Failed to start server: {e}")
