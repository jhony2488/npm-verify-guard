# Installation Guide

How to install and set up npm-verify-guard.

---

## English

### Requirements

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 (included with Node.js)
- **OS**: Windows, Linux, or macOS

### Global Installation

Install npm-verify-guard globally to use it across all projects:

```bash
# Clone the repository
git clone https://github.com/jhony2488/npm-verify-guard.git
cd npm-verify-guard

# Install dependencies
npm install

# Link globally
npm link
```

Or install directly from the cloned directory:

```bash
npm install -g .
```

**Verify installation:**

```bash
npm-verify --version
npm-verify help
```

### Project Setup

Once installed globally, configure a project to use npm-verify-guard:

```bash
# Navigate to your project
cd /path/to/your/project

# Initialize npm-verify-guard
npm-verify init

# Add project to watch list
npm-verify watch add .
```

This will:

- Create `.npm-verify.json` with default configuration
- Add npm lifecycle hooks to `package.json`
- Create `.npm-verify/` directory for status and reports

### Optional: ONNX Models

For enhanced detection using deep learning models (Layer 3):

```bash
# Check ONNX status
npm-verify models status

# Download ONNX models
npm-verify models download
```

**Note:** ONNX models are optional. The tool will automatically use bundled JavaScript ML models if ONNX is not available.

### Optional: Scheduled Scans

Enable hourly deep scans using the OS scheduler:

```bash
# Install scheduler
npm-verify scheduler install

# Check scheduler status
npm-verify scheduler status
```

**Alternative:** Use the Node daemon instead:

```bash
# Start daemon
npm-verify daemon start

# Check daemon status
npm-verify daemon status
```

### Verification

Test your installation:

```bash
# Run a manual scan
npm-verify check

# View the report
npm-verify report
```

### Uninstallation

To uninstall npm-verify-guard:

```bash
# Unlink globally
npm unlink -g

# Or if installed via npm install -g
npm uninstall -g npm-verify-guard

# Remove scheduler (if installed)
npm-verify scheduler uninstall

# Stop daemon (if running)
npm-verify daemon stop

# Remove global data directory (optional)
rm -rf ~/.npm-verify
```

### Troubleshooting

**Command not found:**

- Ensure global installation completed successfully
- Check that npm global bin directory is in your PATH
- Try `npm link` again from the project directory

**Permission errors:**

- On Linux/macOS, you may need `sudo` for global installation
- Alternatively, configure npm to use a user-local directory:
  ```bash
  npm config set prefix ~/.npm-global
  export PATH=~/.npm-global/bin:$PATH
  ```

**ONNX download fails:**

- Check network connectivity
- Ensure write permissions to `~/.npm-verify/models/`
- The tool will fallback to bundled ML models automatically

**Scheduler installation fails:**

- Windows: Run as administrator
- Linux/macOS: Ensure `cron` is installed and you have permissions
- Use the daemon as an alternative

---

## Português

### Requisitos

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0 (incluído com Node.js)
- **SO**: Windows, Linux ou macOS

### Instalação Global

Instale npm-verify-guard globalmente para usar em todos os projetos:

```bash
# Clone o repositório
git clone https://github.com/jhony2488/npm-verify-guard.git
cd npm-verify-guard

# Instale dependências
npm install

# Link globalmente
npm link
```

Ou instale diretamente do diretório clonado:

```bash
npm install -g .
```

**Verificar instalação:**

```bash
npm-verify --version
npm-verify help
```

### Configuração de Projeto

Uma vez instalado globalmente, configure um projeto para usar npm-verify-guard:

```bash
# Navegue para seu projeto
cd /caminho/para/seu/projeto

# Inicialize npm-verify-guard
npm-verify init

# Adicione projeto à lista de monitoramento
npm-verify watch add .
```

Isso irá:

- Criar `.npm-verify.json` com configuração padrão
- Adicionar hooks de ciclo de vida npm ao `package.json`
- Criar diretório `.npm-verify/` para status e relatórios

### Opcional: Modelos ONNX

Para detecção aprimorada usando modelos de deep learning (Camada 3):

```bash
# Verificar status ONNX
npm-verify models status

# Baixar modelos ONNX
npm-verify models download
```

**Nota:** Modelos ONNX são opcionais. A ferramenta usará automaticamente modelos ML JavaScript bundled se ONNX não estiver disponível.

### Opcional: Varreduras Agendadas

Habilite varreduras profundas horárias usando o scheduler do SO:

```bash
# Instalar scheduler
npm-verify scheduler install

# Verificar status do scheduler
npm-verify scheduler status
```

**Alternativa:** Use o daemon Node em vez disso:

```bash
# Iniciar daemon
npm-verify daemon start

# Verificar status do daemon
npm-verify daemon status
```

### Verificação

Teste sua instalação:

```bash
# Executar uma varredura manual
npm-verify check

# Ver o relatório
npm-verify report
```

### Desinstalação

Para desinstalar npm-verify-guard:

```bash
# Unlink globalmente
npm unlink -g

# Ou se instalado via npm install -g
npm uninstall -g npm-verify-guard

# Remover scheduler (se instalado)
npm-verify scheduler uninstall

# Parar daemon (se rodando)
npm-verify daemon stop

# Remover diretório de dados global (opcional)
rm -rf ~/.npm-verify
```

### Solução de Problemas

**Comando não encontrado:**

- Certifique-se que a instalação global completou com sucesso
- Verifique que o diretório bin global do npm está no seu PATH
- Tente `npm link` novamente do diretório do projeto

**Erros de permissão:**

- No Linux/macOS, você pode precisar de `sudo` para instalação global
- Alternativamente, configure npm para usar um diretório local de usuário:
  ```bash
  npm config set prefix ~/.npm-global
  export PATH=~/.npm-global/bin:$PATH
  ```

**Download ONNX falha:**

- Verifique conectividade de rede
- Certifique-se de permissões de escrita em `~/.npm-verify/models/`
- A ferramenta fará fallback para modelos ML bundled automaticamente

**Instalação do scheduler falha:**

- Windows: Execute como administrador
- Linux/macOS: Certifique-se que `cron` está instalado e você tem permissões
- Use o daemon como alternativa
