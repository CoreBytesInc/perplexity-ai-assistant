"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const chatProvider_1 = require("./chatProvider");
const settingsProvider_1 = require("./settingsProvider");
const path = __importStar(require("path"));
function activate(context) {
    console.log("Perplexity AI extension is now active!");
    // Set context variable
    vscode.commands.executeCommand("setContext", "perplexity-ai.enabled", true);
    // Initialize providers
    console.log("Initializing chat provider");
    const chatProvider = new chatProvider_1.PerplexityCustomChatProvider(context.extensionUri, context);
    console.log("Initializing settings provider");
    const settingsProvider = new settingsProvider_1.PerplexitySettingsProvider(context.extensionUri, context);
    // Register webview providers
    console.log("Registering webview view provider");
    const registration = vscode.window.registerWebviewViewProvider(chatProvider_1.PerplexityCustomChatProvider.viewType, chatProvider, {
        webviewOptions: {
            retainContextWhenHidden: true,
        },
    });
    context.subscriptions.push(registration);
    console.log("Webview view provider registered successfully");
    // Register commands
    const commands = [
        vscode.commands.registerCommand("perplexity-ai.ask", () => askPerplexity(context)),
        vscode.commands.registerCommand("perplexity-ai.testView", async () => {
            console.log("Testing view command called");
            await vscode.commands.executeCommand("workbench.view.extension.perplexity-chat");
            console.log("View command completed");
        }),
        vscode.commands.registerCommand("perplexity-ai.showView", async () => {
            console.log("Show view command called - forcing view to be visible");
            try {
                // Try to force the view to show
                await vscode.commands.executeCommand("workbench.view.extension.perplexity-chat");
                await new Promise((resolve) => setTimeout(resolve, 200));
                await vscode.commands.executeCommand("perplexity-chatView.focus");
                console.log("View should now be visible and focused");
            }
            catch (error) {
                console.log("Error showing view:", error);
            }
        }),
        vscode.commands.registerCommand("perplexity-ai.askStreaming", () => askPerplexityWithStreaming(context)),
        vscode.commands.registerCommand("perplexity-ai.askWithFileContext", () => askWithFileContext(context)),
        vscode.commands.registerCommand("perplexity-ai.askWithWorkspaceContext", () => askWithWorkspaceContext(context)),
        vscode.commands.registerCommand("perplexity-ai.explainCode", () => explainSelectedCode(context)),
        vscode.commands.registerCommand("perplexity-ai.optimizeCode", () => optimizeCode(context)),
        vscode.commands.registerCommand("perplexity-ai.findBugs", () => findBugs(context)),
        vscode.commands.registerCommand("perplexity-ai.generateComments", () => generateComments(context)),
        vscode.commands.registerCommand("perplexity-ai.refactorCode", () => refactorCode(context)),
        vscode.commands.registerCommand("perplexity-ai.openSettings", () => settingsProvider.show()),
        vscode.commands.registerCommand("perplexity-ai.newChat", async () => {
            console.log("newChat command called");
            // First try to ensure the activity bar view container is shown
            try {
                console.log("Attempting to show activity bar view container");
                await vscode.commands.executeCommand("workbench.view.extension.perplexity-chat");
                console.log("Activity bar view container command completed");
            }
            catch (error) {
                console.log("Could not show activity bar view container:", error);
            }
            // Wait a moment for the view to initialize
            await new Promise((resolve) => setTimeout(resolve, 500));
            // Then try to focus the specific view
            try {
                console.log("Attempting to focus perplexity-chatView");
                await vscode.commands.executeCommand("perplexity-chatView.focus");
                console.log("Focus command completed");
            }
            catch (error) {
                console.log("Could not focus view:", error);
            }
            // Start a new chat
            console.log("Starting new chat");
            chatProvider.startNewChat();
        }),
        vscode.commands.registerCommand("perplexity-ai.clearHistory", () => {
            if (chatProvider.clearHistory) {
                chatProvider.clearHistory();
            }
            else {
                vscode.window.showInformationMessage("Chat history cleared!");
            }
        }),
        vscode.commands.registerCommand("perplexity-ai.chatHistory", () => {
            if (chatProvider.showChatHistory) {
                chatProvider.showChatHistory();
            }
            else {
                vscode.window.showInformationMessage("Chat history feature not available!");
            }
        }),
    ];
    context.subscriptions.push(...commands);
}
// Enhanced code analysis functions
async function optimizeCode(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText) {
        vscode.window.showWarningMessage("No code selected");
        return;
    }
    const apiKey = await getApiKey(context);
    if (!apiKey)
        return;
    const prompt = `Optimize this code for better performance and readability. Provide the optimized version with explanations:

\`\`\`${editor.document.languageId}
${selectedText}
\`\`\``;
    await executeCodeCommand(apiKey, prompt, "Code Optimization");
}
async function findBugs(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText) {
        vscode.window.showWarningMessage("No code selected");
        return;
    }
    const apiKey = await getApiKey(context);
    if (!apiKey)
        return;
    const prompt = `Analyze this code for potential bugs, security issues, and code smells. Provide detailed explanations and fixes:

\`\`\`${editor.document.languageId}
${selectedText}
\`\`\``;
    await executeCodeCommand(apiKey, prompt, "Bug Analysis");
}
async function generateComments(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText) {
        vscode.window.showWarningMessage("No code selected");
        return;
    }
    const apiKey = await getApiKey(context);
    if (!apiKey)
        return;
    const prompt = `Add comprehensive comments and documentation to this code. Include function descriptions, parameter explanations, and inline comments:

\`\`\`${editor.document.languageId}
${selectedText}
\`\`\``;
    await executeCodeCommand(apiKey, prompt, "Code Documentation");
}
async function refactorCode(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText) {
        vscode.window.showWarningMessage("No code selected");
        return;
    }
    const apiKey = await getApiKey(context);
    if (!apiKey)
        return;
    const prompt = `Refactor this code following best practices. Improve code structure, naming conventions, and maintainability:

\`\`\`${editor.document.languageId}
${selectedText}
\`\`\``;
    await executeCodeCommand(apiKey, prompt, "Code Refactoring");
}
// Helper function for code-related commands
async function executeCodeCommand(apiKey, prompt, title) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `${title} in progress...`,
        cancellable: false,
    }, async (progress) => {
        try {
            const response = await queryPerplexityAPI(apiKey, prompt);
            showResponseInNewDocument(response, title);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });
}
// Updated explainSelectedCode to use the helper
async function explainSelectedCode(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText) {
        vscode.window.showWarningMessage("No code selected");
        return;
    }
    const apiKey = await getApiKey(context);
    if (!apiKey)
        return;
    const prompt = `Explain this code in detail, including what it does, how it works, and any important concepts:

\`\`\`${editor.document.languageId}
${selectedText}
\`\`\``;
    await executeCodeCommand(apiKey, prompt, "Code Explanation");
}
// API Key management
async function getApiKey(context) {
    let apiKey = await context.secrets.get("perplexity-api-key");
    if (!apiKey) {
        apiKey = await vscode.window.showInputBox({
            prompt: "Enter your Perplexity API Key",
            password: true,
            ignoreFocusOut: true,
        });
        if (apiKey) {
            await context.secrets.store("perplexity-api-key", apiKey);
        }
    }
    return apiKey;
}
async function askPerplexity(context) {
    const apiKey = await getApiKey(context);
    if (!apiKey) {
        vscode.window.showErrorMessage("API Key is required");
        return;
    }
    const question = await vscode.window.showInputBox({
        prompt: "Ask Perplexity AI anything...",
        ignoreFocusOut: true,
    });
    if (!question)
        return;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Querying Perplexity AI...",
        cancellable: false,
    }, async (progress) => {
        try {
            const response = await queryPerplexityAPI(apiKey, question);
            showResponseInNewDocument(response, question);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });
}
// Main ask function
async function askPerplexityWithStreaming(context) {
    const apiKey = await getApiKey(context);
    if (!apiKey) {
        vscode.window.showErrorMessage("API Key is required");
        return;
    }
    const question = await vscode.window.showInputBox({
        prompt: "Ask Perplexity AI anything...",
        ignoreFocusOut: true,
    });
    if (!question)
        return;
    // Create a new document for streaming response
    const doc = await vscode.workspace.openTextDocument({
        content: `# ${question}\n\n`,
        language: "markdown",
    });
    const editor = await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.Beside,
    });
    let responseContent = "";
    try {
        await queryPerplexityAPIStream(apiKey, question, 
        // onChunk callback - called for each piece of text
        (chunk) => {
            responseContent += chunk;
            // Update the document with new content
            editor.edit((editBuilder) => {
                const fullContent = `# ${question}\n\n${responseContent}`;
                const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
                editBuilder.replace(fullRange, fullContent);
            });
            // Auto-scroll to bottom
            const lastLine = editor.document.lineCount - 1;
            const lastPos = new vscode.Position(lastLine, 0);
            editor.revealRange(new vscode.Range(lastPos, lastPos));
        }, 
        // onComplete callback - called when streaming finishes
        () => {
            vscode.window.showInformationMessage("Response complete!");
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Streaming error: ${error}`);
        // Fallback to non-streaming if streaming fails
        try {
            const response = await queryPerplexityAPI(apiKey, question);
            const fallbackContent = `# ${question}\n\n${response}\n\n*Note: Streamed response failed, showing complete response*`;
            editor.edit((editBuilder) => {
                const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
                editBuilder.replace(fullRange, fallbackContent);
            });
        }
        catch (fallbackError) {
            vscode.window.showErrorMessage(`Complete request also failed: ${fallbackError}`);
        }
    }
}
async function askWithFileContext(context) {
    const apiKey = await getApiKey(context);
    if (!apiKey) {
        vscode.window.showErrorMessage("API Key is required");
        return;
    }
    const question = await vscode.window.showInputBox({
        prompt: "Ask about the current file...",
        ignoreFocusOut: true,
    });
    if (!question)
        return;
    const editor = vscode.window.activeTextEditor;
    let contextPrompt = question;
    if (editor) {
        const fileName = path.basename(editor.document.fileName);
        const fileContent = editor.document.getText();
        const language = editor.document.languageId;
        // Limit file content if too large
        const maxContentLength = 5000;
        const truncatedContent = fileContent.length > maxContentLength
            ? fileContent.substring(0, maxContentLength) +
                "\n\n... (file truncated)"
            : fileContent;
        contextPrompt = `I'm working on a ${language} file called "${fileName}". Here's the current file content:

\`\`\`${language}
${truncatedContent}
\`\`\`

Question: ${question}`;
    }
    else {
        vscode.window.showWarningMessage("No active editor found. Using question without file context.");
    }
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Analyzing file and querying Perplexity AI...",
        cancellable: false,
    }, async (progress) => {
        try {
            const response = await queryPerplexityAPI(apiKey, contextPrompt);
            showResponseInNewDocument(response, `File Analysis: ${question}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error: ${error}`);
        }
    });
}
async function askWithWorkspaceContext(context) {
    const apiKey = await getApiKey(context);
    if (!apiKey) {
        vscode.window.showErrorMessage("API Key is required");
        return;
    }
    const question = await vscode.window.showInputBox({
        prompt: "Ask about your workspace/project...",
        ignoreFocusOut: true,
    });
    if (!question)
        return;
    // Get workspace information
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showWarningMessage("No workspace folder open");
        return;
    }
    try {
        // Get package.json if it exists
        const packageJsonUri = vscode.Uri.joinPath(workspaceFolders[0].uri, "package.json");
        let projectInfo = "";
        try {
            const packageJson = await vscode.workspace.fs.readFile(packageJsonUri);
            const packageData = JSON.parse(packageJson.toString());
            projectInfo = `Project: ${packageData.name || "Unknown"}
Description: ${packageData.description || "No description"}
Version: ${packageData.version || "Unknown"}
Dependencies: ${Object.keys(packageData.dependencies || {}).join(", ") || "None"}
Dev Dependencies: ${Object.keys(packageData.devDependencies || {}).join(", ") || "None"}`;
        }
        catch {
            projectInfo =
                "No package.json found or unable to read project information";
        }
        // Get file structure (limited to prevent token overflow)
        const files = await vscode.workspace.findFiles("**/*.{js,ts,jsx,tsx,py,java,cs,cpp,h,html,css,md,json}", "**/node_modules/**", 50);
        const fileList = files
            .map((file) => path.relative(workspaceFolders[0].uri.fsPath, file.fsPath))
            .slice(0, 30) // Limit to first 30 files
            .join("\n");
        // Get README if it exists
        let readmeContent = "";
        try {
            const readmeUri = vscode.Uri.joinPath(workspaceFolders[0].uri, "README.md");
            const readme = await vscode.workspace.fs.readFile(readmeUri);
            readmeContent = readme.toString().substring(0, 1000); // First 1000 chars
        }
        catch {
            // README doesn't exist, that's okay
        }
        const contextPrompt = `I'm working on a project with the following information:

## Project Information
${projectInfo}

## Key Files in Project (showing up to 30 files)
${fileList}

${readmeContent
            ? `## README Content (first 1000 characters)\n${readmeContent}`
            : ""}

## Question
${question}`;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Analyzing workspace and querying Perplexity AI...",
            cancellable: false,
        }, async (progress) => {
            const response = await queryPerplexityAPI(apiKey, contextPrompt);
            showResponseInNewDocument(response, `Workspace Analysis: ${question}`);
        });
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error analyzing workspace: ${error}`);
    }
}
// Streaming function using fetch with ReadableStream
async function queryPerplexityAPIStream(apiKey, prompt, onChunk, onComplete) {
    const config = vscode.workspace.getConfiguration("perplexityAI");
    const model = config.get("model", "llama-3.1-sonar-small-128k-online");
    const maxTokens = config.get("maxTokens", 1000);
    try {
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: prompt }],
                max_tokens: maxTokens,
                temperature: 0.2,
                stream: true, // Enable streaming
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API request failed: ${response.status} ${response.statusText}\nDetails: ${errorText}`);
        }
        // Check if response body exists
        if (!response.body) {
            throw new Error("Response body is null");
        }
        // Create a reader for the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    onComplete?.();
                    break;
                }
                // Decode the chunk
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
                // Process each line
                for (const line of lines) {
                    if (line.startsWith("data: ") && !line.includes("[DONE]")) {
                        try {
                            const jsonStr = line.slice(6); // Remove 'data: ' prefix
                            if (jsonStr.trim()) {
                                const data = JSON.parse(jsonStr);
                                const content = data.choices?.[0]?.delta?.content;
                                if (content) {
                                    onChunk(content);
                                }
                            }
                        }
                        catch (parseError) {
                            // Ignore JSON parsing errors for incomplete chunks
                            console.warn("Failed to parse streaming chunk:", parseError);
                        }
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    catch (error) {
        throw new Error(`Failed to stream from Perplexity API: ${error}`);
    }
}
// API call to Perplexity
async function queryPerplexityAPI(apiKey, prompt) {
    const config = vscode.workspace.getConfiguration("perplexityAI");
    const model = config.get("model", "sonar");
    const maxTokens = config.get("maxTokens", 1000);
    try {
        const response = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: `sonar`,
                messages: [{ role: "user", content: prompt }],
                max_tokens: maxTokens,
                temperature: 0.2,
                stream: false,
            }),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API Error Response: ${errorBody}`);
            throw new Error(errorBody);
        }
        const data = (await response.json());
        return data.choices[0]?.message?.content || "No response received";
    }
    catch (error) {
        throw new Error(`Failed to query Perplexity API - ${error}`);
    }
}
// Show response in new document
async function showResponseInNewDocument(content, title) {
    const doc = await vscode.workspace.openTextDocument({
        content: `# ${title}\n\n${content}`,
        language: "markdown",
    });
    await vscode.window.showTextDocument(doc, {
        viewColumn: vscode.ViewColumn.Beside,
    });
}
// Chat view provider (basic implementation)
class PerplexityChatProvider {
    context;
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    constructor(context) {
        this.context = context;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return Promise.resolve([
                new ChatItem("Start a new conversation", "Click to ask Perplexity AI", vscode.TreeItemCollapsibleState.None),
            ]);
        }
        return Promise.resolve([]);
    }
}
class ChatItem extends vscode.TreeItem {
    label;
    tooltip;
    collapsibleState;
    constructor(label, tooltip, collapsibleState) {
        super(label, collapsibleState);
        this.label = label;
        this.tooltip = tooltip;
        this.collapsibleState = collapsibleState;
        this.tooltip = tooltip;
    }
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map