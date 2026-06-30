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

export const processImage = async (buffer: Buffer): Promise<ProcessedImage> => {
  // Lazy import — keeps server bootable even if sharp isn't installed yet
  const sharp = (await import('sharp')).default

  const image = sharp(buffer, { failOn: 'none' })
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

  const clean = await cleanPipeline.toBuffer()

  const blurred = await sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .blur(BLUR_SIGMA)
    .jpeg({ quality: 70, mozjpeg: true })
    .toBuffer()

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
