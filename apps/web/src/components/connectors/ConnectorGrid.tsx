import { useState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import type { ConnectorDef } from '../../lib/connectors/catalog';
import { BrandIcon } from './BrandIcons';
import ConnectorSetupModal from './ConnectorSetupModal';

type Props = {
  connectors: ConnectorDef[];
  installedSlugs: Set<string>;
  onInstalled: () => void;
  emptyLabel?: string;
};

export default function ConnectorGrid({
  connectors,
  installedSlugs,
  onInstalled,
  emptyLabel = 'No connectors in this category.',
}: Props) {
  const [active, setActive] = useState<ConnectorDef | null>(null);

  return (
    <>
      <div className="vfy-tools-grid">
        {connectors.map((c) => {
          const installed = installedSlugs.has(c.template.slug);
          return (
            <button
              key={c.id}
              type="button"
              className={`vfy-tools-card vfy-connector-card${installed ? ' is-installed' : ''}`}
              onClick={() => setActive(c)}
            >
              <span className="vfy-connector-icon">
                <BrandIcon brand={c.brand} size={24} />
              </span>
              <span className="vfy-tools-card-title">{c.name}</span>
              {(installed || c.badge) && (
                <span className="vfy-tools-card-meta">
                  {installed ? (
                    <span className="vfy-tag vfy-tag--ok">
                      <Check size={10} aria-hidden /> Connected
                    </span>
                  ) : (
                    <span className="vfy-tag">{c.badge}</span>
                  )}
                </span>
              )}
              <span className="vfy-tools-card-desc">{c.description}</span>
              <span className="vfy-tools-card-cta">
                {installed ? 'Manage setup' : 'Connect'}
                <ArrowUpRight size={12} />
              </span>
            </button>
          );
        })}
        {connectors.length === 0 && <p className="vfy-settings-empty">{emptyLabel}</p>}
      </div>

      {active && (
        <ConnectorSetupModal
          connector={active}
          open
          onClose={() => setActive(null)}
          onInstalled={onInstalled}
        />
      )}
    </>
  );
}
