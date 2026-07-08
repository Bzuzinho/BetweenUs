import { createReadStream } from 'fs'

// S3-compatible storage client
// Works with Cloudflare R2, AWS S3, Backblaze B2
// Falls back to base64 data URLs if not configured (dev mode)

const isConfigured = !!(
  process.env.STORAGE_ENDPOINT &&
  process.env.STORAGE_ACCESS_KEY &&
  process.env.STORAGE_SECRET_KEY &&
  process.env.STORAGE_BUCKET
)

export interface UploadResult {
  url: string
  key: string
  blurredUrl?: string
}

export const uploadFile = async (
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<UploadResult> => {
  if (!isConfigured) {
    // Dev mode: return a placeholder URL
    console.warn('[STORAGE] Not configured — using placeholder URL')
    return {
      url: `https://placehold.co/400x500/2D1B4E/C9956B?text=Photo`,
      key: filename,
      blurredUrl: `https://placehold.co/400x500/1A1028/2D1B4E?text=Blurred`
    }
  }

  try {
    // Dynamic import to avoid crash if aws-sdk not installed
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')

    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY!,
        secretAccessKey: process.env.STORAGE_SECRET_KEY!
      }
    })

    const key = `photos/${Date.now()}-${filename}`

    await client.send(new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      ACL: 'public-read' as any
    }))

    const url = `${process.env.STORAGE_PUBLIC_URL}/${key}`
    return { url, key }
  } catch (err: any) {
    console.error('[STORAGE ERROR]', err.message)
    return {
      url: `https://placehold.co/400x500/2D1B4E/C9956B?text=Upload+Error`,
      key: filename
    }
  }
}

// 3.1 — Private upload path used for anything privacy-sensitive (profile
// photos, verification selfies). No public ACL is set; the object is only
// reachable through a signed URL minted by mediaAccessService.ts, gated by
// mediaAccessPolicy.ts. Returns the object KEY (not a URL) — callers should
// store the key directly and never construct a public URL from it.
export const uploadPrivateFile = async (
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<{ key: string }> => {
  if (!isConfigured) {
    console.warn('[STORAGE] Not configured — private upload returns a placeholder key')
    return { key: `dev-placeholder/${filename}` }
  }

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const client = new S3Client({
    region: 'auto',
    endpoint: process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!
    }
  })

  const key = `private/${Date.now()}-${filename}`

  await client.send(new PutObjectCommand({
    Bucket: process.env.STORAGE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype
    // no ACL — bucket/object stays private, access only via presigned GET
  }))

  return { key }
}

export const deleteFile = async (key: string): Promise<void> => {
  if (!isConfigured) return
  try {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      region: 'auto',
      endpoint: process.env.STORAGE_ENDPOINT,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY!,
        secretAccessKey: process.env.STORAGE_SECRET_KEY!
      }
    })
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.STORAGE_BUCKET,
      Key: key
    }))
  } catch (err: any) {
    console.error('[STORAGE DELETE ERROR]', err.message)
  }
}
