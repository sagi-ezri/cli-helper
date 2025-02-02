import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fetch from 'node-fetch';

let pythonProcess: ChildProcessWithoutNullStreams | undefined;

/**
 * Fetches and analyzes CLI history using the Python backend.
 */
async function analyzeCLIHistory(context: vscode.ExtensionContext): Promise<void> {
    try {
        const response = await fetch('http://127.0.0.1:5000/analyze-history');
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            for (const result of data.results) {
                vscode.window.showInformationMessage(
                    `Command: ${result.command}\nSuggestions: ${result.suggestions}`
                );
            }
        } else if (data.error) {
            vscode.window.showErrorMessage(`Error: ${data.error}`);
        } else {
            vscode.window.showInformationMessage('No new optimizations available.');
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to fetch CLI history: ${error}`);
    }
}

/**
 * Starts the Python backend using Poetry.
 */
function startPythonBackend(context: vscode.ExtensionContext): void {
    try {
        pythonProcess = spawn('poetry', ['run', 'python', 'python-backend/app.py'], {
            cwd: context.extensionPath
        });

        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python Backend: ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Backend Error: ${data}`);
        });

        pythonProcess.on('error', (err) => {
            vscode.window.showErrorMessage(`Failed to start Python backend: ${err.message}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                vscode.window.showErrorMessage(`Python backend exited with code ${code}`);
            }
        });
    } catch (err) {
        vscode.window.showErrorMessage(`Error starting Python backend: ${err}`);
    }
}

/**
 * Activates the extension.
 */
export function activate(context: vscode.ExtensionContext): void {
    // Start the Python backend
    startPythonBackend(context);

    // Register the CLI Helper Analyze History command
    const disposableAnalyze = vscode.commands.registerCommand('cli-helper.analyzeHistory', () => {
        analyzeCLIHistory(context);
    });

    context.subscriptions.push(disposableAnalyze);

    // Optional: Automatically analyze CLI history on activation
    analyzeCLIHistory(context);
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = undefined;
    }
}
