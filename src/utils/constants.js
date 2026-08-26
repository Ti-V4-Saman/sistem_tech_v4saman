/**
 * @module constants
 * @description Constantes globais do sistema TechOps.
 */


/** Módulos disponíveis para permissões. */
export const AVAILABLE_MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "clients", label: "Clientes" },
  { id: "automations", label: "Automações" },
  { id: "docs", label: "Documentos" },
  { id: "tickets", label: "Tickets" },
  { id: "incidents", label: "Incidentes" },
  { id: "users", label: "Usuários" },
];

/** Metadados padrão para o módulo de usuários (fallback quando a API não retorna). */
export const DEFAULT_METADATA = {
  accessRoles: [
    { slug: "super-admin", name: "Super Admin" },
    { slug: "admin", name: "Admin" },
    { slug: "user", name: "User" },
  ],
  jobRoles: [
    { slug: "account", name: "Account" },
    { slug: "gestor-trafego", name: "Gestor de Tráfego" },
    { slug: "designer", name: "Designer" },
    { slug: "copywriting", name: "Copywriting" },
    { slug: "coordenador", name: "Coordenador" },
    { slug: "gerente", name: "Gerente" },
  ],
  teams: [
    { slug: "seals", name: "Seals" },
    { slug: "bravo", name: "Bravo" },
    { slug: "balboa", name: "Balboa" },
    { slug: "briu", name: "Briu" },
    { slug: "snipers", name: "Snipers" },
  ],
  seniorities: [],
  areas: [],
  businessUnits: [],
};
