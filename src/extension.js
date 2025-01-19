import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import fetch from 'node-fetch';

let pythonProcess: ChildProcessWithoutNullStreams | undefined;

/**
 * Wait for the backend to be ready by attempting to fetch the /analyze-history endpoint.
 */
async function waitForBackendReady(): Promise<void> {
    const maxRetries = 10;
    let retries = 0;

    while (retries < maxRetries) {
        try {
            const response = await fetch('http://127.0.0.1:5000/analyze-history');
            if (response.ok) {
                console.log("Backend is ready.");
                return;
            }
        } catch (error) {
            console.log(`Waiting for backend... (${retries + 1}/${maxRetries})`);
        }

        retries++;
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
    }

    throw new Error("Backend not ready after 10 retries.");
}

/**
 * Fetch and analyze CLI history from the backend.
 */
async function analyzeCLIHistory(context: vscode.ExtensionContext): Promise<void> {
    try {
        await waitForBackendReady();

        const response = await fetch('http://127.0.0.1:5000/analyze-history');
        if (!response.ok) {
            vscode.window.showErrorMessage(`Backend error: ${response.statusText}`);
            return;
        }

        let data;
        try {
            data = await response.json();
        } catch (error) {
            throw new Error(`Invalid JSON response: ${error.message}`);
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
        console.log("Starting Python backend...");
        pythonProcess = spawn('poetry', ['run', 'python', 'python-backend/app.py'], {
            cwd: context.extensionPath,
        });

        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python Backend: ${data.toString()}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python Backend Error: ${data.toString()}`);
        });

        pythonProcess.on('error', (err) => {
            console.error(`Failed to start Python backend: ${err.message}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`Python backend exited with code ${code}`);
            }
        });
    } catch (err) {
        vscode.window.showErrorMessage(`Error starting Python backend: ${(err as Error).message}`);
    }
}

/**
 * Activate the extension.
 */
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

/**
 * Deactivate the extension.
 */
export function deactivate(): void {
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = undefined;
        console.log('Python backend process terminated.');
    }
}
