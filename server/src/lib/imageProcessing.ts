// Point 13: real image processing pipeline using sharp
// Strips EXIF, validates real file type, limits dimensions, compresses,
// and generates a real blurred variant — replaces the previous
// "exifStripped: true" placeholder that never actually touched the bytes.

export interface ProcessedImage {
  clean: Buffer       // main image: re-encoded, EXIF stripped, resized, compressed
  blurred: Buffer      // blurred variant for Soft Reveal
  width: number
  height: number
  format: string
}

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 85
const BLUR_SIGMA = 25
// Closed Beta audit (FASE 2.6) — explicit ceiling instead of relying on
// sharp/libvips' own implicit default (~268MP). Matches the manual
// >10000x10000 rejection below (100MP) so the limit is enforced in two
// independent places: the cheap header-only metadata() read (before any
// pixel data is touched) AND sharp's own decoder (defense in depth, in
// case a crafted file's declared metadata doesn't match its real payload).
const MAX_INPUT_PIXELS = 100_000_000
// Closed Beta audit (FASE 2.6) — a pathological-but-within-bounds image
// (e.g. adversarial pixel patterns that are slow for libvips to encode)
// had no processing time cap; a stuck sharp call could tie up a worker
// indefinitely. 15s is generous for anything the 100MP/10000px bounds
// above should ever let through in normal use.
const PROCESSING_TIMEOUT_MS = 15_000

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Tempo excedido a processar imagem (${label}).`)), ms))
  ])

export const processImage = async (buffer: Buffer): Promise<ProcessedImage> => {
  // Lazy import — keeps server bootable even if sharp isn't installed yet
  const sharp = (await import('sharp')).default

  const image = sharp(buffer, { failOn: 'none', limitInputPixels: MAX_INPUT_PIXELS })
  const metadata = await image.metadata()

  if (!metadata.width || !metadata.height) {
    throw new Error('Ficheiro de imagem inválido.')
  }
  // Sanity bound — reject absurdly large source images before processing
  if (metadata.width > 10000 || metadata.height > 10000) {
    throw new Error('Imagem com dimensões demasiado grandes.')
  }

  // .rotate() with no args applies EXIF orientation then the re-encode
  // below drops all metadata (EXIF/IPTC/XMP) since sharp doesn't carry
  // it forward unless .withMetadata() is explicitly called.
  const cleanPipeline = image
    .rotate()
    .resize({
      width: MAX_DIMENSION, height: MAX_DIMENSION,
      fit: 'inside', withoutEnlargement: true
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })

  const clean = await withTimeout(cleanPipeline.toBuffer(), PROCESSING_TIMEOUT_MS, 'clean')

  const blurred = await withTimeout(
    sharp(buffer, { failOn: 'none', limitInputPixels: MAX_INPUT_PIXELS })
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .blur(BLUR_SIGMA)
      .jpeg({ quality: 70, mozjpeg: true })
      .toBuffer(),
    PROCESSING_TIMEOUT_MS, 'blurred'
  )

  const finalMeta = await sharp(clean).metadata()

  return {
    clean, blurred,
    width: finalMeta.width || MAX_DIMENSION,
    height: finalMeta.height || MAX_DIMENSION,
    format: 'jpeg'
  }
}

// Real magic-byte validation, not just trusting file.mimetype from the client
export const detectRealImageType = async (buffer: Buffer): Promise<string | null> => {
  const sig = buffer.subarray(0, 12)
  if (sig[0] === 0xFF && sig[1] === 0xD8 && sig[2] === 0xFF) return 'image/jpeg'
  if (sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47) return 'image/png'
  if (sig.subarray(0,4).toString('ascii') === 'RIFF' && sig.subarray(8,12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}
