# Sistema de Controle de Empréstimos Financeiros

Sistema web interno para controle administrativo de clientes, empréstimos, parcelas, pagamentos e relatórios financeiros.

## Stack

- React + Vite
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage para anexos privados
- Row Level Security no banco
- Netlify para deploy

## Arquitetura proposta

A aplicação é organizada em camadas:

1. **Banco Supabase**
   - Tabelas relacionais para perfis, clientes, empréstimos, parcelas, pagamentos e auditoria.
   - RLS ativado em todas as tabelas.
   - Policies garantindo que cada usuário autenticado acesse apenas os próprios dados.
   - Triggers para `updated_at`.
   - Funções RPC para atualizar atrasos e registrar pagamento de parcela de forma transacional.

2. **Autenticação**
   - Supabase Auth com e-mail e senha.
   - Rotas privadas protegidas por `ProtectedRoute`.
   - Sessão persistida no navegador via Supabase client.

3. **Front-end**
   - Páginas por domínio: Dashboard, Clientes, Detalhes do Cliente, Empréstimos, Detalhes do Empréstimo, Financeiro e Configurações.
   - Componentes reutilizáveis de layout, UI, cards, tabelas e formulários.
   - Serviços centralizados para comunicação com o Supabase.
   - Utilitários para datas, formatação monetária e cálculo de juros simples.

4. **Deploy**
   - Build estático gerado pelo Vite.
   - Deploy no Netlify usando `npm run build` e pasta `dist`.
   - `netlify.toml` já configurado com redirect para SPA.

## Como rodar localmente

```bash
npm install
cp .env.example .env
npm run dev
```

Configure o `.env` com:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

## Banco de dados

1. Crie um projeto no Supabase.
2. Acesse **SQL Editor**.
3. Execute o arquivo:

```text
supabase/schema.sql
```

4. Crie pelo menos um usuário em **Authentication > Users**.
5. Faça login no sistema com esse usuário.

## Item 7 — Anexos com Supabase Storage

A V11 adiciona uma área de anexos nas telas:

- **Detalhes do cliente**: RG, CPF, comprovante de residência e documentos cadastrais.
- **Detalhes do empréstimo**: contrato assinado, comprovantes e documentos do acordo.

Formatos aceitos: PDF, PNG, JPG, WEBP, DOC e DOCX, com limite de 10 MB por arquivo. O bucket `documents` é privado e cada arquivo fica salvo dentro da pasta do usuário autenticado.

Para atualizar um banco que já existe, execute apenas este arquivo no SQL Editor do Supabase:

```text
supabase/v11_document_attachments.sql
```

Esta migration é compatível com bases que usam `user_id` ou `owner_id` para identificar o usuário dono do registro. Ela também evita depender de chave estrangeira direta para `clients` e `loans`, justamente para funcionar em bancos já criados manualmente ou em versões anteriores do projeto.

Depois faça o deploy normalmente no Netlify.

## Build

```bash
npm run build
npm run preview
```

## Deploy no Netlify

1. Suba este projeto para um repositório no GitHub.
2. No Netlify, clique em **Add new project**.
3. Conecte o repositório.
4. Configure:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Em **Project configuration > Environment variables**, cadastre:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Faça o deploy.

## Regras implementadas

- Login e logout com Supabase Auth.
- Rotas privadas.
- CRUD de clientes.
- Cadastro de empréstimos com cálculo automático por juros simples.
- Criação automática das parcelas no banco.
- Listagem de empréstimos com filtros.
- Detalhes do empréstimo com resumo financeiro.
- Marcação de parcela como paga via RPC do banco.
- Criação automática de registro em `payments` ao pagar parcela.
- Atualização automática do status do empréstimo para quitado ou atrasado.
- Dashboard com total emprestado, recebido, aberto, clientes, empréstimos ativos e parcelas vencidas.
- Tela financeira com filtro por mês/ano e exportação CSV.
- Anexos de documentos em clientes e empréstimos com Supabase Storage privado.

## Sugestões futuras

1. Controle de permissões por papel ✅
2. Tela de gestão de usuários ✅
3. Histórico visual de auditoria ✅
4. Multas e juros por atraso ✅
5. Renegociação de empréstimo ✅
6. Contrato PDF automático ✅
7. Anexos de documentos com Supabase Storage ✅
8. Notificações de vencimento
9. Gráficos financeiros com Recharts
10. Testes automatizados

## Funções de Role
admin:
- Cadastrar cliente
- Editar cliente
- Inativar cliente
- Criar empréstimo
- Registrar pagamento
- Visualizar financeiro
- Futuramente gerenciar usuários

operator:
- Cadastrar cliente
- Editar cliente
- Criar empréstimo
- Registrar pagamento
- Visualizar financeiro
- Não deve excluir/inativar coisas críticas, dependendo dos botões que bloqueamos

viewer:
- Visualizar telas
- Não cadastrar
- Não editar
- Não registrar pagamento

Viewer:
- Não vê botão de novo cliente
- Não vê botão de editar
- Não vê botão de registrar pagamento

## Botões e permissões

Operator:
- Vê criar cliente
- Vê editar cliente
- Vê criar empréstimo
- Vê registrar pagamento
- Não vê ações administrativas críticas

Admin:
- Vê tudo
