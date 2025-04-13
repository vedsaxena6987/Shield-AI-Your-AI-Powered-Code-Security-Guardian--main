#!/usr/bin/env node
const readline = require("readline-sync");
const { exec, spawn } = require("child_process");
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const chalk = require('chalk');
const ora = require('ora'); 
const inquirer = require('inquirer'); 
const os = require('os');

const configPath = path.join(os.homedir(), '.ai-agent-config.json');

const projectState = {
    currentDirectory: process.cwd(),
    history: [],
    config: {
        apiKey: '',
        defaultProjectsDir: path.join(os.homedir(), 'ai-projects'),
        autoSave: true,
        // New security-specific configurations
        scanLevel: 'standard',
        autoFix: false,
        monitoringEnabled: false,
        backupOriginalFile: true,
        securityRules: {
            inputValidation: true,
            authentication: true,
            dataExposure: true,
            dependencies: true,
            injection: true,
            filesystem: true
        }
    }
};

let genAi;
let model;

async function saveConfig(){
    try {
        await fs.writeFile(configPath , JSON.stringify(projectState.config , null , 2) , "utf-8");
    } catch (error) {
        console.error(chalk.red("Error saving config file : ") , error.message);
    }
}

async function extractCodeFromFile(filePath, startLine, endLine) {
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        
        if (startLine && endLine) {
            return lines.slice(startLine - 1, endLine).join('\n');
        }
        return fileContent;
    } catch (error) {
        throw new Error(`Error reading file: ${error.message}`);
    }
}

// Add this function to modify file content
async function modifyFileContent(filePath, startLine, endLine, newContent) {
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        
        // Replace the specified lines with new content
        const newLines = newContent.split('\n');
        lines.splice(startLine - 1, endLine - startLine + 1, ...newLines);
        
        // Write back to file
        await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
        return true;
    } catch (error) {
        throw new Error(`Error modifying file: ${error.message}`);
    }
}

async function initAi(){
    try{
        try{
        const configData = await fs.readFile(configPath , 'utf-8');
        Object.assign(projectState.config , JSON.parse(configData));
        }catch(error){
            if(error.code !== 'ENOENT'){
                console.error("Error loading config file" , error.message);
            }
        }

        if(!projectState.config.apiKey){
            const apiKey = await inquirer.createPromptModule([{
                type : 'password',
                name : 'apiKey',
                message : 'Enter your Google Generative AI API Key ',
                validate: input => input.length > 0 ? true : "API key can't be empty"
            }]);
            projectState.config.apiKey = apiKey;
            await saveConfig();
        }

        genAi = new GoogleGenerativeAI(projectState.config.apiKey);
        model = genAi.getGenerativeModel({ model: "gemini-1.5-pro" });
        return true;

    }catch(error){
        console.error(chalk.red("Error while initilization of AI : " , error.message));
        return false;
    }
}

async function executeAiCommand(userCommand) {
        const spinner = ora('Parsing your command.....').start();
        const parts = userCommand.split(' ');
        const action = parts[0].toLowerCase();
        const targetFile = parts[1];
        const lineRange = parts[2]?.split('-').map(Number);

        // Get file content if needed
        let codeContent = '';
        if (targetFile) {
            try {
                codeContent = await extractCodeFromFile(
                    targetFile,
                    lineRange?.[0],
                    lineRange?.[1]
                );
            } catch (error) {
                spinner.fail(`Failed to read file: ${error.message}`);
                return false;
            }
        }

        try {
            const prompt = `As a secure AI programming assistant, analyze this command: "${userCommand}" , Code:
        ${codeContent} , action: ${action} do according to this action
            Provide a detailed JSON response in the following format:
    
            {
                "type": "code_analysis" | "code_modification",
                "action": {
                    "operation": "security_check" | "code_change",
                    "targetFile": "${targetFile || ''}",
                "lineRange": {
                    "start": ${lineRange?.[0] || 'null'},
                    "end": ${lineRange?.[1] || 'null'}
                }
                },
                "analysis": {
                    "securityIssues": [
                        {
                            "severity": "high" | "medium" | "low",
                            "issue": "description",
                            "recommendation": "fix suggestion"
                        }
                    ]
                },
                "codeChanges": {
                    "original": "original code snippet",
                    "modified": "suggested modified code",
                    "explanation": "explanation of changes"
                },
                "checkedData": {
                    "InputValidation" : bollean,
                    "AuthenticationIssues" : bollean,
                    "DataExposure" : bollean,
                    "DependencyVulnerabilities" : bollean,
                    "CodeInjectionRisks" : bollean,
                    "FileSystemSecurity" : bollean
                } 
            }
    
            Rules to follow:
            1. For security checks, analyze for:
               - Input validation
               - Authentication issues
               - Data exposure
               - Dependency vulnerabilities
               - Code injection risks
               - File system security
            2. For code modifications:
               - Preserve existing functionality
               - Follow secure coding practices
               - Explain all suggested changes
            3. If the command is unclear, set type as "invalid" and provide guidance
    
            Parse the command and provide appropriate response based on whether it's a security check or code modification request.
            IMPORTANT: give me only in json object no other explanation or nothing.
            `;
    
            const result = await model.generateContent(prompt);
            const rawResponse = result.response.text();

            // Clean and parse JSON
            let jsonStr = rawResponse.trim();
            
            if (jsonStr.includes('```')) {
                const matches = jsonStr.match(/```(?:json)?([\s\S]*?)```/);
                jsonStr = matches ? matches[1].trim() : jsonStr;
            }
            
            if (jsonStr.includes('{') && jsonStr.includes('}')) {
                const start = jsonStr.indexOf('{');
                const end = jsonStr.lastIndexOf('}') + 1;
                jsonStr = jsonStr.substring(start, end);
            }
            
            jsonStr = jsonStr
                .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces
                .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
                .trim();

            
            
            let plan;
            try {
                plan = JSON.parse(jsonStr);
            } catch (parseError) {
                throw new Error(`JSON Parse Error: ${parseError.message}\nCleaned JSON: ${jsonStr}`);
            }
            
                
            spinner.stop();        
            if (plan.type === 'code_analysis') {
                console.log(chalk.blue('\nSecurity Analysis Results:'));
                
                // Display security issues
                if (plan.analysis.securityIssues.length === 0) {
                    console.log(chalk.green('\n✔ No security issues found'));
                } else {
                    plan.analysis.securityIssues.forEach(issue => {
                        console.log(chalk.yellow(`\n[${issue.severity.toUpperCase()}] ${issue.issue}`));
                        console.log(chalk.green(`Recommendation: ${issue.recommendation}`));
                    });
                }
                
                // Display security checks summary
                console.log(chalk.blue('\nSecurity Checks Summary:'));
                const checks = plan.checkedData;
                
                const checkSymbols = {
                    true: chalk.green('✓'),
                    false: chalk.red('✗')
                };
                
                console.log(chalk.yellow('\nInput Validation:'), 
                    checkSymbols[checks.InputValidation] || chalk.gray('not checked'));
                console.log(chalk.yellow('Authentication Issues:'), 
                    checkSymbols[checks.AuthenticationIssues] || chalk.gray('not checked'));
                console.log(chalk.yellow('Data Exposure:'), 
                    checkSymbols[checks.DataExposure] || chalk.gray('not checked'));
                console.log(chalk.yellow('Dependency Vulnerabilities:'), 
                    checkSymbols[checks.DependencyVulnerabilities] || chalk.gray('not checked'));
                console.log(chalk.yellow('Code Injection Risks:'), 
                    checkSymbols[checks.CodeInjectionRisks] || chalk.gray('not checked'));
                console.log(chalk.yellow('File System Security:'), 
                    checkSymbols[checks.FileSystemSecurity] || chalk.gray('not checked'));
                    
                // Display scan level info
                console.log(chalk.blue('\nScan Details:'));
                console.log(chalk.gray(`Scan Level: ${projectState.config.scanLevel}`));
                console.log(chalk.gray(`Auto-Fix: ${projectState.config.autoFix ? 'Enabled' : 'Disabled'}`));
            } else if (plan.type === 'code_modification') {
                console.log(chalk.blue('\nProposed Code Changes:'));
                console.log(chalk.yellow('Original Code:'));
                console.log(plan.codeChanges.original);
                console.log(chalk.green('\nModified Code:'));
                console.log(plan.codeChanges.modified);
                console.log(chalk.cyan('\nExplanation:'));
                console.log(plan.codeChanges.explanation);
                
                const confirm = await inquirer.prompt([{
                    type: 'confirm',
                    name: 'applyChanges',
                    message: 'Do you want to apply these changes?',
                    default: true
                }]);
                
                if (confirm.applyChanges) {
                    spinner.start('Applying changes...');
                    try {
                        const { targetFile, lineRange } = plan.action;
                        const filePath = path.resolve(projectState.currentDirectory, targetFile);
                        
                        // Verify file exists
                        await fs.access(filePath);
                        
                        // Apply changes
                        await modifyFileContent(
                            filePath,
                            lineRange.start,
                            lineRange.end,
                            plan.codeChanges.modified
                        );
                        
                        // Backup original file (optional)
                        if (projectState.config.backupOriginalFile) {
                        await fs.writeFile(
                            `${filePath}.backup`,`From line ${lineRange[0] } -  ${lineRange[1]} in ${targetFile} \n` +
                            plan.codeChanges.original,
                            'utf-8'
                        );
                    }
                        
                        spinner.succeed('Changes applied successfully');
                        console.log(chalk.green('✔ File updated successfully'));
                        console.log(chalk.blue('✔ Backup created as', `${targetFile}.backup`));
                    } catch (error) {
                        spinner.fail('Failed to apply changes');
                        console.error(chalk.red('Error:', error.message));
                    }
                }
            }
    
            return true;
        } catch (error) {
            spinner.fail('Error executing command');
            console.error(chalk.red("Caught Error while executing Command, Error: "), error.message);
            return false;
        }
    }



async function main() {
    console.clear();
// Update the banner in the main function
console.log(chalk.cyan(`
    ╔═══════════════════════════════════════════╗
    ║            🛡️ SHIELD AI 1.0 🛡️           ║
    ╚═══════════════════════════════════════════╝
`));
    // Initialize AI
    if (!await initAi()) {
        console.error(chalk.red("Failed to initialize AI security agent. Exiting."));
        process.exit(1);
    }
    
    console.log(chalk.green(`
Security Agent initialized! This agent can:
- Analyze code for security vulnerabilities
- Suggest security improvements
- Fix common security issues
- Monitor file changes for security concerns
- Validate code modifications
- Generate security reports

${chalk.yellow('Commands:')}
${chalk.cyan('check')}   - Analyze file/code block for security issues
${chalk.cyan('fix')}     - Fix detected security issues
${chalk.cyan('monitor')} - Watch files for security concerns
${chalk.cyan('help')}    - Show detailed help
${chalk.cyan('config')}  - Configure security settings
${chalk.cyan('exit')}    - Exit the agent
`));

    while (true) {
        const command = readline.question(chalk.blue('\n🛡️ > '));
        
        if (command.toLowerCase() === 'exit') {
            console.log(chalk.green('Thank you for using AI Code Security Agent! Stay secure!'));
            break;
        }
        
        if (command.toLowerCase() === 'help') {
            console.log(chalk.cyan(`
Security Analysis Commands:
-------------------------
check <file> [lines]     - Check file for security issues
  Examples:
  - check index.js
  - check index.js 10-50
  - check ./src/*.js

Fix Commands:
------------
fix <file> [lines]       - Apply security fixes
  Examples:
  - fix index.js
  - fix index.js 25-30
  - fix vulnerable-code.js --autofix

Monitor Commands:
---------------
monitor <path>           - Watch files for security issues
  Examples:
  - monitor ./src
  - monitor index.js --realtime
  - monitor ./ --exclude=node_modules

Configuration:
-------------
config                   - Show current configuration
config set <key> <value> - Update configuration
  Examples:
  - config set apiKey YOUR_NEW_API_KEY
  - config set securityLevel high
  - config set autoFix true
            `));
            continue;
        }
        
        if (command.toLowerCase() === 'config') {
            const { action } = await inquirer.prompt([{
                type: 'list',
                name: 'action',
                message: 'Select configuration option:',
                choices: [
                    'Update API Key',
                    'Backup File',
                    'Security Scan Level',
                    'Auto-Fix Settings',
                    'Monitoring Settings',
                    'Report Format',
                    'Back to main menu'
                ]
            }]);
            
            if (action === 'Back to main menu') continue;
            
            switch(action) {
                case 'Update API Key':
                    const { apiKey } = await inquirer.prompt([{
                        type: 'password',
                        name: 'apiKey',
                        message: 'Enter new API key:',
                        validate: input => input.length > 0 ? true : 'API key cannot be empty'
                    }]);
                    projectState.config.apiKey = apiKey;
                    await saveConfig();
                    await initAi();
                    console.log(chalk.green('✔ API key updated successfully'));
                    break;
                
                    case 'Backup File':
                        const  confirm  = await inquirer.prompt([{
                            type: 'confirm',
                            name: 'applyChanges',
                            message: 'do you want to keep backup file?',
                            default: true
                        }]);
                        projectState.config.backupOriginalFile = confirm;
                        await saveConfig();
                        console.log(chalk.green('Backup Files will be created from now!'));
                        break;
                
                case 'Security Scan Level':
                    const { scanLevel } = await inquirer.prompt([{
                        type: 'list',
                        name: 'scanLevel',
                        message: 'Select security scan level:',
                        choices: [
                            { name: 'Basic (Faster)', value: 'basic' },
                            { name: 'Standard', value: 'standard' },
                            { name: 'Thorough (Slower)', value: 'thorough' }
                        ]
                    }]);
                    projectState.config.scanLevel = scanLevel;
                    await saveConfig();
                    console.log(chalk.green(`✔ Scan level set to: ${scanLevel}`));
                    break;
                
                case 'Auto-Fix Settings':
                    const { autoFix } = await inquirer.prompt([{
                        type: 'confirm',
                        name: 'autoFix',
                        message: 'Enable automatic security fixes?',
                        default: false
                    }]);
                    projectState.config.autoFix = autoFix;
                    await saveConfig();
                    console.log(chalk.green(`✔ Auto-fix: ${autoFix ? 'enabled' : 'disabled'}`));
                    break;
            }
            continue;
        }
        
        // Handle security analysis commands
        await executeAiCommand(command);
    }
}

main();




