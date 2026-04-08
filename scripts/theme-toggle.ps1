# Halloween Theme Activation Script
# 🎃 Script para ativar/desativar o tema Halloween

# === CONFIGURAÇÕES ===
$THEME_NAME = "halloween-aero"
$CONFIG_FILE = "src/config/theme.json"           # Ajuste para seu projeto
$CSS_IMPORT_FILE = "src/styles/main.css"         # Ajuste para seu projeto
$JS_ENTRY_FILE = "src/main.js"                   # Ajuste para seu projeto
$LAYOUT_FILE = "src/index.html"                  # Ou App.jsx / layout.tsx
$BRANCH = "main"
$COMMIT_PREFIX = "🎃 [theme]"

# Cores para output
$ORANGE = "`e[33m"
$GREEN = "`e[32m"
$RED = "`e[31m"
$PURPLE = "`e[35m"
$RESET = "`e[0m"

# === FUNÇÕES ===

function Print-Banner {
    Write-Host ""
    Write-Host "${ORANGE}╔══════════════════════════════════════════╗${RESET}"
    Write-Host "${ORANGE}║     🎃  HALLOWEEN AERO THEME TOGGLE  🎃  ║${RESET}"
    Write-Host "${ORANGE}╚══════════════════════════════════════════╝${RESET}"
    Write-Host ""
}

function Check-Git {
    if (-not (Test-Path ".git")) {
        Write-Host "${RED}❌ Erro: Não está em um repositório Git!${RESET}"
        exit 1
    }
}

function Enable-Theme {
    Write-Host "${ORANGE}🦇 Ativando tema Halloween...${RESET}"
    Write-Host ""

    # 1. Atualizar config do tema
    if (Test-Path $CONFIG_FILE) {
        try {
            $config = Get-Content $CONFIG_FILE | ConvertFrom-Json
            $config.active_theme = $THEME_NAME
            $config.theme_class = "theme-halloween"
            $config | ConvertTo-Json | Set-Content $CONFIG_FILE
            Write-Host "  ${GREEN}✅ Config atualizado: $CONFIG_FILE${RESET}"
        } catch {
            New-Item -Path (Split-Path $CONFIG_FILE) -ItemType Directory -Force | Out-Null
            @{
                active_theme = $THEME_NAME
                theme_class = "theme-halloween"
            } | ConvertTo-Json | Set-Content $CONFIG_FILE
            Write-Host "  ${GREEN}✅ Config criado: $CONFIG_FILE${RESET}"
        }
    }

    # 2. Adicionar imports CSS
    if (Test-Path $CSS_IMPORT_FILE) {
        $content = Get-Content $CSS_IMPORT_FILE
        if ($content -notcontains "halloween-theme.css") {
            Add-Content $CSS_IMPORT_FILE ""
            Add-Content $CSS_IMPORT_FILE "/* 🎃 Halloween Theme */"
            Add-Content $CSS_IMPORT_FILE "@import '../temas/halloween/halloween-theme.css';"
            Add-Content $CSS_IMPORT_FILE "@import '../temas/halloween/halloween-animations.css';"
            Write-Host "  ${GREEN}✅ CSS imports adicionados${RESET}"
        } else {
            Write-Host "  ${PURPLE}ℹ️  CSS imports já existem${RESET}"
        }
    }

    # 3. Adicionar body class
    if (Test-Path $LAYOUT_FILE) {
        $content = Get-Content $LAYOUT_FILE
        if ($content -notcontains "theme-halloween") {
            $content = $content -replace '(<body|className=")([^"]*)"', '$1$2 theme-halloween"'
            Set-Content $LAYOUT_FILE $content
            Write-Host "  ${GREEN}✅ Classe adicionada ao elemento raiz${RESET}"
        }
    }

    # 4. Adicionar script injector
    if (Test-Path $JS_ENTRY_FILE) {
        $content = Get-Content $JS_ENTRY_FILE
        if ($content -notcontains "halloween-injector") {
            Add-Content $JS_ENTRY_FILE ""
            Add-Content $JS_ENTRY_FILE "// 🎃 Halloween Theme Injector"
            Add-Content $JS_ENTRY_FILE "import './temas/halloween/halloween-injector.js';"
            Write-Host "  ${GREEN}✅ JS injector importado${RESET}"
        }
    }

    Write-Host ""
    Write-Host "${GREEN}✅ Tema Halloween ATIVADO com sucesso!${RESET}"
}

function Disable-Theme {
    Write-Host "${ORANGE}💤 Desativando tema Halloween...${RESET}"
    Write-Host ""

    # 1. Remover do config
    if (Test-Path $CONFIG_FILE) {
        try {
            $config = Get-Content $CONFIG_FILE | ConvertFrom-Json
            $config.active_theme = "default"
            $config.theme_class = ""
            $config | ConvertTo-Json | Set-Content $CONFIG_FILE
            Write-Host "  ${GREEN}✅ Config revertido${RESET}"
        } catch {}
    }

    # 2. Remover CSS imports
    if (Test-Path $CSS_IMPORT_FILE) {
        $content = Get-Content $CSS_IMPORT_FILE
        $content = $content | Where-Object { $_ -notmatch "halloween" }
        Set-Content $CSS_IMPORT_FILE $content
        Write-Host "  ${GREEN}✅ CSS imports removidos${RESET}"
    }

    # 3. Remover body class
    if (Test-Path $LAYOUT_FILE) {
        $content = Get-Content $LAYOUT_FILE
        $content = $content -replace " theme-halloween", ""
        $content = $content -replace 'theme-halloween ""', '""'
        Set-Content $LAYOUT_FILE $content
        Write-Host "  ${GREEN}✅ Classe removida${RESET}"
    }

    # 4. Remover JS injector
    if (Test-Path $JS_ENTRY_FILE) {
        $content = Get-Content $JS_ENTRY_FILE
        $content = $content | Where-Object { $_ -notmatch "halloween-injector" }
        Set-Content $JS_ENTRY_FILE $content
        Write-Host "  ${GREEN}✅ JS injector removido${RESET}"
    }

    Write-Host ""
    Write-Host "${GREEN}✅ Tema Halloween DESATIVADO!${RESET}"
}

function Check-Status {
    Write-Host "${ORANGE}📊 Status do tema:${RESET}"
    Write-Host ""

    if ((Test-Path $CONFIG_FILE) -and (Get-Content $CONFIG_FILE | Select-String $THEME_NAME)) {
        Write-Host "  Estado: ${GREEN}🎃 ATIVO${RESET}"
    } else {
        Write-Host "  Estado: ${PURPLE}💤 INATIVO${RESET}"
    }

    if (Test-Path "temas/halloween") {
        Write-Host "  Arquivos: ${GREEN}✅ Presentes${RESET}"
        Write-Host "  Pasta: temas/halloween/"
        Get-ChildItem "temas/halloween" | ForEach-Object {
            Write-Host "    - $($_.Name)"
        }
    } else {
        Write-Host "  Arquivos: ${RED}❌ Não encontrados${RESET}"
    }
}

function Auto-Commit {
    param([string]$action)

    Write-Host ""
    Write-Host "${ORANGE}📦 Fazendo auto-commit...${RESET}"

    git add -A

    # Verificar se há mudanças
    if ((git diff --cached --quiet) -eq 0) {
        Write-Host "  ${PURPLE}ℹ️  Nenhuma mudança para commitar${RESET}"
        return
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $commit_msg = ""

    switch ($action) {
        "enable" { $commit_msg = "$COMMIT_PREFIX Ativar tema Halloween Aero [$timestamp]" }
        "disable" { $commit_msg = "$COMMIT_PREFIX Desativar tema Halloween [$timestamp]" }
        default { $commit_msg = "$COMMIT_PREFIX Atualização de tema [$timestamp]" }
    }

    git commit -m $commit_msg
    Write-Host "  ${GREEN}✅ Commit: $commit_msg${RESET}"

    Write-Host "${ORANGE}🚀 Fazendo push para origin/$BRANCH...${RESET}"
    git push origin $BRANCH
    Write-Host "  ${GREEN}✅ Push realizado com sucesso!${RESET}"
}

# === EXECUÇÃO PRINCIPAL ===

Print-Banner
Check-Git

switch ($args[0]) {
    "enable" {
        Enable-Theme
        Auto-Commit "enable"
    }
    "disable" {
        Disable-Theme
        Auto-Commit "disable"
    }
    "status" {
        Check-Status
    }
    default {
        Write-Host "Uso: .\theme-toggle.ps1 {enable|disable|status}"
        Write-Host ""
        Write-Host "  enable    → Ativa tema Halloween + commit + push"
        Write-Host "  disable   → Desativa tema + commit + push"
        Write-Host "  status    → Verifica se o tema está ativo"
        Write-Host ""
        exit 1
    }
}

Write-Host ""
Write-Host "${ORANGE}🎃 Feito! Happy Halloween! 🦇${RESET}"
