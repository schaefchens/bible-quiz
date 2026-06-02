import React from 'react';
import { toBibleServerUrl } from '../utils/bibleUrl.js';

// Renders a reference string as one or more BibleServer links.
// Multiple references separated by ";" are each linked independently.
// Props:
//   reference – e.g. "Matthäus 3,13–17" or "Matthäus 4,23; Markus 1,1"
//   lang      – 'de' | 'en'
//   className – extra classes for each <a> element
export default function BibleRefLink({ reference, lang, className = '' }) {
  const parts = reference.split(';').map((s) => s.trim()).filter(Boolean);

  return (
    <>
      {parts.map((part, i) => {
        const url = toBibleServerUrl(part, lang);
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-brand-gold/40"> · </span>}
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`underline decoration-brand-gold/40 hover:decoration-brand-gold transition-colors ${className}`}
              >
                {part}
              </a>
            ) : (
              <span className={className}>{part}</span>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}
