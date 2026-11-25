DoseSafe

O DoseSafe é um software voltado à segurança no uso de medicamentos em ambientes hospitalares, desenvolvido para auxiliar na identificação e prevenção de riscos durante o processo de prescrição e administração de medicamentos.

O protótipo apresenta telas para triagem, prescrição médica e conferência pela enfermaria. Nesta versão, esses fluxos são demonstrações independentes e não compartilham registros entre si nem se conectam a um prontuário eletrônico.

Durante a prescrição, o DoseSafe realiza verificações automáticas para identificar possíveis situações de risco, como:

Doses superiores aos limites definidos de acordo com o peso do paciente;
Incompatibilidades relacionadas à via de administração;
Possíveis trocas entre medicamentos semelhantes, conhecidos como LASA (Look-Alike/Sound-Alike).

Quando uma situação de risco é identificada, o sistema emite um alerta ao usuário responsável, possibilitando que o problema seja analisado antes da administração do medicamento.

O DoseSafe também possui autenticação demonstrativa e controle de acesso por perfil. Cadastros, medicamentos, tema, triagens e prescrições são guardados no armazenamento local do navegador; não há banco de dados ou autenticação segura entre usuários nesta etapa. Os dados não são sincronizados entre navegadores ou dispositivos.

Objetivo: evoluir o protótipo para uma solução capaz de fornecer uma camada adicional de segurança ao processo de utilização de medicamentos, auxiliando profissionais na identificação de possíveis incompatibilidades e riscos relacionados às prescrições.

## Organização do código

As páginas continuam independentes, mas a apresentação e o comportamento ficam em arquivos próprios:

- `src/pages/`: estrutura HTML de cada tela;
- `src/css/base.css`: tokens e regras visuais compartilhadas;
- `src/css/fluent.css`: camada visual comum inspirada no Fluent;
- `src/css/theme.css` e `src/js/theme.js`: tema claro/escuro com preferência salva no navegador;
- `src/css/<tela>.css`: estilos específicos de cada tela;
- `src/js/auth.js`, `src/js/data.js` e `src/js/medicamentos.js`: serviços compartilhados de autenticação, armazenamento local e regras de medicamentos;
- `src/js/pages/<tela>.js`: interações específicas de cada tela.

Os dados continuam armazenados no navegador nesta etapa. A próxima evolução pode introduzir módulos ES e uma ferramenta de build (por exemplo, Vite), mantendo uma migração gradual das telas; para compartilhamento de dados e autenticação segura entre usuários, será necessário também um backend.

### Sincronização automática da lista de ICs

O workspace do VS Code inicia `tools/sync_ics.py --watch` ao ser aberto. O sincronizador atualiza a planilha `docs/gc/tabela_mudanças.xlsx`, observa mudanças nos arquivos associados a um IC e também commits novos; nos dois casos, registra `Gustavo Farias` como responsável. Essa atribuição segue a convenção definida pela equipe; o sistema de arquivos não identifica a pessoa que editou o arquivo. Como o commit já foi concluído quando detectado, a atualização da planilha fica como alteração local para um commit posterior. Na primeira abertura, autorize a execução da tarefa automática do workspace se o VS Code solicitar.

Para executar manualmente uma sincronização, use `python3 tools/sync_ics.py`. A planilha deve estar fechada durante a gravação; se estiver aberta no LibreOffice, o sincronizador aguarda o fechamento antes de aplicar a atualização. O modo contínuo pode ser encerrado com `Ctrl+C` no terminal da tarefa.
