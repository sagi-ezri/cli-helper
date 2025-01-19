# **CLI Helper**

**CLI Helper** is a VSCode extension powered by OpenAI to analyze CLI command history, provide optimization suggestions, and improve your productivity. It features a Python backend with caching for efficiency.

---

## **Features**

- Analyze CLI history and suggest optimizations using OpenAI's GPT models.
- Cache results to reduce redundant API calls.
- Fully customizable: configure OpenAI API key, model, and CLI history file.

---

## **Getting Started**

### **Setup**

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/<your-username>/cli-helper.git
   cd cli-helper
   ```

2. **Setup Python Backend:**
   ```bash
   cd python-backend
   poetry install
   echo "OPENAI_API_KEY=your-openai-api-key" > .env
   poetry run python app.py
   ```

3. **Setup VSCode Extension:**
   ```bash
   cd ../src
   npm install
   ```

4. **Run the Extension:**
   - Open the project in VSCode.
   - Press `F5` to start debugging.

## **Usage**

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) in VSCode.
2. Select `CLI Helper: Analyze History` to analyze your CLI commands.
3. View optimization suggestions directly in VSCode.

## **License**

This project is licensed under the MIT License.
