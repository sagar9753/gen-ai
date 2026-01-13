import { GoogleGenAI } from "@google/genai";
import { Type } from '@google/genai';
import readlineSync from 'readline-sync'
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

const ai = new GoogleGenAI({ apiKey: "AIzaSyBZORNsjvEfEXMsA6YV4AwffoiHHKZttJA" });

const content = []


async function commandsRunner({ commands }) {
    let results = [];

    for (const command of commands) {
        try {
            console.log("\n▶ Executing:", command);
            const { stdout, stderr } = await execAsync(command);

            if (stderr) {
                results.push(`❌ Error (${command}): ${stderr}`);
                console.log("Error:", stderr);
            } else {
                results.push(`✅ Success (${command})`);
                console.log("Output:", stdout);
            }
        } catch (err) {
            results.push(`❌ Failed (${command}): ${err.message}`);
            console.log("Error:", err.message);
        }
    }

    return results.join("\n");
}

const commandsRunnerFunctionDeclaration = {
    name: 'commandsRunner',
    description: 'Execute multiple shell/terminal commands in sequence.The commands can be to create a folder or file, write on a file, edit a file or delete a file',
    parameters: {
        type: Type.OBJECT,
        properties: {
            commands: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                },
                description: 'It will be an array of terminal/shell commands compatible with the user os. Ex. ["mkdir genAi","touch genAi/index.html",....]',
            },

        },
        required: ['commands'],
    }
}
const availableTools = { commandsRunner }

const config = {
    systemInstruction: `You are an website builder expert.You have to create create the frontend of the website by analysing the user Input.You have access of the tool, which can execute multiple shell or terminal commands.
    
    User's operating system is ${os.platform()}. So, give the commands  supported by this operating system.

    -------Your Task-------
    1. Analyse by user input that which type of website he wants to build.
    2. Give all required commands at once, in sequence.
    3. You MUST NOT explain anything. ONLY output the tool call.Use the tool commandsRunner.
    4. You MUST NOT use echo for writing code.

    -->You can give array of commands in following sequence:
    1. Create a folder, Ex "mkdir folder_name"
    2. Create index.html file inside the created folder, Ex "touch type nul > folder_name/index.html"
    3. Then create style.css and script.js file as above,
    4. Then Generate code and Write code inside the above files(index.html, style.css, script.js)

    *For windows use powershell command to write code inside the files.
    
    * ensure response includes the function call of the tool 'commandsRunner' with the array of commands.
    `,
    tools: [{ functionDeclarations: [commandsRunnerFunctionDeclaration] }]
}

async function executeAgent(input) {
    content.push({
        role: "user",
        parts: [{ text: input }],
    })
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: content,
        config: config
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
        console.log("Function Call:", response.functionCalls[0]);
        const { name, args } = response.functionCalls[0]

        const result = await availableTools[name](args)

        const functionResponsePart = {
            name: name,
            response: {
                result: result,
            },
        };

        content.push({
            role: "model",
            parts: [
                {
                    functionCall: response.functionCalls[0],
                },
            ],
        });
        content.push({
            role: "user",
            parts: [
                {
                    functionResponse: functionResponsePart,
                },
            ],
        });
    } else {
        content.push({
            role: 'model',
            parts: [{ text: response.text }]
        })
        console.log(response.text);
    }
}


async function main() {
    const input = readlineSync.question("Ask anything : ")
    await executeAgent(input)
    main()
}

await main();