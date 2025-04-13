<p align="center">
  <img src="assets/logo.svg" alt="ShieldAI Logo" width="200" height="200"/>
  <h1 align = "center">ShieldAI 🛡️</h1>

</p>

<p align="center">
  AI-powered code security analysis and automated fixing tool powered by Google's Generative AI
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/shieldai.svg" alt="NPM Version" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  <img src="https://img.shields.io/node/v/shieldai.svg" alt="Node.js Version" />
</p>

## Features

- 🔍 Real-time code security analysis
- 🛠️ Automated security vulnerability fixes
- 👀 File monitoring for security issues
- 📊 Detailed security reports
- ⚡ Multiple scan levels
- 🔄 Automatic backup of modified files
- 🎯 Customizable security rules

## Installation

```bash
npm install -g shieldai
```

## Quick Start

1. Install the package globally
2. Run the security agent:
```bash
shieldai
```
3. On first run, you'll be prompted for your Google AI API key

## Usage

### Basic Commands

```bash
shieldai              # Start the interactive security agent
shieldai check file   # Analyze a specific file
shieldai fix file     # Fix security issues in a file
shieldai monitor dir  # Monitor directory for security issues
```

### Security Analysis
```bash
check <file> [lines]     # Analyze file for security issues
```
Examples:
- `check index.js`
- `check index.js 10-50`
- `check ./src/*.js`

### Auto-Fix
```bash
fix <file> [lines]       # Apply security fixes
```
Examples:
- `fix index.js`
- `fix index.js 25-30`
- `fix vulnerable-code.js --autofix`

### Monitoring
```bash
monitor <path>           # Watch files for security issues
```
Examples:
- `monitor ./src`
- `monitor index.js --realtime`
- `monitor ./ --exclude=node_modules`

## Security Checks

ShieldAI performs comprehensive security analysis including:

1. **Input Validation**
   - SQL Injection vulnerabilities
   - XSS vulnerabilities
   - Command injection risks

2. **Authentication**
   - Weak authentication methods
   - Insecure password storage
   - Session management issues

3. **Data Exposure**
   - Sensitive data leaks
   - Insecure data storage
   - Unencrypted data transmission

4. **Dependencies**
   - Vulnerable dependencies
   - Outdated packages
   - Known CVEs

5. **Code Injection**
   - Remote code execution risks
   - Unsafe eval usage
   - Template injection

6. **File System**
   - Path traversal vulnerabilities
   - Unsafe file operations
   - Directory listing risks

## Configuration

Access configuration settings using:

```bash
shieldai config
```

### Available Settings

- **API Key**: Your Google AI API key
- **Scan Level**: 
  - `basic` - Faster, basic security checks
  - `standard` - Balanced security analysis
  - `thorough` - Deep, comprehensive scanning
- **Auto-Fix**: Enable/disable automatic fixing
- **Backup**: Enable/disable backup file creation

## Example Output

```bash
╔═══════════════════════════════════════════╗
║           🛡️ SHIELD AI 1.0 🛡️           ║
╚═══════════════════════════════════════════╝

Security Analysis Results:

[HIGH] SQL Injection vulnerability found
Recommendation: Use parameterized queries

Security Checks Summary:

Input Validation: ✓
Authentication Issues: ✗
Data Exposure: ✓
Dependency Vulnerabilities: ✓
Code Injection Risks: ✗
File System Security: ✓
```

## Requirements

- Node.js >= 14.0.0
- Google AI API key

## Dependencies

- @google/generative-ai: ^0.2.1
- chalk: ^4.1.2
- chokidar: ^3.5.3
- inquirer: ^8.2.6
- ora: ^5.4.1
- readline-sync: ^1.4.10

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Vedant Saxena**
- GitHub: [@vedsaxena6987](https://github.com/vedsaxena6987)
- Email: 6987vedsaxena@gmail.com

## Support

---

<p align="center">Made with ❤️ using Google's Generative AI</p>
