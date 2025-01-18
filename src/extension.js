import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fetch from 'node-fetch';

let pythonProcess: ChildProcessWithoutNullStreams | undefined;

interface AnalyzeHistoryResponse {
    results?: { command: string; suggestions: string }[];
    error?: string;
}

/**
 * Fetch and analyze CLI history from the Python backend.
 */
async function analyzeCLIHistory(context: vscode.ExtensionContext): Promise<void> {
    try {
        const response = await fetch('http://127.0.0.1:5000/analyze-history');
        if (!response.ok) {
            vscode.window.showErrorMessage(`Backend error: ${response.statusText}`);
            return;
        }

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error(`Invalid JSON response: ${e.message}`);
        }

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
        vscode.window.showErrorMessage(`Failed to fetch CLI history: ${error.message}`);
    }
}

/**
 * Start the Python backend using Poetry.
 */
function startPythonBackend(context: vscode.ExtensionContext): void {
    try {
        pythonProcess = spawn('poetry', ['run', 'python', 'python-backend/app.py'], {
            cwd: context.extensionPath
        });

        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python Backend: ${data.toString()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Backend Error: ${data.toString()}`);
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
        vscode.window.showErrorMessage(`Error starting Python backend: ${(err as Error).message}`);
    }
}

export function activate(context: vscode.ExtensionContext): void {
    console.log('CLI Helper extension is now active!');

    // Start the Python backend
    startPythonBackend(context);

    // Register CLI Helper Analyze History command
    const disposableAnalyze = vscode.commands.registerCommand('cli-helper.analyzeHistory', async () => {
        console.log('CLI Helper command triggered!');
        await analyzeCLIHistory(context);
    });

    context.subscriptions.push(disposableAnalyze);
}

export function deactivate(): void {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = undefined;
        console.log('Python backend process terminated.');
    }
}
