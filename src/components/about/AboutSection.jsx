import React from "react";
import { Icons } from "../../icons/Icons";

/**
 * @module AboutSection
 * @description Seção institucional "Sobre Nós" contendo o vídeo sobre Brio e os pilares operacionais.
 */
export function AboutSection({ setPage, compact = false }) {
  return (
    <section className="home-about-section" id="sobre-nos">
      {/* Header */}
      <div className="section-header" style={{ marginBottom: "8px" }}>
        <div>
          <div className="section-header__eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Icons.Sparkles /> Cultura & Propósito — Saman & Co.
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>
            Sobre Nós & O Nosso <span style={{ color: "var(--color-primary)" }}>Brio</span>
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginTop: "6px", maxWidth: "680px" }}>
            A mentalidade que move o time TechOps Saman: a busca obstinada pela excelência técnica,
            a rejeição à mediocridade e o compromisso em construir soluções de alto impacto.
          </p>
        </div>
        {setPage && (
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => setPage("about")}
            style={{ alignSelf: "flex-start" }}
          >
            <Icons.Sparkles /> Ver Página Completa
          </button>
        )}
      </div>

      {/* Video Showcase Card */}
      <div className="about-video-card">
        <div className="about-video-card__header">
          <div className="about-video-card__meta">
            <span className="about-tag">
              <Icons.Sparkles /> Pílula de Cultura & Inspiração
            </span>
            <h3 className="about-video-card__title">
              Motivação para Estudar & Trabalhar com Brio
            </h3>
            <p className="about-video-card__author">
              Reflexão fundamental com o <strong>Prof. Clóvis de Barros Filho</strong>
            </p>
          </div>

          <a
            href="https://youtu.be/TRPBY_lxJfE?si=bLQGBPzQHLyBToty"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--outline about-btn-external"
            title="Abrir diretamente no YouTube"
          >
            <Icons.ExternalLink /> Assistir no YouTube
          </a>
        </div>

        {/* Video Player */}
        <div className="about-video-frame-container">
          <div className="about-video-frame">
            <iframe
              src="https://www.youtube.com/embed/TRPBY_lxJfE?rel=0&modestbranding=1"
              title="Motivação para estudar (BRIO) | Clóvis de Barros"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>

        {/* Quote Block */}
        <div className="about-quote-box">
          <div className="about-quote-icon">❝</div>
          <blockquote className="about-quote-text">
            "Brio é não aceitar a mediocridade. É a vergonha na cara de olhar para um desafio difícil
            e dizer: <em>eu tenho capacidade de aprender, de superar e de entregar o meu melhor</em>."
          </blockquote>
          <cite className="about-quote-cite">— Clóvis de Barros Filho</cite>
        </div>
      </div>

      {/* Cultural Pillars Grid */}
      <div className="about-pillars-grid" style={{ marginTop: "8px" }}>
        <div className="pillar-card">
          <div className="pillar-card__icon pillar-card__icon--primary">
            <Icons.Zap />
          </div>
          <h4 className="pillar-card__title">Maestria Técnica & Brio</h4>
          <p className="pillar-card__text">
            Não aceitamos o "mais ou menos". Construímos automações, integrações e rotinas com padrão sênior de engenharia.
          </p>
        </div>

        <div className="pillar-card">
          <div className="pillar-card__icon pillar-card__icon--accent">
            <Icons.TrendingUp />
          </div>
          <h4 className="pillar-card__title">Foco em Resultados Reais</h4>
          <p className="pillar-card__text">
            Nossa tecnologia alavanca negócios, gera receita e destrava a eficiência dos clientes da Saman & Co.
          </p>
        </div>

        <div className="pillar-card">
          <div className="pillar-card__icon pillar-card__icon--info">
            <Icons.Doc />
          </div>
          <h4 className="pillar-card__title">Aprendizado e Documentação</h4>
          <p className="pillar-card__text">
            Playbooks vivos e conhecimento compartilhado. Ninguém fica para trás quando o time estuda e evolui junto.
          </p>
        </div>

        <div className="pillar-card">
          <div className="pillar-card__icon pillar-card__icon--success">
            <Icons.Shield />
          </div>
          <h4 className="pillar-card__title">Integridade & Segurança</h4>
          <p className="pillar-card__text">
            Tratamento rigoroso de credenciais, monitoramento constante e confiabilidade em cada linha operacional.
          </p>
        </div>
      </div>
    </section>
  );
}
