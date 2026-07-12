# OmniDrive — Catálogo de Drives Físicos

Documento-mestre do projeto. Registra visão, arquitetura, campos, busca e design.
Tudo do projeto vive dentro de `C:\Users\Davi\Documents\Claude Code\OmniDrive\`.

Versão do app: **1.0** (primeira versão).
Status: **em definição** (concepção, banco e prototipagem aprovados).
Última atualização: 2026-07-11.

---

## 1. O que é

Catálogo pessoal dos drives físicos do Davi (dezenas de HDs, SSDs, NVMe, pen drives),
cada um etiquetado com um **código**. O problema: há muito backup espalhado e, hoje, para
saber o que tem em cada drive é preciso plugar um por um. O OmniDrive resolve isso permitindo
**cadastrar o conteúdo** de cada drive e **buscar** por qualquer pedaço de palavra — o resultado
diz **em qual drive está** e **o que mais tem naquele drive**.

Duas frentes:
- **Inclusão/cadastro** — registrar cada drive e o que há dentro.
- **Busca** — encontrar dados por texto parcial ou por tipo de arquivo.

---

## 2. Usuários e plataformas

- Uso **pessoal** (um usuário: Davi).
- **Programa no computador (principal)** — onde o cadastro é feito com conforto de teclado.
  **Responsivo ao tamanho da janela**: reflui pelos breakpoints conforme a janela é redimensionada (não é layout fixo).
- **App no celular e no tablet** — foco em **consultar** e **escanear QR** (também cadastra).
- Alvo de instalação: celular (ex.: Galaxy S25) e tablet.

### 2.1 Stack técnica (decidida)

- **PWA** (web app instalável) — **um código só** roda em PC, celular e tablet; instalável, sem loja de app, sem terceiros.
- Front-end web (HTML/CSS/JS). Framework definido na construção (candidato: leve/vanilla).
- **Login:** Google Identity Services (client-side).
- **Dados:** Google Drive API, escopo **`drive.file`** (o app só enxerga o arquivo que criou) — evita verificação de escopo sensível do Google.
- **Hospedagem dos arquivos estáticos:** a definir — candidatos gratuitos: **GitHub Pages** ou **Firebase Hosting**. O dado continua no Drive do usuário, independente de onde o app é servido.

---

## 3. Arquitetura

Modelo definido na concepção:

- **Dados na nuvem, dentro do próprio Google do Davi** — sem depender de terceiro que possa
  passar a cobrar ou pausar o serviço (ex.: evitar Supabase, que pausa o banco).
- O catálogo vira **um arquivo (JSON) no Google Drive do usuário**, lido/escrito pelo PC e pelo app
  via **API do Google Drive**. Escopo do tipo "o app só enxerga o arquivo que ele mesmo criou"
  (não bisbilhota o resto do Drive).
- **Login pela conta Google** — a mesma conta serve para **autenticar** e **guardar os dados**.
- **QR code = código opaco** (ex.: `HD-A12`), gerado pelo sistema. Não é um link: quem apontar a
  câmera comum vê só o código, que não revela nada. Só o **app OmniDrive** interpreta o código,
  busca na nuvem e mostra o conteúdo.
- **Sem banco local no celular** — o app consulta a nuvem.

### Consequências assumidas
- **Consulta exige internet** (sem banco local). Aceitável (uso geralmente em casa, com Wi-Fi).
  Em aberto: se vale um **cache de leitura** (não é banco) para funcionar offline.
- **Edição simultânea** de PC + celular no mesmo arquivo pode gerar conflito de sobrescrita.
  Risco baixo (um único usuário); tratar com estratégia simples.
- **Setup inicial no Google** (projeto no Google Cloud + credenciais OAuth) — gratuito, feito uma vez.

### QR na prática
- A impressora térmica de etiquetas do Davi **gera** o QR a partir de um texto/código.
- O OmniDrive **fornece o código** (após cadastrar um drive) para o Davi imprimir. Ele **não importa**
  QR — apenas gera o código.
- Escanear (pelo app) → mostra o status e o conteúdo do drive no celular.

### 3.1 Redundância / backup do banco

Objetivo: sobreviver a **perda ou corrupção** do arquivo principal. Estratégia definida (v1.0):

1. **Escrita segura** — gravar num arquivo temporário e só então substituir o principal
   (evita arquivo "pela metade" se a conexão cair no meio da gravação).
2. **Backups rotativos gerenciados pelo app** — a cada gravação (ou 1×/dia), salvar uma cópia datada
   em `backups/omnidrive-AAAAMMDD-HHmm.json`, mantendo as últimas ~20 e apagando as mais antigas.
   Como são arquivos **separados**, uma corrupção do principal não contamina o histórico.
3. **Histórico nativo do Google Drive** — o Drive já guarda versões do arquivo automaticamente;
   segunda rede de segurança, sem custo. Marcar revisões-chave como "manter para sempre" via API.
4. **Exportar** — botão para baixar o JSON quando quiser (inclusive para outro disco físico).

**Apps Script: adiado.** Serviria como cópia agendada independente, mas adiciona outra peça e outra
autenticação. Fora da 1.0 — reavaliar se um dia quisermos cópia off-account automática.

---

## 4. Campos do cadastro (drive)

Regra geral: **só o `nome` é obrigatório** (o `id` o app gera sozinho); todo o resto é **opcional**.

| Campo | Tipo | Observações |
|---|---|---|
| `id` | texto | **Gerado automático** (ex.: `OMNI-7K4P2` — aleatório, 5 chars, sem O/0/I/1). É o conteúdo do QR. Usuário não digita. Alternativa descartada: sequencial `OMNI-0001`. |
| **`nome`** | texto | **Obrigatório.** A etiqueta física que já existe no drive (código+número que o Davi lê a olho). |
| Tipo do drive | opção | HD · SSD · NVMe · Pen drive. |
| Solto ou em case | opção | Solto · Em case. |
| Conexão / interface | opção | USB 2.0 · USB 3.0 · USB-C · SATA · outros. |
| Capacidade total | número | Entrada **flexível**: `2tb`, `2000`, `2000mb`, `1.5tb`. Guarda em **GB** (1 TB = 1000 GB, decimal). Mostra eco na hora ("✓ 2 TB"). Número sem unidade = GB. |
| Espaço usado (ou livre) | número | Mesma entrada flexível. Guarda `usadoGB`; se o Davi digitar o **livre**, o app calcula o usado. Alimenta o medidor. |
| Nº de partições | número | — |
| Criptografia | opção | Não · Sim · Híbrido (quando só algumas partições). |
| Estado | opção | Em uso · Disponível · Cheio · Aposentado · Com defeito. |
| Localização física | opção gerenciada | Lista de **locais cadastrados**; no fim do dropdown, **"+ Novo Local"** cria um na hora. Ver §4.2. |
| Idade / data de aquisição | data | HD antigo = risco; útil sinalizar. |
| Tipos de arquivo | multi | Vídeo · Foto · Documento · Áudio · Compactado · outros. Usado como filtro na busca. |
| **Conteúdo** | texto livre | O principal. Lista, vírgulas, do jeito que o Davi quiser. Base da busca. |
| Tags livres | multi | ex.: "Fotos família", "Cliente X", "2019". |
| Observações | texto livre | Notas gerais. |

Ideias registradas para o **futuro** (não agora): foto do drive; redundância/cópias (marcar quando
um conteúdo existe em mais de um drive — coração de um catálogo de backup); detalhar conteúdo por
partição; exportar o catálogo (CSV/JSON) como backup do próprio catálogo; dashboard geral
(total de drives, capacidade somada, espaço livre total); alerta de drive antigo/cheio.

### 4.1 Esquema do JSON (banco)

Um **arquivo único** no Google Drive do usuário (ex.: `omnidrive-catalogo.json`).

Envelope do catálogo:
```json
{
  "schemaVersion": 1,
  "appVersion": "1.0",
  "app": "OmniDrive",
  "atualizadoEm": "2026-07-11T16:40:00Z",
  "locais": ["Gaveta 2", "Estante 1", "Chaveiro"],
  "drives": [ /* … registros de drive … */ ]
}
```

Um registro de drive:
```json
{
  "id": "OMNI-7K4P2",
  "nome": "BKP-2021 07",
  "tipo": "HD",
  "acondicionamento": "case",
  "conexao": "USB 3.0",
  "capacidadeGB": 2000,
  "usadoGB": 1440,
  "particoes": 3,
  "criptografia": "hibrido",
  "estado": "em_uso",
  "local": "Gaveta 2",
  "aquisicao": "2021-05",
  "tiposArquivo": ["video", "foto", "documento"],
  "conteudo": "Casamento fotos RAW 2019, Fotos viagem Chile, Projetos cliente iTech...",
  "tags": ["Fotos família", "Cliente X"],
  "observacoes": "",
  "criadoEm": "2026-07-11T16:40:00Z",
  "atualizadoEm": "2026-07-11T16:40:00Z"
}
```

Valores fixos (guarda o código, exibe rótulo bonito):
- `tipo`: `HD` · `SSD` · `NVMe` · `PenDrive`
- `acondicionamento`: `solto` · `case`
- `criptografia`: `nao` · `sim` · `hibrido`
- `estado`: `em_uso` · `disponivel` · `cheio` · `aposentado` · `defeito`
- `tiposArquivo`: `video` · `foto` · `documento` · `audio` · `compactado` · `outros`

`schemaVersion` + `atualizadoEm` permitem evoluir o formato e detectar a cópia mais nova (PC × celular).

### 4.2 Locais (lista gerenciada)

`local` do drive não é texto solto: é escolhido de uma **lista de locais** guardada no catálogo
(campo `locais`). No dropdown de local, a última opção é sempre **"+ Novo Local"**, que cria um
local novo sem sair da tela de cadastro. Evita duplicatas ("Gaveta 2" vs "gaveta 2") e permite
filtrar a busca por local. Mesmo padrão pode valer para **Tags** no futuro.

---

## 5. Busca (comportamento)

- **Texto parcial**, sem exigir palavra exata, **ignorando acentos e maiúsculas**.
- Procura em: **conteúdo**, nome, código e tags.
- **Filtro por tipo de arquivo** — clicar numa pílula (ex.: "Áudio") lista todos os drives que têm aquilo.
- **Resultado** mostra: o **drive** onde está + **todo o conteúdo daquele drive** + **termo destacado**.
- Layout do resultado: no celular, lista rolável; no tablet/PC, "lista à esquerda + detalhe à direita".

---

## 6. Tela de detalhe do drive

- **Medidor de capacidade** em **anel/rosca** (estilo doughnut das referências): % grande no centro,
  `usado de total`, cor muda com o nível (ciano → âmbar → vermelho quando quase cheio).
  Só aparece quando capacidade/uso estiverem preenchidos.
  - Em aberto: confirmar se fica no **anel** ou vira **velocímetro meia-lua com ponteiro**.
- Chips de status (Tipo, Conexão, Cripto, Partições, Estado, Local).
- Pílulas de **tipos de arquivo** (acesas = existem no drive).
- Lista de **conteúdo** com termo buscado destacado.
- Botão **"Gerar código do QR"** (produz o texto para a impressora térmica).
- Espaço para **foto do drive** se fundindo no fundo escuro (opcional).

Protótipo validado com o Davi ("Lindo!") em 2026-07-11 — largura de celular.

---

## 7. Design

Referências: templates de apresentação **sci-fi / HUD noturno** (fundo espacial escuro, glows ciano,
linhas finas geométricas, anéis concêntricos, tipografia tech em caixa-alta, gráficos de rosca).
Direção aprovada pelo Davi: **noturno, com glows, fotos de drives modernos se fundindo no fundo escuro**.

### Paleta (travada)
| Uso | Cor |
|---|---|
| Fundo base (noturno) | `#081019` → `#0b1a26` |
| Painéis / cards | `#12222f` |
| **Ciano primário** (bússola/destaque) | `#2ee6e0` |
| Ciano claro (texto/glow) | `#8ffcf6` |
| **Azul-aço secundário** | `#3a7bd5` |
| Texto principal | `#eafeff` / `#ffffff` |
| Texto suave | `#7f96a8` |
| Alerta (drive quase cheio) | âmbar `#f5b544` → vermelho `#e5484d` |

### Breakpoints (mobile-first)
- **≤ 600px** → celular: 1 coluna. (Galaxy S25 reporta ~360px de largura de layout mesmo com 1080px físicos, DPR 3.)
- **601–1024px** → tablet: 2 áreas quando fizer sentido (lista + detalhe).
- **≥ 1025px** → PC: layout largo, cadastro espaçoso, mais colunas visíveis.

### Logo / ícone
- Arquivo: `assets/logo/omnidrive-icon.png` (PNG; SVG ainda não disponível).
- É uma **bússola ciano brilhante** num **quadrado arredondado escuro** — funciona em fundo claro e escuro.
- Uso: **ícone de instalação** (celular, tablet, atalho do PC, favicon) = o quadrado com a bússola;
  **dentro do app / topo** = bússola + palavra "OmniDrive".
- O ciano da logo **é o mesmo** `#2ee6e0` da paleta.

### Fundo

- Imagens em `app/backgrounds/`: `bg-pc.png` (NVMe + circuito, paisagem) no PC/tablet; `bg-mobile.png` em telas ≤600px.
- Aplicado no `background` do `body`, fixo, com camada escura por cima (`rgba(8,16,25,~.78)`) deixando a imagem **discreta** (~15% visível). O nível é ajustável por um número só.
- Texto digitado em campos: **branco `#fff`** (contraste sobre o fundo); placeholder em cinza.

---

## 8. Decisões em aberto

1. ~~Formato do banco~~ **Definido** — ver §4.1 (JSON único no Google Drive, esquema fechado).
2. **Cache offline** no celular (sim/não).
3. **Medidor:** anel (padrão atual) vs velocímetro meia-lua com ponteiro.
4. ~~Stack~~ **Definido** — PWA único (§2.1). Falta escolher hospedagem (GitHub Pages × Firebase Hosting) e framework.
5. Versões extras da logo (SVG; só a bússola sem texto).
6. ~~Redundância/backup~~ **Definido** — ver §3.1 (backups rotativos + revisões do Drive; Apps Script adiado).

---

## 9. Próximos passos

1. ~~Esquema do JSON~~ ✅ (§4.1).
2. ~~Prototipar busca e cadastro~~ ✅ (aprovado 2026-07-11).
3. ~~Confirmar stack~~ ✅ **PWA** único (§2.1).
4. Configurar **Google (OAuth + Drive API)** — setup único.
5. Construir a v1.0.

---

## 10. Sobre (tela do app)

Texto da tela "Sobre" (rascunho — ajustar com o Davi):

> **OmniDrive 1.0**
> Catálogo pessoal de drives físicos (HDs, SSDs, NVMe, pen drives). Guarda o que existe dentro
> de cada drive e permite buscar por qualquer palavra ou por tipo de arquivo, dizendo em qual
> drive o dado está — sem precisar plugar um por um.
> Criado por **Davi Torres**.

---

## 11. Histórico de versões

- **1.0** (em desenvolvimento) — primeira versão: cadastro, busca, tela de detalhe com medidor,
  QR opaco, login Google, banco JSON no Google Drive, locais gerenciados, backups rotativos, tela Sobre.

### Registro de build

- **Fase 1** ✅ (2026-07-11) — esqueleto do PWA (`app/`), design system, tela **Busca**
  (filtro por tipo + destaque do termo + busca parcial sem acento), tela **Detalhe** (anel de
  capacidade com cor por nível) e **Sobre**. Dados de exemplo em `localStorage` (fallback em memória).
  Verificado no navegador via `dev-server.js` (Node puro, porta 5050). Pendências anotadas:
  cards da busca devem virar `button` (acessibilidade por teclado).
- **Fase 2** ✅ (2026-07-11) — **Cadastro** em tela cheia (novo + edição), ID auto, capacidade com
  entrada flexível e eco (+ % de uso), tipos de arquivo, tags, **"+ Novo Local" em modal**, **remoção**
  com modal de confirmação, e **salvar** de verdade (localStorage). CRUD verificado no navegador.
  Fundo noturno com foto de drive (PC `bg-pc.png` / celular `bg-mobile.png`, discreto) e texto digitado branco.
  Navegação movida pro topo (Busca/Novo), Sobre virou botão "i" ao lado do v1.0, bússola grande sobre a busca.
- **Fase 3** ✅ (2026-07-11) — geração de **QR própria** (`app/js/qr.js`, sem dependências): QR v1 nível M,
  modo byte, Reed-Solomon calculado em runtime, seleção de máscara por penalidade. Modal com **ver código**,
  **Copiar** (clipboard) e **exportar PNG/SVG**. Validado por decodificador independente (round-trip: texto
  exato, RS íntegro, format info conforme a norma). Confirmação final no mundo real = escanear com o celular.
- **Fase 4** ✅ (2026-07-11) — login **Google** (Identity Services — única dependência externa do projeto,
  necessária para falar com o login do Google) + leitura/gravação do catálogo como arquivo JSON no Drive do
  usuário (`app/js/cloud.js`, escopo `drive.file`) + **backups rotativos** (cópia datada em pasta
  "OmniDrive Backups" antes de cada gravação, mantém últimas 20) + histórico nativo do Drive.
  Tela **Entrar** com dois caminhos: **Entrar com Google** (nuvem) ou **Continuar sem login** (modo teste
  local, mantém o comportamento das Fases 1–3). Tela Sobre ganhou linha de conta conectada + **Sair**.
  Verificado nesta sessão: script do Google, `OmniCloud`, guard de navegação sem login, modo local, Sair.
  **Pendente de verificação pelo Davi** (login real com conta Google não pode ser testado neste ambiente):
  login efetivo, criação do arquivo no Drive, leitura/gravação, pasta de backups.
- **Fase 5** ✅ (2026-07-11) — produção. Login Google testado e funcionando (arquivo `omnidrive-catalogo.json`
  criado no Drive + pasta de backups confirmada). **Service Worker** (`app/sw.js`) → PWA instalável.
  **Leitura de QR pela câmera** (`abrirScanner`, terceiro botão "Ler QR"): BarcodeDetector nativo com fallback
  de digitação manual; leva direto ao Detalhe do drive. Deploy no **GitHub Pages** via GitHub Actions
  (`.github/workflows/deploy.yml`), repo público `Asgard1anBr/OmniDrive`, URL de produção
  https://asgard1anbr.github.io/OmniDrive/. Origem adicionada no OAuth. Ícone **maskable** dedicado
  (`omnidrive-icon-maskable.png`) para não cortar no Android.

#### Correções pós-lançamento
- **v1.0.1** (2026-07-12) — **câmera do QR**: (1) liberação robusta ao fechar (para trilhas + `video.srcObject=null`
  + `pause()`) — antes a 2ª abertura vinha preta porque a câmera não era solta; (2) `video.play()` explícito na
  abertura; (3) scanner segue lendo após um código desconhecido (antes congelava) + anti-spam do toast (2,5s).
  SW cache `v3→v4`. Também: SW passou a **rede-primeiro para HTML** (corrige versão presa no cache após deploy).
- **v1.0.2** (2026-07-12) — câmera: fallback traseira→qualquer câmera; mensagem de erro com motivo real
  (permissão/ocupada/sem câmera/etc.). SW `v4→v5`. Tela preta persistiu.
- **v1.0.3** (2026-07-12) — hipótese blur: modal do scanner sem `backdrop-filter` (classe `.scan`) + diagnóstico
  `videoWidth=0` na tela. SW `v5→v6`. Tela preta persistiu **sem** o aviso 0×0 → câmera entrega frames; é o
  `<video>` que não renderiza (bug de compositing em GPUs Android).
- **v1.1** (2026-07-12) — **conserto definitivo da câmera**: frames desenhados em `<canvas>` via `drawImage`
  (o `<video>` fica oculto de 2px, só como fonte); `BarcodeDetector.detect(canvas)`. Nova tela **Histórico de
  Versões** (botão no Sobre): constante `VERSAO` + array `CHANGELOG` em `app.js` alimentam Sobre e a tela;
  regra de versionamento atualizada no CLAUDE.md (bump inclui entrada no CHANGELOG). SW `v6→v7`.
