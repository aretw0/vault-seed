export const VAULT_FOLDERS = [
  '00 - Entrada',
  '10 - Diário',
  '20 - Projetos',
  '30 - Áreas',
  '40 - Recursos',
  '50 - Arquivo',
  '90 - Modelos',
  '99 - Meta e Anexos',
];

export const PUBLISHED_VAULT_FOLDERS = VAULT_FOLDERS.filter(
  (folder) => folder !== '90 - Modelos',
);
