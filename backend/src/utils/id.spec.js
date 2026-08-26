import { describe, it, expect } from 'vitest';
import { createId, slugify } from './id.js';

describe('id utils', () => {
  it('should generate a valid UUID', () => {
    const id = createId();
    expect(id).toBeDefined();
    expect(typeof id).toBe('string');
    expect(id.length).toBe(36);
  });

  it('should slugify correctly', () => {
    expect(slugify('Olá Mundo!')).toBe('ola-mundo');
    expect(slugify('Teste 123 - @!#')).toBe('teste-123');
    expect(slugify('   espaços   ')).toBe('espacos');
  });
});
