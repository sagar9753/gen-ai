import { GoogleGenAI } from "@google/genai";
import { Type } from '@google/genai';
import readlineSync from 'readline-sync'
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

const ai = new GoogleGenAI({ apiKey: "AIzaSyAlQqf2xAX0OIhhfVnm5JBeCvssX1aQ8ws" });

const content = []


async function commandRunner({ command }) {
    try {
        const { stdout, stderr } = await execAsync(command);

        if (stderr)
            return "Error : " + stderr

        return "Success : " + stdout || "Commmand executed successfully"
    } catch (error) {
        return "Error : " + error
    }
}

const commandRunnerFunctionDeclaration = {
    name: 'commandRunner',
    description: 'Execute a single terminal command. A command can be create a folder or file, write on a file, edit a file or delete a file',
    parameters: {
        type: Type.OBJECT,
        properties: {
            command: {
                type: Type.STRING,
                description: 'It will be a single terminal/shell command. Ex. "mkdir genAi"',
            },

        },
        required: ['command'],
    }
}
const availableTools = { commandRunner }

const config = {
    systemInstruction: `You are an website builder expert.You have to create create the frontend of the website by analysing the user Input.You have access of the tool, which can execute any shell or terminal command.
    
    User's operating system is ${os.platform()}. So, give the command  supported by this operating system.

    -------Your Task-------
    1. Analyse by user input that which type od website he wants to build.
    2. Give them command one by one.
    3. User the tool 'commandRunner'.

    -->You can give the commands in following way:
    1. Create a folder, Ex "mkdir folder_name"
    2. Create index.html file inside the created folder, Ex "touch folder_name/index.html"
    3. Then create style.css and script.js file as above,
    4. Then Write code inside the above files 
    `,
    tools: [{ functionDeclarations: [commandRunnerFunctionDeclaration] }]
}

async function executeAgent(input) {
    content.push({
        role: "user",
        parts: [{ text: input }],
    })
    while (true) {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: content,
            config: config
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            console.log(response.functionCalls[0]);
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
            break;
        }
    }
}

async function main() {
    const input = readlineSync.question("Ask anything : ")
    await executeAgent(input)
    main()
}

await main();