import { describe, it, expect } from 'vitest';
import { slugify } from '../slugify.js';

describe('slugify', () => {
  it('strips numeric prefix from folder segment', () => {
    expect(slugify('40 - Recursos/O que é PARA')).toBe('recursos/o-que-e-para');
  });

  it('handles title without folder prefix', () => {
    expect(slugify('O que é o método PARA')).toBe('o-que-e-o-metodo-para');
  });

  it('strips diacritics and lowercases', () => {
    expect(slugify('Diário')).toBe('diario');
  });

  it('handles deeply nested paths', () => {
    expect(slugify('20 - Projetos/Planejar Férias')).toBe('projetos/planejar-ferias');
  });

  it('handles 99 - Meta e Anexos folder', () => {
    expect(slugify('99 - Meta e Anexos/Guia do Jardineiro Digital')).toBe(
      'meta-e-anexos/guia-do-jardineiro-digital'
    );
  });

  it('removes non-alphanumeric characters except hyphens and slashes', () => {
    expect(slugify('30 - Áreas/Saúde & Bem-Estar')).toBe('areas/saude-bem-estar');
  });
});
