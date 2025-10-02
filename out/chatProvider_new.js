"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerplexityCustomChatProvider = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
class PerplexityCustomChatProvider {
    _extensionUri;
    _context;
    static viewType = "perplexity-chatView";
    _view;
    _sessions = [];
    _currentSessionId;
    _messages = [];
    constructor(_extensionUri, _context) {
        this._extensionUri = _extensionUri;
        this._context = _context;
        console.log("PerplexityCustomChatProvider constructor called");
        this.loadChatHistory();
    }
    resolveWebviewView(webviewView, context, _token) {
        console.log("Resolving webview view for Perplexity chat");
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        // Set the HTML content
        console.log("Setting HTML content for webview");
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log("Received message from webview:", data.type);
            try {
                switch (data.type) {
                    case "sendMessage":
                        await this.handleUserMessage(data.value);
                        break;
                    case "newChat":
                        this.startNewChat();
                        break;
                    case "clearHistory":
                        this.clearHistory();
                        break;
                    case "selectSession":
                        this.selectSession(data.value);
                        break;
                    case "copyToClipboard":
                        await vscode.env.clipboard.writeText(data.value);
                        vscode.window.showInformationMessage("Copied to clipboard");
                        break;
                    case "insertAtCursor":
                        await this.insertAtCursor(data.value);
                        break;
                }
            }
            catch (error) {
                console.error("Error handling webview message:", error);
            }
        });
        // Load existing chat on startup
        console.log("Scheduling initial webview update");
        setTimeout(() => {
            console.log("Performing initial webview update");
            this.updateWebview();
        }, 100);
    }
    async handleUserMessage(message) {
        if (!message.trim())
            return;
        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) {
                this._view?.webview.postMessage({
                    type: "error",
                    error: "API key not configured. Please set up your Perplexity API key.",
                });
                return;
            }
            const response = await this.queryPerplexityAPI(apiKey, message);
            this._view?.webview.postMessage({
                type: "response",
                content: response,
            });
            // Save to history
            this._messages.push({ role: "user", content: message, timestamp: new Date() }, { role: "assistant", content: response, timestamp: new Date() });
            this.saveChatHistory();
        }
        catch (error) {
            this._view?.webview.postMessage({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    }
    addAssistantMessage(content) {
        const session = this._sessions.find((s) => s.id === this._currentSessionId);
        if (!session)
            return;
        const assistantMessage = {
            role: "assistant",
            content: content,
            timestamp: new Date(),
        };
        session.messages.push(assistantMessage);
        this.updateWebview();
        this.saveChatHistory();
    }
    startNewChat() {
        this._messages = [];
        this.saveChatHistory();
        this._view?.webview.postMessage({ type: "clearMessages" });
    }
    clearHistory() {
        this._messages = [];
        this.saveChatHistory();
        this._view?.webview.postMessage({ type: "clearMessages" });
    }
    selectSession(sessionId) {
        const session = this._sessions.find((s) => s.id === sessionId);
        if (session) {
            this._currentSessionId = sessionId;
            this.updateWebview();
        }
    }
    updateWebview(showTyping = false) {
        if (!this._view || !this._view.webview) {
            console.log("Webview not ready, skipping update");
            return;
        }
        try {
            const session = this._sessions.find((s) => s.id === this._currentSessionId);
            this._view.webview.postMessage({
                type: "updateChat",
                messages: session?.messages || [],
                sessions: this._sessions.map((s) => ({ id: s.id, title: s.title })),
                currentSessionId: this._currentSessionId,
                showTyping,
            });
        }
        catch (error) {
            console.error("Error updating webview:", error);
        }
    }
    async insertAtCursor(text) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            await editor.edit((editBuilder) => {
                editBuilder.replace(selection, text);
            });
        }
    }
    async getApiKey() {
        return await this._context.secrets.get("perplexity-api-key");
    }
    async queryPerplexityAPI(apiKey, prompt) {
        const config = vscode.workspace.getConfiguration("perplexityAI");
        const model = config.get("model", "llama-3.1-sonar-small-128k-online");
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "sonar",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1000,
                temperature: 0.2,
            }),
        });
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        return data.choices[0]?.message?.content || "No response received";
    }
    saveChatHistory() {
        this._context.globalState.update("perplexity-chat-history", this._sessions);
    }
    loadChatHistory() {
        const saved = this._context.globalState.get("perplexity-chat-history", []);
        this._sessions = saved;
        if (this._sessions.length > 0) {
            this._currentSessionId = this._sessions[0].id;
        }
    }
    _getHtmlForWebview(webview) {
        const nonce = getNonce();
        // Get the local path to the webview assets
        const webviewPath = vscode.Uri.joinPath(this._extensionUri, "src", "webview");
        // Convert to webview URIs
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewPath, "styles.css"));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(webviewPath, "script.js"));
        const htmlPath = vscode.Uri.joinPath(webviewPath, "index.html");
        try {
            // Read the HTML template
            const htmlContent = fs.readFileSync(htmlPath.fsPath, "utf8");
            // Replace placeholders with actual URIs
            return htmlContent
                .replace("{{CSS_URI}}", styleUri.toString())
                .replace("{{JS_URI}}", scriptUri.toString())
                .replace("{{NONCE}}", nonce);
        }
        catch (error) {
            console.error("Error loading webview files:", error);
            // Fallback to inline content if files don't exist
            return this._getFallbackHtml(webview, nonce);
        }
    }
    _getFallbackHtml(webview, nonce) {
        return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Perplexity AI Chat</title>
        <style>
            body { 
                font-family: var(--vscode-font-family); 
                padding: 20px; 
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
            }
        </style>
    </head>
    <body>
        <h3>Error loading webview files</h3>
        <p>Please check that the webview files exist in src/webview/</p>
    </body>
    </html>`;
    }
}
exports.PerplexityCustomChatProvider = PerplexityCustomChatProvider;
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=chatProvider_new.js.map