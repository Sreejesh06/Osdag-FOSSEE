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
}

const VIEWBOX_WIDTH = 440;
const VIEWBOX_HEIGHT = 240;
const MARGIN = 32;

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
}: BridgeSchematicProps) => {
  const leftFootpath = showLeftFootpath ? footpathWidth : 0;
  const rightFootpath = showRightFootpath ? footpathWidth : 0;
  const overallWidth = carriagewayWidth + leftFootpath + rightFootpath + 2 * overhangWidth;

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
  const deckHeight = 60;
  const carriagewayHeight = 36;

  const girderPositions = useMemo(() => {
    if (girderCount === 1) {
      return [0];
    }
    const offset = ((girderCount - 1) * girderSpacing) / 2;
    return Array.from({ length: girderCount }, (_value, index) => index * girderSpacing - offset);
  }, [girderCount, girderSpacing]);

  return (
    <div className="bridge-view__schematic">
      <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} role="img" aria-label="Bridge 2D schematic">
        <rect x="0" y="0" width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="transparent" />
        {/* Overall deck */}
        <rect
          x={leftEdge}
          y={VIEWBOX_HEIGHT / 2 - deckHeight / 2}
          width={overallWidthPx}
          height={deckHeight}
          rx="8"
          fill="#f1f4fb"
          stroke="#b7bfd6"
          strokeWidth="2"
        />

        {/* Carriageway */}
        <rect
          x={leftEdge + toPx(overhangWidth + leftFootpath)}
          y={VIEWBOX_HEIGHT / 2 - carriagewayHeight / 2}
          width={toPx(carriagewayWidth)}
          height={carriagewayHeight}
          rx="6"
          fill="#dbe2f5"
          stroke="#8ba1d8"
          strokeWidth="2"
        />

        {/* Footpaths */}
        {showLeftFootpath && (
          <rect
            x={leftEdge + toPx(overhangWidth)}
            y={VIEWBOX_HEIGHT / 2 - carriagewayHeight / 2 - 10}
            width={toPx(footpathWidth)}
            height={carriagewayHeight + 20}
            rx="4"
            fill="#f7f1d5"
            stroke="#d0b45b"
            strokeWidth="1.5"
          />
        )}
        {showRightFootpath && (
          <rect
            x={leftEdge + toPx(overhangWidth + leftFootpath + carriagewayWidth)}
            y={VIEWBOX_HEIGHT / 2 - carriagewayHeight / 2 - 10}
            width={toPx(footpathWidth)}
            height={carriagewayHeight + 20}
            rx="4"
            fill="#f7f1d5"
            stroke="#d0b45b"
            strokeWidth="1.5"
          />
        )}

        {/* Girders */}
        {girderPositions.map((position, index) => (
          <line
            key={`schematic-girder-${index}`}
            x1={VIEWBOX_WIDTH / 2 + toPx(position)}
            x2={VIEWBOX_WIDTH / 2 + toPx(position)}
            y1={VIEWBOX_HEIGHT / 2 + deckHeight / 2}
            y2={VIEWBOX_HEIGHT / 2 + deckHeight / 2 + 40}
            stroke="#4c5261"
            strokeWidth="3"
          />
        ))}

        {/* Labels */}
        <text x="50%" y={VIEWBOX_HEIGHT / 2 - deckHeight / 2 - 16} textAnchor="middle" className="bridge-view__schematic-label">
          {structureType}
        </text>
        <text x="50%" y={VIEWBOX_HEIGHT / 2 + deckHeight / 2 + 64} textAnchor="middle" className="bridge-view__schematic-label">
          {spanText} · {girderText}
        </text>
        <text x={leftEdge} y={VIEWBOX_HEIGHT / 2 - deckHeight / 2 - 8} className="bridge-view__schematic-note">
          Overhang {overhangWidth.toFixed(2)} m
        </text>
        <text x={leftEdge + toPx(overhangWidth + leftFootpath)} y={VIEWBOX_HEIGHT / 2 - carriagewayHeight / 2 - 20} className="bridge-view__schematic-note">
          Carriageway {carriagewayWidth.toFixed(2)} m
        </text>
        {showLeftFootpath && (
          <text x={leftEdge + toPx(overhangWidth)} y={VIEWBOX_HEIGHT / 2 - carriagewayHeight / 2 - 26} className="bridge-view__schematic-note">
            Footpath {footpathWidth.toFixed(2)} m
          </text>
        )}
        {showRightFootpath && (
          <text x={leftEdge + toPx(overhangWidth + leftFootpath + carriagewayWidth)} y={VIEWBOX_HEIGHT / 2 - carriagewayHeight / 2 - 26} className="bridge-view__schematic-note">
            Footpath {footpathWidth.toFixed(2)} m
          </text>
        )}
      </svg>
    </div>
  );
};

export { BridgeSchematic };
