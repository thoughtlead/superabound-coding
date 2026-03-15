/* eslint-disable @next/next/no-img-element */

import { LessonBlock } from "@/utils/library";

type MediaBlockProps = {
  block: LessonBlock;
  variant?: "default" | "hero";
};

function getVimeoEmbed(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : url;
}

function getWistiaEmbed(url: string) {
  const match = url.match(/(?:medias|iframe)\/([a-zA-Z0-9]+)/);
  return match ? `https://fast.wistia.net/embed/iframe/${match[1]}` : url;
}

function getEmbedUrl(block: LessonBlock) {
  if (block.embedUrl) {
    return block.embedUrl;
  }

  if (!block.mediaUrl) {
    return null;
  }

  if (block.mediaProvider === "vimeo") {
    return getVimeoEmbed(block.mediaUrl);
  }

  if (block.mediaProvider === "wistia") {
    return getWistiaEmbed(block.mediaUrl);
  }

  return block.mediaUrl;
}

export function MediaBlock({ block, variant = "default" }: MediaBlockProps) {
  if (block.type === "rich_text" && block.body) {
    return (
      <section className="panel lesson-panel">
        {block.title ? <h2>{block.title}</h2> : null}
        <div
          className="rich-text"
          dangerouslySetInnerHTML={{ __html: block.body }}
        />
      </section>
    );
  }

  if (block.type === "video") {
    const embedUrl = getEmbedUrl(block);
    const isHero = variant === "hero";

    return (
      <section className={isHero ? "lesson-hero-media" : "panel lesson-panel"}>
        {!isHero && block.title ? <h2>{block.title}</h2> : null}
        {embedUrl ? (
          <div className={isHero ? "media-frame media-frame-hero" : "media-frame"}>
            <iframe
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              src={embedUrl}
              title={block.title ?? "Lesson video"}
            />
          </div>
        ) : (
          <p>Video URL missing.</p>
        )}
      </section>
    );
  }

  if (block.type === "audio") {
    return (
      <section className="panel lesson-panel">
        {block.title ? <h2>{block.title}</h2> : null}
        {block.mediaUrl ? (
          <audio controls className="audio-player" preload="metadata">
            <source src={block.mediaUrl} />
          </audio>
        ) : (
          <p>Audio URL missing.</p>
        )}
      </section>
    );
  }

  if (block.type === "image" && block.mediaUrl) {
    return (
      <section className="panel lesson-panel">
        <figure className="content-image">
          <img
            alt={block.title ?? "Lesson image"}
            className="content-image-asset"
            src={block.mediaUrl}
          />
          {block.title ? <figcaption>{block.title}</figcaption> : null}
        </figure>
      </section>
    );
  }

  if (block.type === "download" && block.mediaUrl) {
    return (
      <section className="panel lesson-panel">
        <a
          className="button button-secondary"
          href={block.mediaUrl}
          target="_blank"
          rel="noreferrer"
        >
          {block.title ?? "Open download"}
        </a>
      </section>
    );
  }

  return null;
}
