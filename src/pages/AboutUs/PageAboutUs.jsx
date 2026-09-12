import React from "react";
import { Icons } from "../../icons/Icons";

/**
 * @module PageAboutUs
 * @description Área "Sobre Nós" apresentando a cultura, o conceito de "Brio" e o propósito do TechOps Saman & Co.
 */
export default function PageAboutUs({ setPage }) {
  return (
    <div className="about-page">
      {/* Hero Header */}
      <section className="about-hero">
        <div className="about-hero__badge">
          <Icons.Sparkles /> Cultura & Propósito — Saman & Co.
        </div>
        <h1 className="about-hero__title">
          Sobre Nós & O Nosso <span>Brio</span>
        </h1>
        <p className="about-hero__subtitle">
          Entenda a mentalidade que move o time TechOps Saman: a busca obstinada pela excelência técnica,
          a rejeição à mediocridade e o compromisso diário em construir as melhores soluções para nossos clientes.
        </p>
      </section>

      {/* Main Feature: Video Card */}
      <section className="about-video-card">
        <div className="about-video-card__header">
          <div className="about-video-card__meta">
            <span className="about-tag">
              <Icons.Sparkles /> Pílula de Cultura
            </span>
            <h2 className="about-video-card__title">
              Motivação para Estudar & Trabalhar com Brio
            </h2>
            <p className="about-video-card__author">
              Palestra com <strong>Prof. Clóvis de Barros Filho</strong>
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

        {/* Video Player Container */}
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

        {/* Reflection / Takeaways Highlight */}
        <div className="about-quote-box">
          <div className="about-quote-icon">❝</div>
          <blockquote className="about-quote-text">
            "Brio é não aceitar a mediocridade. É a vergonha na cara de olhar para um desafio difícil
            e dizer: <em>eu tenho capacidade de aprender, de superar e de entregar o meu melhor</em>."
          </blockquote>
          <cite className="about-quote-cite">— Clóvis de Barros Filho</cite>
        </div>
      </section>

      {/* Cultural Pillars Grid */}
      <section className="about-pillars-section">
        <div className="about-pillars-header">
          <span className="section-header__eyebrow">Nossos Pilares</span>
          <h2 className="about-pillars-title">Como aplicamos o Brio no TechOps</h2>
          <p className="about-pillars-desc">
            Quatro princípios fundamentais que guiam nossa rotina de desenvolvimento, integrações e operações.
          </p>
        </div>

        <div className="about-pillars-grid">
          <div className="pillar-card">
            <div className="pillar-card__icon pillar-card__icon--primary">
              <Icons.Zap />
            </div>
            <h3 className="pillar-card__title">Maestria Técnica & Capricho</h3>
            <p className="pillar-card__text">
              Não entregamos soluções 'pela metade'. Cada automação n8n, webhook, bot ou linha de código é construída com robustez, tratamento de erros e legibilidade.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-card__icon pillar-card__icon--accent">
              <Icons.TrendingUp />
            </div>
            <h3 className="pillar-card__title">Foco Obstinado em Resultados</h3>
            <p className="pillar-card__text">
              Tecnologia só tem valor quando gera impacto no negócio. Nossos sistemas existem para acelerar vendas, reduzir atritos e potencializar a escala dos clientes.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-card__icon pillar-card__icon--info">
              <Icons.Doc />
            </div>
            <h3 className="pillar-card__title">Aprendizado Contínuo & Docs</h3>
            <p className="pillar-card__text">
              O conhecimento deve ser compartilhado. Mantemos nossa Base de Conhecimento viva com playbooks e guias, garantindo que o time evolua junto constantemente.
            </p>
          </div>

          <div className="pillar-card">
            <div className="pillar-card__icon pillar-card__icon--success">
              <Icons.Shield />
            </div>
            <h3 className="pillar-card__title">Responsabilidade & Segurança</h3>
            <p className="pillar-card__text">
              Guardamos as credenciais e dados dos nossos clientes com integridade absoluta, monitorando fluxos 24/7 para antecipar qualquer anomalia.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Navigation Footer Action */}
      <section className="about-cta-card">
        <div className="about-cta-content">
          <h3>Pronto para aplicar a excelência no seu dia a dia?</h3>
          <p>
            Explore nossa documentação técnica ou consulte os dashboards para acompanhar o desempenho da nossa operação.
          </p>
        </div>
        <div className="about-cta-buttons">
          {setPage && (
            <>
              <button className="btn btn--primary" onClick={() => setPage("docs")}>
                <Icons.Doc /> Ir para Documentos
              </button>
              <button className="btn btn--outline" onClick={() => setPage("dashboard")}>
                <Icons.Dashboard /> Ver Dashboard
              </button>
            </>
          )}
        </div>
      </section>

      {/* Footer text */}
      <div className="home-footer" style={{ marginTop: "32px" }}>
        <span>TechOps Saman & Co. — Central de Operações & Cultura</span>
      </div>
    </div>
  );
}
