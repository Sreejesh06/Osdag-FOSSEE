import { useMemo } from 'react';

export interface BridgeSchematicProps {
  carriagewayWidth: number;
  footpathWidth: number;
  overhangWidth: number;
  girderCount: number;
  girderSpacing: number;
  span: number;
  structureType: string;
  showLeftFootpath: boolean;
  showRightFootpath: boolean;
  validationHighlights?: {
    deck?: boolean;
    girders?: boolean;
    footpaths?: boolean;
    overhangs?: boolean;
  };
}

const VIEWBOX_WIDTH = 440;
const VIEWBOX_HEIGHT = 260;
const MARGIN = 36;
const HIGHLIGHT_COLOR = '#d53b2a';
const TEXT_COLOR = '#1f2b3a';
const DIMENSION_COLOR = 'rgba(31,43,58,0.55)';

const BridgeSchematic = ({
  carriagewayWidth,
  footpathWidth,
  overhangWidth,
  girderCount,
  girderSpacing,
  span,
  structureType,
  showLeftFootpath,
  showRightFootpath,
  validationHighlights,
}: BridgeSchematicProps) => {
  const leftFootpath = showLeftFootpath ? footpathWidth : 0;
  const rightFootpath = showRightFootpath ? footpathWidth : 0;
  const overallWidth = carriagewayWidth + leftFootpath + rightFootpath + 2 * overhangWidth;
  const highlights = validationHighlights ?? {};

  const invalidReason = useMemo(() => {
    if (!Number.isFinite(overallWidth) || overallWidth <= 0) {
      return 'Total width must be greater than 0 m to render the schematic.';
    }
    if (!Number.isFinite(girderCount) || girderCount < 1) {
      return 'At least one girder is required for the schematic view.';
    }
    if (!Number.isFinite(girderSpacing) || girderSpacing <= 0) {
      return 'Girder spacing must be greater than 0 m.';
    }
    return null;
  }, [overallWidth, girderCount, girderSpacing]);

  if (invalidReason) {
    return (
      <div className="bridge-view__fallback" role="status">
        <p>{invalidReason}</p>
        <p>Please revise the geometry inputs.</p>
      </div>
    );
  }

  const spanText = `${span.toFixed(2)} m span`;
  const girderText = `${girderCount} girders @ ${girderSpacing.toFixed(2)} m`;
  const scale = (VIEWBOX_WIDTH - MARGIN * 2) / overallWidth;
  const toPx = (value: number) => value * scale;
  const overallWidthPx = toPx(overallWidth);
  const leftEdge = (VIEWBOX_WIDTH - overallWidthPx) / 2;
  const deckHeight = 58;
  const carriagewayHeight = 34;
  const deckTop = VIEWBOX_HEIGHT / 2 - deckHeight / 2;
  const deckBottom = deckTop + deckHeight;
  const supportHeight = 46;
  const supportY = deckBottom + 8;

  const girderPositions = useMemo(() => {
    if (girderCount === 1) {
      return [0];
    }
    const offset = ((girderCount - 1) * girderSpacing) / 2;
    return Array.from({ length: girderCount }, (_value, index) => index * girderSpacing - offset);
  }, [girderCount, girderSpacing]);

  const renderDimension = (xStart: number, xEnd: number, y: number, label: string) => {
    const arrowSize = 6;
    return (
      <g className="schematic-dimension" aria-hidden="true">
        <line x1={xStart} x2={xEnd} y1={y} y2={y} stroke={DIMENSION_COLOR} strokeWidth={1} strokeDasharray="4 4" />
        <polygon
          points={`${xStart},${y} ${xStart + arrowSize},${y - 4} ${xStart + arrowSize},${y + 4}`}
          fill={DIMENSION_COLOR}
        />
        <polygon
          points={`${xEnd},${y} ${xEnd - arrowSize},${y - 4} ${xEnd - arrowSize},${y + 4}`}
          fill={DIMENSION_COLOR}
        />
        <text x={(xStart + xEnd) / 2} y={y - 6} textAnchor="middle" className="schematic-dimension__label">
          {label}
        </text>
      </g>
    );
  };

  const deckTooltip = highlights.deck || highlights.overhangs ? 'Deck overhang exceeds the permitted range.' : 'Deck slab carrying the carriageway and footpaths.';
  const girderTooltip = highlights.girders
    ? 'Girder spacing/count invalid. Adjust spacing or number of girders.'
    : 'Primary girders transferring loads to supports.';
  const footpathTooltip = highlights.footpaths ? 'Footpath width invalid. Keep between 0.5 m and 3 m.' : 'Optional pedestrian footpath zone.';

  return (
    <div className="bridge-view__schematic">
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        role="img"
        aria-label="Bridge 2D schematic"
        shapeRendering="geometricPrecision"
      >
        <defs>
          <linearGradient id="schematic-bg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fbff" />
            <stop offset="100%" stopColor="#eef2fb" />
          </linearGradient>
          <pattern id="schematic-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="rgba(31,43,58,0.08)" strokeWidth="0.75" />
          </pattern>
          <filter id="schematic-shadow" x="-10%" y="-10%" width="120%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="rgba(4,17,36,0.15)" />
          </filter>
        </defs>

        <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#schematic-bg)" rx="18" />
        <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="url(#schematic-grid)" rx="18" opacity="0.8" />

        {/* Deck */}
        <rect
          x={leftEdge}
          y={deckTop}
          width={overallWidthPx}
          height={deckHeight}
          rx="10"
          fill={highlights.deck ? 'rgba(213,59,42,0.14)' : '#f4f7ff'}
          stroke={highlights.deck ? HIGHLIGHT_COLOR : '#a8b4ce'}
          strokeWidth={2}
          filter="url(#schematic-shadow)"
        >
          <title>{deckTooltip}</title>
        </rect>

        {/* Overhang accents */}
        {[leftEdge, leftEdge + overallWidthPx - toPx(overhangWidth)].map((edgeX, index) => (
          <rect
            key={`overhang-${index}`}
            x={edgeX}
            y={deckTop + 4}
            width={toPx(overhangWidth)}
            height={deckHeight - 8}
            fill="none"
            stroke={highlights.overhangs ? HIGHLIGHT_COLOR : 'rgba(31,43,58,0.25)'}
            strokeDasharray="6 6"
            strokeWidth={1.5}
          >
            <title>{deckTooltip}</title>
          </rect>
        ))}

        {/* Carriageway */}
        <rect
          x={leftEdge + toPx(overhangWidth + leftFootpath)}
          y={VIEWBOX_HEIGHT / 2 - carriagewayHeight / 2}
          width={toPx(carriagewayWidth)}
          height={carriagewayHeight}
          rx="8"
          fill={highlights.deck ? 'rgba(213,59,42,0.2)' : '#dfe6f9'}
          stroke={highlights.deck ? HIGHLIGHT_COLOR : '#90a4d4'}
          strokeWidth={2}
        >
          <title>Carriageway width {carriagewayWidth.toFixed(2)} m</title>
        </rect>

        {/* Footpaths */}
        {showLeftFootpath && (
          <rect
            x={leftEdge + toPx(overhangWidth)}
            y={VIEWBOX_HEIGHT / 2 - carriagewayHeight / 2 - 12}
            width={toPx(footpathWidth)}
            height={carriagewayHeight + 24}
            rx="6"
            fill={highlights.footpaths ? 'rgba(213,59,42,0.18)' : '#fbf6e4'}
            stroke={highlights.footpaths ? HIGHLIGHT_COLOR : '#d8c27a'}
            strokeWidth={1.8}
          >
            <title>{footpathTooltip}</title>
          </rect>
        )}
        {showRightFootpath && (
          <rect
            x={leftEdge + toPx(overhangWidth + leftFootpath + carriagewayWidth)}
            y={VIEWBOX_HEIGHT / 2 - carriagewayHeight / 2 - 12}
            width={toPx(footpathWidth)}
            height={carriagewayHeight + 24}
            rx="6"
            fill={highlights.footpaths ? 'rgba(213,59,42,0.18)' : '#fbf6e4'}
            stroke={highlights.footpaths ? HIGHLIGHT_COLOR : '#d8c27a'}
            strokeWidth={1.8}
          >
            <title>{footpathTooltip}</title>
          </rect>
        )}

        {/* Girders and supports */}
        {girderPositions.map((position, index) => (
          <g key={`schematic-girder-${index}`}>
            <line
              x1={VIEWBOX_WIDTH / 2 + toPx(position)}
              x2={VIEWBOX_WIDTH / 2 + toPx(position)}
              y1={deckBottom}
              y2={deckBottom + supportHeight}
              stroke={highlights.girders ? HIGHLIGHT_COLOR : '#4a4f5d'}
              strokeWidth={3}
              strokeLinecap="round"
            >
              <title>{girderTooltip}</title>
            </line>
            <rect
              x={VIEWBOX_WIDTH / 2 + toPx(position) - 10}
              y={supportY + supportHeight - 6}
              width={20}
              height={6}
              fill={highlights.girders ? 'rgba(213,59,42,0.4)' : '#9ea3b2'}
              rx={2}
            />
          </g>
        ))}

        {/* Dimension guides */}
        {renderDimension(leftEdge, leftEdge + overallWidthPx, deckTop - 18, `Overall ${overallWidth.toFixed(2)} m`)}
        {showLeftFootpath &&
          renderDimension(
            leftEdge + toPx(overhangWidth),
            leftEdge + toPx(overhangWidth + footpathWidth),
            deckTop - 44,
            `Footpath ${footpathWidth.toFixed(2)} m`,
          )}
        {renderDimension(
          leftEdge + toPx(overhangWidth + leftFootpath),
          leftEdge + toPx(overhangWidth + leftFootpath + carriagewayWidth),
          deckTop - 32,
          `Carriageway ${carriagewayWidth.toFixed(2)} m`,
        )}
        {showRightFootpath &&
          renderDimension(
            leftEdge + toPx(overhangWidth + leftFootpath + carriagewayWidth),
            leftEdge + toPx(overhangWidth + leftFootpath + carriagewayWidth + footpathWidth),
            deckTop - 44,
            `Footpath ${footpathWidth.toFixed(2)} m`,
          )}

        {/* Legend & labels */}
        <text x="50%" y={deckTop - 60} textAnchor="middle" className="bridge-view__schematic-label">
          {structureType}
        </text>
        <text x="50%" y={deckBottom + supportHeight + 38} textAnchor="middle" className="bridge-view__schematic-label">
          {spanText} · {girderText}
        </text>

        <g className="schematic-legend" transform={`translate(${leftEdge}, ${deckBottom + supportHeight + 6})`}>
          <rect width="12" height="12" rx="3" fill="#dfe6f9" stroke="#90a4d4" />
          <text x="18" y="10" fill={TEXT_COLOR}>Carriageway</text>
          <rect x="130" width="12" height="12" rx="3" fill="#fbf6e4" stroke="#d8c27a" />
          <text x="148" y="10" fill={TEXT_COLOR}>Footpath</text>
          <rect x="240" width="12" height="12" rx="3" fill="#f4f7ff" stroke="#a8b4ce" />
          <text x="258" y="10" fill={TEXT_COLOR}>Deck</text>
        </g>
      </svg>
    </div>
  );
};

export { BridgeSchematic };
