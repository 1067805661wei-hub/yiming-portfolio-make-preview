import { useEffect, useMemo } from 'react'
import { FONTS, loadRuns, useFontEpoch, type TextRun } from './fonts'
import { buildCover } from './scene'
import { TEMPLATE_BY_ID } from './templates'
import { SUBTITLE_WEIGHT } from './text'
import type { CoverInput, CoverResult } from './types'
import { DEFAULT_CROP, photoKey } from './photo'

export function inputKey(i: CoverInput) {
  const crop = i.crop ?? DEFAULT_CROP
  const photo = i.templateId === 'window'
    ? [photoKey(i.photo), crop.x, crop.y, crop.zoom].join(':')
    : ''
  return [i.templateId, i.paletteId, i.title, i.subtitle, i.font, i.weight, i.size, i.align, i.x, i.y, photo].join('\u241f')
}

/** Every face and glyph subset a cover draws with. */
export function runsFor(input: CoverInput): TextRun[] {
  const t = TEMPLATE_BY_ID[input.templateId]
  return [
    { face: FONTS[input.font].face, weight: input.weight, text: input.title },
    { face: FONTS.mono.face, weight: SUBTITLE_WEIGHT, text: input.subtitle },
    { face: FONTS.mono.face, weight: 500, text: `${t.no} / ${t.name} SLEEVE / VOL. PERSONAL SELECTION` },
    { face: FONTS.grotesk.face, weight: 700, text: t.no },
  ]
}

/** Builds the scene and rebuilds it whenever new font data changes measurements. */
export function useCover(input: CoverInput): CoverResult {
  const epoch = useFontEpoch()
  const key = inputKey(input)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- key captures input by value
  return useMemo(() => buildCover(input), [key, epoch])
}

/** Requests the glyphs the given text needs (CJK subsets load on demand). */
export function useCoverGlyphs(input: CoverInput) {
  const key = inputKey(input)
  useEffect(() => {
    loadRuns(runsFor(input)).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}
