import { Html, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { useMemo } from 'react';

export interface BridgeCrossSectionProps {
  carriagewayWidth?: number;
  carriagewayThickness?: number;
  deckDepth?: number;
  footpathWidth?: number;
  footpathThickness?: number;
  overhangWidth?: number;
  girderCount?: number;
  girderSpacing?: number;
  girderWidth?: number;
  girderDepth?: number;
  girderHeight?: number;
  includeCrossBracing?: boolean;
  showAnnotations?: boolean;
  showLeftFootpath?: boolean;
  showRightFootpath?: boolean;
  span?: number;
  structureType?: string;
  backgroundColor?: string;
  transparentBackground?: boolean;
  validationSeverity?: 'ok' | 'warning' | 'error';
}

interface BraceConfig {
  position: [number, number, number];
  length: number;
  rotationZ: number;
}

const BridgeCrossSection = ({
  carriagewayWidth = 8,
  carriagewayThickness = 0.45,
  deckDepth = 2.4,
  footpathWidth = 1.2,
  footpathThickness = 0.35,
  overhangWidth = 0.9,
  girderCount = 4,
  girderSpacing = 2.5,
  girderWidth = 0.4,
  girderDepth = 0.25,
  girderHeight = 3.2,
  includeCrossBracing = true,
  showAnnotations = true,
  showLeftFootpath = true,
  showRightFootpath = true,
  span = 30,
  structureType = 'Highway',
  backgroundColor = '#f3f6ff',
  transparentBackground = false,
  validationSeverity = 'ok',
}: BridgeCrossSectionProps) => {
  const invalidReason = useMemo(() => {
    if (!Number.isFinite(carriagewayWidth) || carriagewayWidth <= 0) {
      return 'Carriageway width must be greater than 0 m.';
    }
    if (!Number.isFinite(girderCount) || girderCount < 1) {
      return 'At least one girder is required to render the 3D view.';
    }
    if (!Number.isFinite(girderSpacing) || girderSpacing <= 0) {
      return 'Girder spacing must be greater than 0 m.';
    }
    return null;
  }, [carriagewayWidth, girderCount, girderSpacing]);

  if (invalidReason) {
    return (
      <div className="bridge-view__fallback" role="status">
        <p>{invalidReason}</p>
        <p>Please adjust the geometry inputs to continue.</p>
      </div>
    );
  }

  const deckElevation = girderHeight + carriagewayThickness / 2;
  const pathContributionLeft = showLeftFootpath ? footpathWidth : 0;
  const pathContributionRight = showRightFootpath ? footpathWidth : 0;
  const overallWidth = carriagewayWidth + pathContributionLeft + pathContributionRight + 2 * overhangWidth;

  const girderPositions = useMemo(() => {
    if (girderCount <= 0) {
      return [] as number[];
    }
    const offset = ((girderCount - 1) * girderSpacing) / 2;
    return Array.from({ length: girderCount }, (_value, index) => index * girderSpacing - offset);
  }, [girderCount, girderSpacing]);

  const braceSegments = useMemo(() => {
    if (!includeCrossBracing || girderPositions.length < 2) {
      return [] as BraceConfig[];
    }
    const segments: BraceConfig[] = [];
    for (let index = 0; index < girderPositions.length - 1; index += 1) {
      const x1 = girderPositions[index];
      const x2 = girderPositions[index + 1];
      const horizontal = x2 - x1;
      const vertical = girderHeight;
      const diagonal = Math.hypot(horizontal, vertical);
      const centerX = (x1 + x2) / 2;
      const centerY = girderHeight / 2;
      const angle = Math.atan2(vertical, horizontal);
      segments.push({ position: [centerX, centerY, 0], length: diagonal, rotationZ: angle });
      segments.push({ position: [centerX, centerY, 0], length: diagonal, rotationZ: -angle });
    }
    return segments;
  }, [girderPositions, girderHeight, includeCrossBracing]);

  const footpaths = useMemo(() => {
    const items: Array<{ center: number; visible: boolean; side: 'left' | 'right' }> = [];
    items.push({ center: -((carriagewayWidth / 2) + footpathWidth / 2), visible: showLeftFootpath, side: 'left' });
    items.push({ center: (carriagewayWidth / 2) + footpathWidth / 2, visible: showRightFootpath, side: 'right' });
    return items;
  }, [carriagewayWidth, footpathWidth, showLeftFootpath, showRightFootpath]);

  const overhangs = useMemo(() => {
    const leftOffset = carriagewayWidth / 2 + pathContributionLeft;
    const rightOffset = carriagewayWidth / 2 + pathContributionRight;
    return [
      { center: -(leftOffset + overhangWidth / 2), side: 'left' },
      { center: rightOffset + overhangWidth / 2, side: 'right' },
    ];
  }, [carriagewayWidth, overhangWidth, pathContributionLeft, pathContributionRight]);

  const annotations = useMemo(
    () => [
      `Structure: ${structureType}`,
      `Span: ${span.toFixed(2)} m`,
      `Carriageway: ${carriagewayWidth.toFixed(2)} m`,
      `Footpath: ${footpathWidth.toFixed(2)} m per enabled side`,
      `Overhang: ${overhangWidth.toFixed(2)} m per side`,
      `Girders: ${girderCount} @ ${girderSpacing.toFixed(2)} m`,
    ],
    [structureType, span, carriagewayWidth, footpathWidth, overhangWidth, girderCount, girderSpacing],
  );

  return (
    <div className="bridge-view__canvas">
      <Canvas
        camera={{ position: [0, girderHeight * 0.75, 12], fov: 50 }}
        gl={{ alpha: transparentBackground }}
        style={{ background: transparentBackground ? 'transparent' : backgroundColor }}
      >
        {!transparentBackground && <color attach="background" args={[backgroundColor]} />}
        {/* Basic lighting */}
        <hemisphereLight intensity={0.65} groundColor={"#dfe2ec"} />
        <directionalLight position={[10, 12, 15]} intensity={0.9} castShadow />
        <ambientLight intensity={0.35} />

        {/* Deck slab */}
        <mesh position={[0, deckElevation, 0]}>
          <boxGeometry args={[carriagewayWidth, carriagewayThickness, deckDepth]} />
          <meshStandardMaterial color={validationSeverity === 'error' ? '#d53b2a' : validationSeverity === 'warning' ? '#f4a259' : '#8b8f98'} />
        </mesh>

        {/* Footpaths */}
        {footpaths.map((footpath) =>
          footpath.visible ? (
            <mesh key={`footpath-${footpath.side}`} position={[footpath.center, deckElevation + (footpathThickness - carriagewayThickness) / 2, 0]}>
              <boxGeometry args={[footpathWidth, footpathThickness, deckDepth * 0.9]} />
              <meshStandardMaterial color="#cfd2d6" />
            </mesh>
          ) : null,
        )}

        {/* Overhangs */}
        {overhangs.map((segment) => (
          <mesh key={`overhang-${segment.side}`} position={[segment.center, deckElevation - carriagewayThickness / 4, 0]}>
            <boxGeometry args={[overhangWidth, carriagewayThickness * 0.8, deckDepth * 0.85]} />
            <meshStandardMaterial color="#5c5f66" />
          </mesh>
        ))}

        {/* Girders */}
        {girderPositions.map((xPosition) => (
          <mesh key={`girder-${xPosition}`} position={[xPosition, girderHeight / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[girderWidth, girderHeight, girderDepth]} />
            <meshStandardMaterial color={validationSeverity === 'error' ? '#ff4b3a' : validationSeverity === 'warning' ? '#ffa726' : '#111214'} />
          </mesh>
        ))}

        {/* Cross bracing */}
        {braceSegments.map((brace, index) => (
          <mesh key={`brace-${index}`} position={brace.position} rotation={[0, 0, brace.rotationZ]}>
            <boxGeometry args={[brace.length, girderWidth * 0.35, girderDepth * 0.4]} />
            <meshStandardMaterial color={validationSeverity === 'error' ? '#ff6b5c' : validationSeverity === 'warning' ? '#ffc876' : '#4f5259'} />
          </mesh>
        ))}

        {/* Ground reference */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -girderDepth]} receiveShadow>
          <planeGeometry args={[overallWidth * 1.8, deckDepth * 2.2]} />
          <meshStandardMaterial color="#e0e5f2" side={DoubleSide} />
        </mesh>

        {showAnnotations && (
          <Html fullscreen style={{ pointerEvents: 'none' }}>
            <div className="bridge-annotation bridge-annotation--screen" role="status">
              {annotations.map((label) => (
                <p key={label}>{label}</p>
              ))}
            </div>
          </Html>
        )}

        <OrbitControls enableZoom enablePan makeDefault />
      </Canvas>
    </div>
  );
};

export { BridgeCrossSection };
