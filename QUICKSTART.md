# 🚀 Zapiar Flow - Quick Start Guide

## ⚡ 30 Segundos para Começar

```bash
cd /Users/mauricio/zapiar-flow
npm run dev
```

Abra: **http://localhost:3000**

---

## 📋 Checklist de Inicialização (5 minutos)

- [ ] Crie conta no Supabase (https://supabase.com)
- [ ] Configure variáveis em `.env.local`
- [ ] Execute SQL migrations no Supabase
- [ ] Rode `npm install` 
- [ ] Rode `npm run dev`
- [ ] Acesse http://localhost:3000
- [ ] Crie conta
- [ ] Crie workspace
- [ ] Crie seu primeiro fluxo!

---

## 🎯 Usando o Editor (2 minutos)

1. **Arraste componentes** da barra esquerda para o canvas
2. **Clique em um nó** para editar suas propriedades (painel direito)
3. **Conecte nós** clicando e arrastando entre os handles (bolinhas)
4. **Delete nós** selecionando e pressionando Delete
5. **Zoom** com scroll ou Ctrl+Scroll
6. **Pan** com Espaço + Drag

---

## 📚 Documentação Rápida

| Arquivo | Uso |
|---------|-----|
| [SETUP.md](./SETUP.md) | Setup passo-a-passo |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Guia de desenvolvimento |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Como contribuir |
| [FAQ.md](./FAQ.md) | Perguntas frequentes |
| [Zapiar_Flow_SPEC.md](./Zapiar_Flow_SPEC.md) | Especificação completa |

---

## 🔧 Comandos Principais

```bash
# Desenvolvimento
npm run dev              # Start dev server

# Validação
npm run type-check       # Verificar TypeScript
npm run build            # Build para produção
npm run lint             # Lint (não implementado)

# Instalação
npm install              # Instalar dependências
```

---

## 📊 Stack Resumido

```
Frontend          Backend
─────────────     ──────────
React 18      ←→  Supabase
TypeScript        PostgreSQL
Tailwind CSS      JWT Auth
React Flow        RLS
Zustand
Vite
```

---

## ✨ Features Implementadas

✅ Autenticação (sign up/in/out)  
✅ Workspaces  
✅ Editor visual com 9 tipos de nós  
✅ Component library  
✅ Propriedades editáveis  
✅ Canvas infinito (zoom/pan)  
✅ Persistência (banco de dados)  

---

## 🎨 Componentes Disponíveis

| Ícone | Componente | Função |
|-------|-----------|--------|
| ▶ | Início | Inicia o fluxo |
| 💬 | Mensagem | Envia mensagem |
| ❓ | Pergunta | Faz pergunta |
| 🔘 | Botões | Mostra opções |
| 🔀 | Condição | Toma decisões |
| 📝 | Variável | Define variável |
| ⏱ | Aguardar | Pausa execução |
| 🌐 | HTTP | Faz requisição |
| ⏹ | Fim | Encerra fluxo |

---

## 🚨 Troubleshooting Rápido

**Erro: "Missing Supabase environment variables"**
```bash
cat .env.local
# Deve ter:
# VITE_SUPABASE_URL=https://...
# VITE_SUPABASE_ANON_KEY=eyJ...
```

**Erro: "Cannot connect to database"**
- Verificar se SQL foi executado em Supabase
- Ir para: Supabase → SQL Editor → Executar `SELECT 1`

**Aplicação não atualiza**
```bash
# Parar servidor (Ctrl + C) e reiniciar
npm run dev
```

**Limpar tudo e recomeçar**
```bash
rm -rf node_modules .vite dist
npm install
npm run dev
```

---

## 🎓 Aprendendo

1. **React Flow**: [reactflow.dev](https://reactflow.dev)
2. **Zustand**: [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand)
3. **Supabase**: [supabase.com/docs](https://supabase.com/docs)
4. **TypeScript**: [typescriptlang.org](https://www.typescriptlang.org)

---

## 🤝 Próximas Ações

### Para Usuários
1. Explore o editor
2. Crie fluxos de teste
3. Dê feedback
4. Reporte bugs

### Para Desenvolvedores
1. Leia [DEVELOPMENT.md](./DEVELOPMENT.md)
2. Implemente Sprint 3 (Persistência)
3. Implemente Sprint 4 (Flow Engine)
4. Adicione testes

---

## 📞 Suporte

- 📖 Consulte [DEVELOPMENT.md](./DEVELOPMENT.md)
- ❓ Veja [FAQ.md](./FAQ.md)
- 📋 Leia [Zapiar_Flow_SPEC.md](./Zapiar_Flow_SPEC.md)
- 💻 Abra uma issue/PR

---

## ✅ Pronto!

```bash
cd /Users/mauricio/zapiar-flow
npm run dev
# Acesse http://localhost:3000
# Crie uma conta e comece a construir! 🚀
```

**Status**: Pronto para produção (fase MVP)  
**Última atualização**: 18/08/2026  
**Tempo de setup**: ~5 minutos  

---

**Divirta-se construindo automações! 🎉**
