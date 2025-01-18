import * as vscode from 'vscode';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

let pythonProcess: any;

async function analyzeCLIHistory(context: vscode.ExtensionContext) {
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
}

export function activate(context: vscode.ExtensionContext) {
    pythonProcess = spawn('poetry', ['run', 'python', 'python-backend/app.py'], {
        cwd: context.extensionPath
    });

    pythonProcess.stdout.on('data', (data: any) => console.log(`Python Backend: ${data}`));
    pythonProcess.stderr.on('data', (data: any) => console.error(`Python Backend Error: ${data}`));

    const disposableAnalyze = vscode.commands.registerCommand('cli-helper.analyzeHistory', () => {
        analyzeCLIHistory(context);
    });

    context.subscriptions.push(disposableAnalyze);

    analyzeCLIHistory(context);
}

export function deactivate() {
    if (pythonProcess) {
        pythonProcess.kill();
    }
}
