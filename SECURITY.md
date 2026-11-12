# SECURITY.md — modelo de ameaça mínimo por funcionalidade

Nível ASVS alvo: 1 · Dados sensíveis: nomes de pastas/arquivos dos drives do dono (privados, não regulados) ·
Multi-tenant: não (um usuário). Checagens automáticas: `python tools/verificar.py` (também barreira no CI).

## Exibição do catálogo (Painel, Busca, Detalhe, Relatório)
| Pergunta | Resposta |
|---|---|
| Ator de menor confiança | quem preparou um drive de terceiro (rótulo de volume, nomes de pastas/arquivos) |
| Entrada que ele controla | texto que entra no catálogo via "Ler drive", escaneamento de pastas ou cadastro |
| Controle | `esc()` em toda interpolação em HTML; CSP sem script inline |
| Fronteira | dado não confiável → execução de código na origem do app |
| Recurso afetado | token Google em memória (catálogo no Drive) e acesso ao companion |
| Invariante | nenhum dado do catálogo vira HTML ativo |
| Teste | `verificar.py` [XSS] e [CSP]; corrigido em v2.12.0 após reprodução no navegador |

## Login e dados na nuvem
| Pergunta | Resposta |
|---|---|
| Ator de menor confiança | outro site no navegador do dono |
| Entrada que ele controla | nenhuma no fluxo OAuth; o token fica só em memória |
| Controle | Google Identity Services, escopo mínimo `drive.file`, checagem dos escopos concedidos |
| Fronteira | site externo → arquivos do Drive do dono |
| Recurso afetado | catálogo e backups no Drive |
| Invariante | o app só acessa arquivos que ele mesmo criou |
| Teste | manual (login real); **pendente** com a CSP no Brave |

## Companion local (porta 7777, roda como administrador)
| Pergunta | Resposta |
|---|---|
| Ator de menor confiança | qualquer site aberto no navegador; programa sem admin na mesma máquina |
| Entrada que ele controla | requisições HTTP ao loopback (inclusive via DNS rebinding); arquivos em pastas do usuário |
| Controle | bind só em 127.0.0.1; CORS só para as origens do app; `Host` validado (403); volume trancado nunca é lido; instalação em `%ProgramFiles%` com Python de máquina |
| Fronteira | site externo → nomes de arquivos dos drives; usuário comum → administrador |
| Recurso afetado | privacidade do conteúdo dos drives; controle da máquina |
| Invariante | só o OmniDrive, pelo nome local, lê o companion; nada gravável pelo usuário roda elevado |
| Teste | `verificar.py` [Companion]; aviso no console se só houver Python por-usuário |

## Instalador do companion
| Pergunta | Resposta |
|---|---|
| Ator de menor confiança | quem altera os arquivos no caminho entre o site e a máquina |
| Entrada que ele controla | conteúdo baixado |
| Controle | HTTPS + `SHA256SUMS` gerado no deploy, conferido numa pasta temporária antes de copiar |
| Fronteira | download → código executado como administrador |
| Recurso afetado | a máquina inteira |
| Invariante | nada é instalado se algum hash não conferir |
| Teste | `verificar.py` [Instalador] (ok e adulterado) |
| Limite conhecido | o site comprometido (mesma origem de arquivos e hashes) não é coberto; exigiria assinatura de código |

## Pendências de verificação (nunca marcar como "ok" o que não foi verificado)
- [ ] Login completo com a CSP no Brave.
- [ ] Instalação limpa: winget `--scope machine` do Python.
- [ ] Teste automatizado de XSS no navegador (hoje: checagem estática + reprodução manual).
- [ ] Gitleaks e Semgrep (não instalados; busca manual de segredos feita em 2026-11).
- [ ] Acessibilidade (teclado, leitor de tela, axe).
