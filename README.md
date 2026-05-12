# Sistema de Controle de Empréstimos Financeiros

Sistema web interno para controle administrativo de clientes, empréstimos, parcelas, pagamentos e relatórios financeiros.

## Stack

- React + Vite
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
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

## Sugestões futuras

- Controle de permissões por papel: admin, operador e somente leitura.
- Tela de cadastro de usuários administradores.
- Anexos de documentos do cliente usando Supabase Storage.
- Contrato PDF gerado automaticamente.
- Notificações de vencimento por e-mail ou WhatsApp.
- Multas e juros por atraso.
- Renegociação de empréstimo.
- Histórico visual de auditoria por entidade.
- Gráficos financeiros com Recharts.
- Testes automatizados com Vitest e Testing Library.
