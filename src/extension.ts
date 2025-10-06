import * as vscode from "vscode";
import { simpleGit } from "simple-git";

const MODEL = "mistralai/mistral-7b-instruct";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

interface OpenRouterResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "commitGenie.generate",
    async () => {
      const git = simpleGit(vscode.workspace.rootPath || ".");
      const diff = await git.diff(["--cached"]);

      if (!diff) {
        vscode.window.showInformationMessage("No staged changes found.");
        return;
      }

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating commit message...",
        },
        async () => {
          try {
            const prompt = `
You are an expert software engineer. Generate a short, descriptive Conventional Commit message based on this diff:
${diff}

Use the format: type(scope?): description
Example: feat(auth): add token refresh logic
`;

            const response = await fetch(
              "https://openrouter.ai/api/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({
                  model: MODEL,
                  messages: [{ role: "user", content: prompt }],
                }),
              }
            );

            const data = (await response.json()) as OpenRouterResponse;
            const message = data.choices?.[0]?.message?.content?.trim();

            if (!message) {
              throw new Error("No response from model");
            }

            // Copy to clipboard or open in input box
            await vscode.env.clipboard.writeText(message);
            vscode.window.showInformationMessage(
              `✅ Commit message copied: "${message}"`
            );
          } catch (err: any) {
            vscode.window.showErrorMessage(`Error: ${err.message}`);
          }
        }
      );
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
