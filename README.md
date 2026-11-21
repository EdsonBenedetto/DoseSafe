DoseSafe

O DoseSafe é um software voltado à segurança no uso de medicamentos em ambientes hospitalares, desenvolvido para auxiliar na identificação e prevenção de riscos durante o processo de prescrição e administração de medicamentos.

O sistema atua como uma camada de verificação entre as etapas de triagem, prescrição médica e conferência pela enfermaria, permitindo que informações do paciente e das prescrições sejam analisadas antes da continuidade do processo.

Durante a prescrição, o DoseSafe realiza verificações automáticas para identificar possíveis situações de risco, como:

Doses superiores aos limites definidos de acordo com o peso do paciente;
Incompatibilidades relacionadas à via de administração;
Possíveis trocas entre medicamentos semelhantes, conhecidos como LASA (Look-Alike/Sound-Alike).

Quando uma situação de risco é identificada, o sistema emite um alerta ao usuário responsável, possibilitando que o problema seja analisado antes da administração do medicamento.

O DoseSafe também possui autenticação e controle de acesso por perfil, permitindo que enfermeiros, médicos e profissionais da enfermagem tenham acesso às funcionalidades correspondentes às suas responsabilidades. As informações necessárias ao funcionamento da aplicação são armazenadas em um banco de dados.

Objetivo: desenvolver uma solução capaz de fornecer uma camada adicional de segurança ao processo de utilização de medicamentos, auxiliando os profissionais na identificação de possíveis incompatibilidades e riscos relacionados às prescrições.

## Organização do código

As páginas continuam independentes, mas a apresentação e o comportamento ficam em arquivos próprios:

- `src/pages/`: estrutura HTML de cada tela;
- `src/css/base.css`: tokens e regras visuais compartilhadas;
- `src/css/fluent.css`: camada visual comum inspirada no Fluent;
- `src/css/theme.css` e `src/js/theme.js`: tema claro/escuro com preferência salva no navegador;
- `src/css/<tela>.css`: estilos específicos de cada tela;
- `src/js/auth.js` e `src/js/medicamentos.js`: serviços compartilhados de autenticação e regras de medicamentos;
- `src/js/pages/<tela>.js`: interações específicas de cada tela.

Os dados continuam armazenados no navegador nesta etapa. A próxima evolução pode introduzir módulos ES e uma ferramenta de build (por exemplo, Vite), mantendo uma migração gradual das telas; para compartilhamento de dados e autenticação segura entre usuários, será necessário também um backend.
