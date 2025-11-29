# VideoML Editor

Software de análise de vídeos médicos para exames de fluoroscopia utilizando o método ASPEKT.

## 📋 Descrição

VideoML Editor é um software de análise de vídeos médicos desenvolvido para médicos e fonoaudiólogos que precisam examinar vídeos de fluoroscopia. O software oferece ferramentas integradas para análise de timings, movimentos e eventos, com registro direto no software.

### Diferencial

Diferentemente de ferramentas como ImageJ, o VideoML Editor oferece:
- Ferramentas específicas para análise de vídeos médicos
- Registro direto no software
- Interface intuitiva e moderna
- Funciona completamente no navegador (sem necessidade de instalação)

## 🚀 Funcionalidades

### Upload e Gerenciamento de Vídeos
- Suporte para vídeos AVI e MP4
- Upload direto no navegador

### Player de Vídeo
- Controles de reprodução (play, pause)
- Navegação frame a frame (anterior/próximo)
- Timeline de navegação
- Salvar frames de interesse

### Ferramentas de Anotação

#### Ferramentas Disponíveis
- **Pontos**: Marcar pontos específicos no vídeo
- **Linhas**: Desenhar linhas e medir distâncias
- **Seleção Livre**: Desenhar formas livres
- **Pincel**: Pintar áreas com modo adicionar/subtrair
- **Linha Perpendicular**: Criar linhas perpendiculares a linhas existentes

#### Gerenciamento de Geometrias
- Renomear geometrias
- Ocultar/mostrar geometrias
- Deletar geometrias
- Copiar geometrias entre frames
- Mesclar geometrias (pincel e seleção livre)

### Gerenciamento de Frames

Interface com árvore hierárquica para gerenciar:
- Frames de interesse salvos
- Geometrias associadas a cada frame
- Visibilidade de frames e geometrias
- Navegação rápida entre frames

## 🛠️ Tecnologias

- **React** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool
- **MUI (Material-UI)** - Componentes de interface
- **react-konva** - Canvas para desenho e anotações
- **Vitest** - Framework de testes

## 📦 Instalação e Uso

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Executar testes
npm run test

# Build para produção
npm run build
```

### Deploy

O projeto está configurado para deploy automático no GitHub Pages através do GitHub Actions. Cada push para a branch `main` gera um novo deploy automaticamente.

## 🏗️ Arquitetura

O projeto segue boas práticas de engenharia de software:

### Estrutura de Pastas

```
src/
├── components/        # Componentes React
│   ├── VideoUpload.tsx
│   ├── VideoPlayer.tsx
│   ├── AnnotationCanvas.tsx
│   ├── ToolBar.tsx
│   └── FramesSidebar.tsx
├── contexts/          # Contextos React (gerenciamento de estado)
│   └── AppContext.tsx
├── types/            # Definições de tipos TypeScript
│   └── index.ts
├── hooks/            # Custom hooks
├── utils/            # Funções utilitárias
└── test/             # Configuração de testes
```

### Princípios Aplicados

- **SOLID**: Separação de responsabilidades, componentes com única responsabilidade
- **Clean Code**: Código legível e bem documentado
- **Component-Based**: Arquitetura baseada em componentes reutilizáveis
- **Type Safety**: TypeScript para garantir type safety
- **State Management**: Context API para gerenciamento de estado global
- **Testing**: Testes automatizados com Vitest

## 🧪 Testes

O projeto inclui testes automatizados para garantir qualidade e robustez:

```bash
# Executar testes
npm run test

# Executar testes com UI
npm run test:ui

# Gerar relatório de cobertura
npm run test:coverage
```

## 📱 UX/UI

A interface foi desenvolvida seguindo boas práticas de UX/UI:

- Interface intuitiva e limpa
- Componentes Material Design (MUI)
- Layout responsivo
- Feedback visual para ações do usuário
- Organização hierárquica de informações

## 🌐 Acesso

O aplicativo estará disponível no GitHub Pages após o deploy.

## 📄 Licença

Este projeto foi desenvolvido como parte do Projeto Final de Programação.

## 👥 Autores

Desenvolvido para médicos e fonoaudiólogos especializados em análise de fluoroscopia.
