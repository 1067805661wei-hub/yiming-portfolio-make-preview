import { memo, useId } from 'react'
import { SIZE } from './geometry'
import type { Scene, TextNode } from './types'
import { photoPlacement } from './photo'

function SceneText({ node, fill }: { node: TextNode; fill?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const text = (line?: number) => (
    <text
      fontFamily={node.family}
      fontWeight={node.weight}
      fontSize={node.size}
      textAnchor={node.anchor}
      className="cover-ink"
      style={{ fill: fill ?? node.fill }}
    >
      {node.lines.map((row, i) => (line === undefined || line === i) && (
        <tspan key={i} x={row.x} y={row.y}>
          {row.text}
        </tspan>
      ))}
    </text>
  )
  if (!node.fragments) return text()
  return (
    <g>
      <defs>
        {node.fragments.map((part, i) => (
          <clipPath key={i} id={`${uid}-slice-${i}`}>
            <rect x={part.clip.x} y={part.clip.y} width={part.clip.w} height={part.clip.h} />
          </clipPath>
        ))}
      </defs>
      {node.fragments.map((part, i) => (
        <g key={i} clipPath={`url(#${uid}-slice-${i})`}>
          <g transform={`translate(${part.dx} 0)`}>{text(part.line)}</g>
        </g>
      ))}
    </g>
  )
}

interface CoverArtProps {
  scene: Scene
  /** Accessible description; omit when the surrounding control already describes the cover. */
  label?: string
  className?: string
}

/** SVG view of a scene. Paint order and geometry match the PNG export exactly. */
export const CoverArt = memo(function CoverArt({ scene, label, className }: CoverArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const { title, knockouts } = scene
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ fontSynthesis: 'none', fontKerning: 'normal', textRendering: 'geometricPrecision' }}
    >
      <rect width={SIZE} height={SIZE} className="cover-ink" style={{ fill: scene.background }} />
      {scene.shapes.map((shape, i) => (
        <path key={i} d={shape.d} fillRule={shape.rule} className="cover-ink" style={{ fill: shape.fill }} />
      ))}
      {scene.images.map((node, i) => {
        const clip = uid + '-photo-' + i
        const { display } = photoPlacement(node.asset, node.crop, node.box)
        return (
          <g key={i}>
            <defs>
              <clipPath id={clip}>
                <rect x={node.box.x} y={node.box.y} width={node.box.w} height={node.box.h} />
              </clipPath>
            </defs>
            <image
              href={node.asset.src}
              x={display.x}
              y={display.y}
              width={display.w}
              height={display.h}
              preserveAspectRatio="none"
              clipPath={'url(#' + clip + ')'}
            />
          </g>
        )
      })}
      {scene.texts.map((node) => (
        <SceneText key={node.id} node={node} />
      ))}
      {title && <SceneText node={title} />}
      {title && knockouts.length > 0 && (
        <>
          <defs>
            {knockouts.map((k, i) => (
              <clipPath key={i} id={`${uid}-k${i}`}>
                {k.mask.kind === 'path' ? (
                  <path d={k.mask.d} clipRule={k.mask.rule} />
                ) : (
                  <SceneText node={k.mask.node} />
                )}
              </clipPath>
            ))}
          </defs>
          {knockouts.map((k, i) => (
            <g key={i} clipPath={`url(#${uid}-k${i})`}>
              <SceneText node={title} fill={k.fill} />
            </g>
          ))}
        </>
      )}
    </svg>
  )
})
